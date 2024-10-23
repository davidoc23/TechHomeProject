import fs from 'node:fs'

import type {
  Llama,
  LlamaModel,
  ChatHistoryItem,
  LlamaChatSession,
  LlamaContext
} from 'node-llama-cpp'

import {
  HAS_LLM,
  HAS_LLM_ACTION_RECOGNITION,
  HAS_LLM_NLG,
  LLM_MINIMUM_FREE_VRAM,
  LLM_MINIMUM_TOTAL_VRAM,
  LLM_NAME_WITH_VERSION,
  LLM_PATH,
  LLM_PROVIDER,
  LLM_ACTIONS_CLASSIFIER_PATH,
  IS_PRODUCTION_ENV,
  HAS_WARM_UP_LLM_DUTIES
} from '@/constants'
import { LogHelper } from '@/helpers/log-helper'
import { SystemHelper } from '@/helpers/system-helper'
import { ConversationLogger } from '@/conversation-logger'
import { LLMDuties, LLMProviders } from '@/core/llm-manager/types'
import warmUpLlmDuties from '@/core/llm-manager/warm-up-llm-duties'

type LLMManagerLlama = Llama | null
type LLMManagerModel = LlamaModel | null
type LLMManagerContext = LlamaContext | null
type ActionsClassifierContent = string | null

// Set to 0 to use the maximum threads supported by the current machine hardware
export const LLM_THREADS = 6

// const TRAINED_CONTEXT_SIZE = 8_192
const MINIMUM_CORE_LLM_DUTIES_CONTEXT_SIZE = 2_048
// Give some VRAM space because the TCP server uses some VRAM too
// const TCP_SERVER_DELTA = 2_048
const MAXIMUM_CORE_LLM_DUTIES_CONTEXT_SIZE = 2_048
/**
 * Core LLM duties are the ones that rely on the same context.
 * Every core LLM duty counts as one sequence.
 * This allows to dynamically allocate the context size.
 * The conversation duty is not included because it needs a dedicated context to load history
 */
const CORE_LLM_DUTIES: LLMDuties[] = [
  LLMDuties.CustomNER,
  LLMDuties.ActionRecognition,
  LLMDuties.Paraphrase
]

/**
 * node-llama-cpp beta 3 docs:
 * @see https://github.com/withcatai/node-llama-cpp/pull/105
 */
export default class LLMManager {
  private static instance: LLMManager
  private _isLLMEnabled = false
  private _isLLMNLGEnabled = false
  private _isLLMActionRecognitionEnabled = false
  private _shouldWarmUpLLMDuties = false
  private _areLLMDutiesWarmedUp = false
  private _llama: LLMManagerLlama = null
  private _model: LLMManagerModel = null
  private _context: LLMManagerContext = null
  private _llmActionsClassifierContent: ActionsClassifierContent = null
  private _coreLLMDuties = CORE_LLM_DUTIES

  get llama(): Llama {
    return this._llama as Llama
  }

  get model(): LlamaModel {
    return this._model as LlamaModel
  }

  get context(): LlamaContext {
    return this._context as LlamaContext
  }

  get llmActionsClassifierContent(): ActionsClassifierContent {
    return this._llmActionsClassifierContent
  }

  get isLLMEnabled(): boolean {
    return this._isLLMEnabled
  }

  get isLLMNLGEnabled(): boolean {
    return this._isLLMNLGEnabled
  }

  get isLLMActionRecognitionEnabled(): boolean {
    return this._isLLMActionRecognitionEnabled
  }

  get shouldWarmUpLLMDuties(): boolean {
    return this._shouldWarmUpLLMDuties
  }

  get areLLMDutiesWarmedUp(): boolean {
    return this._areLLMDutiesWarmedUp
  }

  constructor() {
    if (!LLMManager.instance) {
      LogHelper.title('LLM Manager')
      LogHelper.success('New instance')

      LLMManager.instance = this
    }
  }

  /**
   * Post checking after loading the LLM to
   */
  private async postCheck(): Promise<void> {
    if (this._isLLMActionRecognitionEnabled) {
      const isActionsClassifierPathFound = fs.existsSync(
        LLM_ACTIONS_CLASSIFIER_PATH
      )

      if (!isActionsClassifierPathFound) {
        throw new Error(
          `The LLM action classifier is not found at "${LLM_ACTIONS_CLASSIFIER_PATH}". Please run "npm run train" and retry.`
        )
      }
    }
  }

  /**
   * Load the LLM action classifier and other future
   * files that only need to be loaded once
   */
  private async singleLoad(): Promise<void> {
    if (this._isLLMActionRecognitionEnabled) {
      try {
        this._llmActionsClassifierContent = await fs.promises.readFile(
          LLM_ACTIONS_CLASSIFIER_PATH,
          'utf-8'
        )

        LogHelper.title('LLM Manager')
        LogHelper.success('LLM action classifier has been loaded')
      } catch (e) {
        throw new Error(`Failed to load the LLM action classifier: ${e}`)
      }
    }
  }

  public async loadLLM(): Promise<void> {
    /**
     * Get Llama even if LLM is not enabled because it provides good utilities
     * for graphics card information and other useful stuff
     */
    try {
      const { LlamaLogLevel, getLlama } = await Function(
        'return import("node-llama-cpp")'
      )()

      this._llama = await getLlama({
        // logLevel: LlamaLogLevel.disabled
        logLevel: LlamaLogLevel.debug
      })
    } catch (e) {
      LogHelper.title('LLM Manager')
      LogHelper.error(`LLM Manager failed to load. Cannot get model: ${e}`)
    }

    if (!HAS_LLM) {
      LogHelper.title('LLM Manager')
      LogHelper.warning(
        'LLM is not enabled because you have explicitly disabled it'
      )

      return
    }

    if (LLM_PROVIDER === LLMProviders.Local) {
      const [freeVRAMInGB, totalVRAMInGB] = await Promise.all([
        SystemHelper.getFreeVRAM(),
        SystemHelper.getTotalVRAM()
      ])
      const isLLMPathFound = fs.existsSync(LLM_PATH)
      const isCurrentFreeRAMEnough = LLM_MINIMUM_FREE_VRAM <= freeVRAMInGB
      const isTotalRAMEnough = LLM_MINIMUM_TOTAL_VRAM <= totalVRAMInGB

      /**
       * In case the LLM is not set up and
       * the current free RAM is enough to load the LLM
       */
      if (!isLLMPathFound && isCurrentFreeRAMEnough) {
        LogHelper.title('LLM Manager')
        LogHelper.warning(
          'The LLM is not set up yet whereas the current free RAM is enough to enable it. You can run the following command to set it up: "npm install"'
        )

        return
      }
      /**
       * In case the LLM is set up and
       * the current free RAM is not enough to load the LLM
       */
      if (isLLMPathFound && !isCurrentFreeRAMEnough) {
        LogHelper.title('LLM Manager')
        LogHelper.warning(
          'There is not enough free RAM to load the LLM. So the LLM will not be enabled.'
        )

        return
      }

      /**
       * In case the LLM is not found and
       * the total RAM is enough to load the LLM
       */
      if (!isLLMPathFound && isTotalRAMEnough) {
        LogHelper.title('LLM Manager')
        LogHelper.warning(
          `LLM is not enabled because it is not found at "${LLM_PATH}". Run the following command to set it up: "npm install"`
        )

        return
      }

      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        this._model = await this._llama.loadModel({
          modelPath: LLM_PATH
          // Option available from node-llama-cpp@3.0.0-beta.38 but cannot compile well yet
          // defaultContextFlashAttention: true
        })

        if (HAS_LLM_NLG) {
          this._isLLMNLGEnabled = true
        } else {
          // Remove the paraphrase duty if the NLG is not enabled
          this._coreLLMDuties.splice(
            this._coreLLMDuties.indexOf(LLMDuties.Paraphrase),
            1
          )
        }

        if (HAS_LLM_ACTION_RECOGNITION) {
          this._isLLMActionRecognitionEnabled = true
        } else {
          // Remove the action recognition duty if the action recognition is not enabled
          this._coreLLMDuties.splice(
            this._coreLLMDuties.indexOf(LLMDuties.ActionRecognition),
            1
          )
        }

        this._context = await this._model.createContext({
          sequences: this._coreLLMDuties.length,
          threads: LLM_THREADS,
          contextSize: {
            min: MINIMUM_CORE_LLM_DUTIES_CONTEXT_SIZE,
            max: MAXIMUM_CORE_LLM_DUTIES_CONTEXT_SIZE
          }
        })
        this._isLLMEnabled = true

        LogHelper.title('LLM Manager')
        LogHelper.success(`${LLM_NAME_WITH_VERSION} LLM has been loaded`)
      } catch (e) {
        LogHelper.title('LLM Manager')
        LogHelper.error(`LLM Manager failed to load. Cannot load model: ${e}`)
      }
    } else {
      if (!Object.values(LLMProviders).includes(LLM_PROVIDER as LLMProviders)) {
        LogHelper.warning(
          `The LLM provider "${LLM_PROVIDER}" does not exist or is not yet supported`
        )

        return
      }

      this._isLLMEnabled = true

      if (HAS_LLM_NLG) {
        this._isLLMNLGEnabled = true
      }
      if (HAS_LLM_ACTION_RECOGNITION) {
        this._isLLMActionRecognitionEnabled = true
      }
    }

    this._shouldWarmUpLLMDuties =
      (IS_PRODUCTION_ENV || HAS_WARM_UP_LLM_DUTIES) &&
      this._isLLMEnabled &&
      LLM_PROVIDER === LLMProviders.Local

    try {
      // Post checking after loading the LLM
      await this.postCheck()
    } catch (e) {
      LogHelper.title('LLM Manager')
      LogHelper.error(`LLM Manager failed to post check: ${e}`)

      process.exit(1)
    }

    try {
      // Load files that only need to be loaded once
      await this.singleLoad()
    } catch (e) {
      LogHelper.title('LLM Manager')
      LogHelper.error(`LLM Manager failed to single load: ${e}`)

      process.exit(1)
    }

    if (this._shouldWarmUpLLMDuties) {
      this.warmUpLLMDuties()
    }
  }

  public async warmUpLLMDuties(): Promise<void> {
    if (this._shouldWarmUpLLMDuties) {
      try {
        LogHelper.title('LLM Manager')
        LogHelper.info('Warming up LLM duties...')

        await warmUpLlmDuties(this._coreLLMDuties)

        this._areLLMDutiesWarmedUp = true
      } catch (e) {
        LogHelper.title('LLM Manager')
        LogHelper.error(`LLM Manager failed to warm up LLM duties: ${e}`)

        this._areLLMDutiesWarmedUp = false
      }
    }
  }

  public async loadHistory(
    conversationLogger: ConversationLogger,
    session: LlamaChatSession,
    options?: { nbOfLogsToLoad?: number }
  ): Promise<ChatHistoryItem[]> {
    const [systemMessage] = session.getChatHistory()
    let conversationLogs

    if (options) {
      conversationLogs = await conversationLogger.load(options)
    } else {
      conversationLogs = await conversationLogger.load()
    }

    if (!conversationLogs) {
      return [systemMessage] as ChatHistoryItem[]
    }

    const history =
      conversationLogs?.map((messageRecord) => {
        if (!messageRecord || !messageRecord.message) {
          messageRecord.message = ''
        }

        if (messageRecord.who === 'owner') {
          return {
            type: 'user',
            text: messageRecord.message
          }
        }

        return {
          type: 'model',
          response: [messageRecord.message]
        }
      }) ?? []

    return [systemMessage, ...history] as ChatHistoryItem[]
  }
}
