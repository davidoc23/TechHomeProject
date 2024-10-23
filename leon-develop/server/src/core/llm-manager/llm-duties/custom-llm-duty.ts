import type { LlamaChatSession, LlamaContext } from 'node-llama-cpp'

import {
  type LLMDutyParams,
  type LLMDutyResult,
  LLMDuty
} from '@/core/llm-manager/llm-duty'
import { LogHelper } from '@/helpers/log-helper'
import { LLM_MANAGER, LLM_PROVIDER } from '@/core'
import { LLM_THREADS } from '@/core/llm-manager/llm-manager'
import { LLMProviders, LLMDuties } from '@/core/llm-manager/types'
import { LLM_PROVIDER as LLM_PROVIDER_NAME } from '@/constants'

interface CustomLLMDutyParams extends LLMDutyParams {
  data: {
    systemPrompt?: string | null
  }
}

export class CustomLLMDuty extends LLMDuty {
  private static instance: CustomLLMDuty
  private static context: LlamaContext = null as unknown as LlamaContext
  private static session: LlamaChatSession = null as unknown as LlamaChatSession
  protected systemPrompt = ''
  protected readonly name = 'Custom LLM Duty'
  protected input: LLMDutyParams['input'] = null
  protected data = {
    systemPrompt: null
  } as CustomLLMDutyParams['data']

  constructor(params: CustomLLMDutyParams) {
    super()

    if (!CustomLLMDuty.instance) {
      LogHelper.title(this.name)
      LogHelper.success('New instance')

      CustomLLMDuty.instance = this
    }

    this.input = params.input
    this.data = params.data
  }

  public async init(): Promise<void> {
    if (LLM_PROVIDER_NAME === LLMProviders.Local) {
      try {
        /**
         * Create a new context and session if it doesn't exist or if the system prompt has changed
         */
        if (
          !CustomLLMDuty.context ||
          !CustomLLMDuty.session ||
          this.data.systemPrompt !== this.systemPrompt
        ) {
          LogHelper.title(this.name)
          LogHelper.info('Initializing...')

          if (CustomLLMDuty.context) {
            await CustomLLMDuty.context.dispose()
          }
          if (CustomLLMDuty.session) {
            CustomLLMDuty.session.dispose({ disposeSequence: true })
          }

          this.systemPrompt = this.data.systemPrompt || ''

          CustomLLMDuty.context = await LLM_MANAGER.model.createContext({
            threads: LLM_THREADS
          })

          const { LlamaChatSession } = await Function(
            'return import("node-llama-cpp")'
          )()

          CustomLLMDuty.session = new LlamaChatSession({
            contextSequence: CustomLLMDuty.context.getSequence(),
            autoDisposeSequence: true,
            systemPrompt: this.systemPrompt
          }) as LlamaChatSession

          LogHelper.success('Initialized')
        }
      } catch (e) {
        LogHelper.title(this.name)
        LogHelper.error(`Failed to initialize: ${e}`)
      }
    }
  }

  public async execute(): Promise<LLMDutyResult | null> {
    LogHelper.title(this.name)
    LogHelper.info('Executing...')

    try {
      const prompt = this.input as string
      const completionParams = {
        dutyType: LLMDuties.Custom,
        systemPrompt: this.systemPrompt
      }
      let completionResult

      if (LLM_PROVIDER_NAME === LLMProviders.Local) {
        completionResult = await LLM_PROVIDER.prompt(prompt, {
          ...completionParams,
          session: CustomLLMDuty.session,
          maxTokens: CustomLLMDuty.context.contextSize
        })
      } else {
        completionResult = await LLM_PROVIDER.prompt(prompt, completionParams)
      }

      LogHelper.title(this.name)
      LogHelper.success('Duty executed')
      LogHelper.success(`System prompt — ${this.systemPrompt}`)
      LogHelper.success(`Prompt — ${prompt}`)
      LogHelper.success(`Output — ${completionResult?.output}
usedInputTokens: ${completionResult?.usedInputTokens}
usedOutputTokens: ${completionResult?.usedOutputTokens}`)

      return completionResult as unknown as LLMDutyResult
    } catch (e) {
      LogHelper.title(this.name)
      LogHelper.error(`Failed to execute: ${e}`)
    }

    return null
  }
}
