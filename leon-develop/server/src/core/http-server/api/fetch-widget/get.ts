import type { FastifyPluginAsync } from 'fastify'

import type { APIOptions } from '@/core/http-server/http-server'
import { BRAIN } from '@/core'
import { LogHelper } from '@/helpers/log-helper'
import { DEFAULT_NLU_RESULT } from '@/core/nlp/nlu/nlu'
import { SkillDomainHelper } from '@/helpers/skill-domain-helper'

export const fetchWidget: FastifyPluginAsync<APIOptions> = async (
  fastify,
  options
) => {
  fastify.route({
    method: 'GET',
    url: `/api/${options.apiVersion}/fetch-widget`,
    handler: async (_request, reply) => {
      let message

      try {
        const queryParams = _request.query as Record<string, string>
        const { skill_action: skillAction, widget_id: widgetId } = queryParams

        if (!skillAction || !widgetId) {
          reply.statusCode = 400
          message = 'skill_action and widget_id are missing.'
          LogHelper.title('GET /fetch-widget')
          LogHelper.warning(message)
          return reply.send({
            success: false,
            status: reply.statusCode,
            code: 'missing_params',
            message,
            widget: null
          })
        }

        const [domain, skill, action] = skillAction.split(':')

        if (!domain || !skill || !action) {
          message = 'skill_action is not well formatted.'
          LogHelper.title('GET /fetch-widget')
          LogHelper.warning(message)
          return reply.send({
            success: false,
            status: reply.statusCode,
            code: 'skill_action_not_valid',
            message,
            widget: null
          })
        }

        // Do not return any speech and new widget
        BRAIN.isMuted = true
        await BRAIN.execute({
          ...DEFAULT_NLU_RESULT,
          currentEntities: [
            {
              start: 0,
              end: widgetId.length - 1,
              len: widgetId.length,
              levenshtein: 0,
              accuracy: 1,
              entity: 'widgetid',
              type: 'enum',
              option: widgetId,
              sourceText: widgetId,
              utteranceText: widgetId,
              resolution: {
                value: widgetId
              }
            }
          ],
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

        if (parsedOutput.output.widget) {
          message = 'Widget fetched successfully.'
          LogHelper.title('GET /fetch-widget')
          LogHelper.success(message)
          return reply.send({
            success: true,
            status: 200,
            code: 'widget_fetched',
            message,
            widget: parsedOutput.output.widget
          })
        }

        message = 'Widget not fetched.'
        LogHelper.title('GET /fetch-widget')
        LogHelper.success(message)
        return reply.send({
          success: true,
          status: 200,
          code: 'widget_not_fetched',
          message,
          widget: null
        })
      } catch (e) {
        LogHelper.title('HTTP Server')
        LogHelper.error(`Failed to fetch widget component tree: ${e}`)

        reply.statusCode = 500
        return reply.send({
          success: false,
          status: reply.statusCode,
          code: 'fetch_widget_error',
          message: 'Failed to fetch widget component tree.',
          widget: null
        })
      }
    }
  })
}
