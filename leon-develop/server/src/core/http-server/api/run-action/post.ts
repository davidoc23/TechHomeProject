import type { FastifyPluginAsync } from 'fastify'

import type { APIOptions } from '@/core/http-server/http-server'
import { BRAIN } from '@/core'
import { LogHelper } from '@/helpers/log-helper'
import { DEFAULT_NLU_RESULT } from '@/core/nlp/nlu/nlu'
import { SkillDomainHelper } from '@/helpers/skill-domain-helper'

export const runAction: FastifyPluginAsync<APIOptions> = async (
  fastify,
  options
) => {
  fastify.route({
    method: 'POST',
    url: `/api/${options.apiVersion}/run-action`,
    handler: async (_request, reply) => {
      let message

      try {
        const bodyData = _request.body as Record<string, unknown>
        const { skill_action: actionName, action_params: actionParams } =
          bodyData

        if (!actionName || !actionParams) {
          reply.statusCode = 400
          message = 'skill_action and action_params are missing.'
          LogHelper.title('POST /run-action')
          LogHelper.warning(message)
          return reply.send({
            success: false,
            status: reply.statusCode,
            code: 'missing_params',
            message,
            result: null
          })
        }

        const [domain, skill, action] = (actionName as string).split(':')

        if (!domain || !skill || !action) {
          message = 'skill_action is not well formatted.'
          LogHelper.title('POST /run-action')
          LogHelper.warning(message)
          return reply.send({
            success: false,
            status: reply.statusCode,
            code: 'skill_action_not_valid',
            message,
            result: null
          })
        }

        await BRAIN.execute({
          ...DEFAULT_NLU_RESULT,
          ...actionParams,
          skillConfigPath: SkillDomainHelper.getSkillConfigPath(
            domain,
            skill,
            BRAIN.lang
          ),
          classification: {
            domain,
            skill,
            action,
            confidence: 1
          }
        })

        const parsedOutput = JSON.parse(BRAIN.skillOutput)

        if (parsedOutput.output) {
          message = 'Skill action executed successfully.'
          LogHelper.title('POST /run-action')
          LogHelper.success(message)
          return reply.send({
            success: true,
            status: 200,
            code: 'action_executed',
            message,
            result: parsedOutput.output
          })
        }

        message = 'Skill action not executed.'
        LogHelper.title('POST /run-action')
        LogHelper.success(message)
        return reply.send({
          success: true,
          status: 200,
          code: 'action_not_executed',
          message,
          result: null
        })
      } catch (e) {
        LogHelper.title('HTTP Server')
        LogHelper.error(`Failed to execute skill action: ${e}`)

        reply.statusCode = 500
        return reply.send({
          success: false,
          status: reply.statusCode,
          code: 'run_action_error',
          message: 'Failed to execute skill action.',
          result: null
        })
      }
    }
  })
}
