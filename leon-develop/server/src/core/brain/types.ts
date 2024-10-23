import type {
  NEREntity,
  NLPAction,
  NLPDomain,
  NLPSkill,
  NLPUtterance,
  NLUResolver,
  NLUResult,
  NLUSlot,
  NLUSlots
} from '@/core/nlp/types'
import type {
  SkillConfigSchema,
  SkillAnswerConfigSchema
} from '@/schemas/skill-schemas'
import type { ShortLanguageCode } from '@/types'
import type { WidgetWrapper } from '@sdk/aurora'
import type { SUPPORTED_WIDGET_EVENTS } from '@sdk/widget-component'

interface SkillCoreData {
  restart?: boolean
  isInActionLoop?: boolean
  showNextActionSuggestions?: boolean
  showSuggestions?: boolean
}

export interface SkillResult {
  domain: NLPDomain
  skill: NLPSkill
  action: NLPAction
  lang: ShortLanguageCode
  utterance: NLPUtterance
  entities: NEREntity[]
  slots: NLUSlots
  output: {
    codes: string[]
    answer: string
    core: SkillCoreData | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: Record<string, any>
    widget?: {
      componentTree: WidgetWrapper
      supportedEvents: typeof SUPPORTED_WIDGET_EVENTS
    }
  }
}

export enum SkillBridges {
  Python = 'python',
  NodeJS = 'nodejs'
}
export enum SkillActionTypes {
  Logic = 'logic',
  Dialog = 'dialog'
}

export interface ActionParams {
  lang: ShortLanguageCode
  utterance: NLPUtterance
  new_utterance: NLPUtterance
  current_entities: NEREntity[]
  entities: NEREntity[]
  current_resolvers: NLUResolver[]
  resolvers: NLUResolver[]
  slots: { [key: string]: NLUSlot['value'] | undefined }
  extra_context_data: {
    lang: ShortLanguageCode
    sentiment: NLUResult['sentiment']
    date: string
    time: string
    timestamp: number
    date_time: string
    week_day: string
  }
}

export interface IntentObject extends ActionParams {
  id: string
  domain: NLPDomain
  skill: NLPSkill
  action: NLPAction
}

export interface SkillAnswerCoreData {
  restart?: boolean
  isInActionLoop?: boolean
  showNextActionSuggestions?: boolean
  showSuggestions?: boolean
}
export interface SkillAnswerOutput extends IntentObject {
  output: {
    codes: string
    answer: SkillAnswerConfigSchema
    core?: SkillAnswerCoreData
    widget?: {
      actionName: string
      widget: string
      id: string
      componentTree: WidgetWrapper
      supportedEvents: typeof SUPPORTED_WIDGET_EVENTS
      onFetch: {
        widgetId?: string
        actionName: string
      } | null
    }
  }
}

export interface BrainProcessResult extends NLUResult {
  speeches: string[]
  executionTime: number
  utteranceID?: string
  lang?: ShortLanguageCode
  core?: SkillCoreData | undefined
  action?: SkillConfigSchema['actions'][string]
  nextAction?: SkillConfigSchema['actions'][string] | null | undefined
}
