import type { LlamaChatSession, Token } from 'node-llama-cpp'

import type { MessageLog } from '@/types'

export enum LLMDuties {
  ActionRecognition = 'action-recognition',
  CustomNER = 'custom-ner',
  Paraphrase = 'paraphrase',
  Conversation = 'conversation',
  Custom = 'custom'
  // TODO
  /*SentimentAnalysis = 'sentiment-analysis',
  QuestionAnswering = 'question-answering',
  IntentFallback = 'intent-fallback',
  RAG = 'rag',
  NLUParaphraser = 'nlu-paraphraser'*/
}

export enum LLMProviders {
  Local = 'local',
  Groq = 'groq'
}

export interface CompletionParams {
  dutyType: LLMDuties
  systemPrompt: string
  maxTokens?: number
  grammar?: string
  temperature?: number
  timeout?: number
  maxRetries?: number
  session?: LlamaChatSession | null
  data?: Record<string, unknown> | null
  history?: MessageLog[]
  onToken?: (tokens: Token[]) => void
}
