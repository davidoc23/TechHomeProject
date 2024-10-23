import { LogHelper } from '@/helpers/log-helper'
import { CompletionParams } from '@/core/llm-manager/types'
import { LLM_MANAGER } from '@/core'

type LocalCompletionParams = Omit<CompletionParams, ''>

export default class LocalLLMProvider {
  protected readonly name = 'Local LLM Provider'

  constructor() {
    LogHelper.title(this.name)
    LogHelper.success('New instance')
  }

  public runChatCompletion(
    prompt: string,
    completionParams: LocalCompletionParams
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!completionParams.session) {
          return reject(new Error('Session is not defined'))
        }

        const isJSONMode = completionParams.data !== null
        let promptParams = {
          maxTokens: completionParams.maxTokens as number,
          temperature: completionParams.temperature as number,
          onToken: completionParams.onToken as (tokens: unknown) => void
        }

        if (isJSONMode) {
          const { LlamaJsonSchemaGrammar } = await Function(
            'return import("node-llama-cpp")'
          )()
          const grammar = new LlamaJsonSchemaGrammar(LLM_MANAGER.llama, {
            type: 'object',
            properties: completionParams.data
          })

          promptParams = {
            ...promptParams,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            grammar
          }
        }

        const promise = completionParams.session.prompt(prompt, promptParams)

        return resolve(promise)
      } catch (e) {
        LogHelper.title(this.name)
        const errorMessage = `Failed to run completion: ${e}`
        LogHelper.error(errorMessage)
        return reject(new Error(errorMessage))
      }
    })
  }
}
