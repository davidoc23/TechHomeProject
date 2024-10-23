import fs from 'node:fs'
import path from 'node:path'

import type { SkillConfigSchema } from '@/schemas/skill-schemas'

import type { IntentObject } from '@sdk/types'

const {
  argv: [, , INTENT_OBJ_FILE_PATH]
} = process

export const LEON_VERSION = process.env['npm_package_version']

const BRIDGES_PATH = path.join(process.cwd(), 'bridges')
const NODEJS_BRIDGE_ROOT_PATH = path.join(BRIDGES_PATH, 'nodejs')
const NODEJS_BRIDGE_SRC_PATH = path.join(NODEJS_BRIDGE_ROOT_PATH, 'src')
const NODEJS_BRIDGE_VERSION_FILE_PATH = path.join(
  NODEJS_BRIDGE_SRC_PATH,
  'version.ts'
)

export const [, NODEJS_BRIDGE_VERSION] = fs
  .readFileSync(NODEJS_BRIDGE_VERSION_FILE_PATH, 'utf8')
  .split("'")

export const INTENT_OBJECT: IntentObject = JSON.parse(
  fs.readFileSync(INTENT_OBJ_FILE_PATH as string, 'utf8')
)

export const SKILLS_PATH = path.join(process.cwd(), 'skills')
export const SKILL_PATH = path.join(
  SKILLS_PATH,
  INTENT_OBJECT.domain,
  INTENT_OBJECT.skill
)
export const SKILL_CONFIG: SkillConfigSchema = JSON.parse(
  fs.readFileSync(
    path.join(
      SKILL_PATH,
      'config',
      INTENT_OBJECT.extra_context_data.lang + '.json'
    ),
    'utf8'
  )
)
