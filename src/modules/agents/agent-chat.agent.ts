import { anthropic } from '@ai-sdk/anthropic'
import { type InferAgentUIMessage, isStepCount, ToolLoopAgent } from 'ai'
import { z } from 'zod'
import { env } from '@/env'
import {
	CACHE_BREAKPOINT_PROVIDER_OPTIONS,
	withHistoryCacheBreakpoint,
} from '@/features/agent-chat/cache-breakpoint'
import { getAgentExecutionPolicy } from '@/features/agent-chat/domain/agent-skill-tool-policy'
import { prunePriorTurns } from '@/features/agent-chat/prune-prior-turns'
import { getAgentDefaultInstructions } from '@/features/agent-chat/services/get-agent-default-instructions.service'
import type { AgentChatReaction } from '@/features/agent-chat/types'
import { AgentConfigurationError } from '@/lib/errors'
import { getAgentTools } from '@/modules/agents/agent-chat-tools.agent'
import { findEnabledAgentSkillSummaries } from './repositories/agent-skill.payload.repository'

const DEFAULT_MODEL = 'claude-sonnet-5'
const DEFAULT_PROVIDER_OPTIONS = {
	anthropic: {
		effort: 'medium',
		thinking: { type: 'adaptive', display: 'summarized' },
	},
} as const

const agentChatCallOptionsSchema = z.object({
	agentChatSessionId: z.number().int().positive().optional(),
	pagePath: z.string().max(300).optional(),
	user: z.unknown(),
})

type AgentChatCallOptions = z.infer<typeof agentChatCallOptionsSchema>

/** provider 자격 증명은 agent가 소유한다 — route는 던져진 설정 오류를 HTTP 응답으로 매핑만 한다. */
export function assertAgentChatProviderConfigured() {
	if (!env.ANTHROPIC_API_KEY) {
		throw new AgentConfigurationError()
	}
}

/** 모든 tool은 동일한 요청 컨텍스트를 받는다 — tool 추가 시 여기 한 곳만 따라간다. */
function toolsContextFor(context: AgentChatCallOptions) {
	return Object.fromEntries(
		Object.keys(getAgentTools()).map((toolName) => [toolName, context]),
	) as Record<keyof ReturnType<typeof getAgentTools>, AgentChatCallOptions>
}

/**
 * Guideline 질의응답 agent 실행 단위 (모델·tool·skill 지시문 구성).
 * Payload skill/guideline I/O는 agent-chat repository가, provider 호출은 AI SDK가 소유한다.
 */
export const agentChatAgent = new ToolLoopAgent<
	AgentChatCallOptions,
	ReturnType<typeof getAgentTools>
>({
	model: anthropic(env.CHAT_MODEL || DEFAULT_MODEL),
	reasoning: 'medium',
	tools: getAgentTools(),
	// ponytail: AI SDK requires constructor toolsContext; prepareCall replaces it per request.
	toolsContext: toolsContextFor({ user: null }),
	callOptionsSchema: agentChatCallOptionsSchema,
	stopWhen: isStepCount(10),
	prepareStep: ({ stepNumber, steps, messages }) => {
		// 첫 스텝이 돌려준 messages가 이후 스텝의 기준이 되므로 한 번만 덜어내면 된다.
		const cachedMessages = withHistoryCacheBreakpoint(
			stepNumber === 0 ? prunePriorTurns(messages) : messages,
		)

		if (stepNumber === 0) {
			return {
				activeTools: ['loadSkill'],
				messages: cachedMessages,
				providerOptions: DEFAULT_PROVIDER_OPTIONS,
				toolChoice: { type: 'tool', toolName: 'loadSkill' },
			}
		}

		const loadedSkill = steps
			.flatMap((step) => step.toolResults)
			.filter((result) => result.dynamic !== true && result.toolName === 'loadSkill')
			.at(-1)

		if (!loadedSkill) {
			return {
				activeTools: [],
				messages: cachedMessages,
				providerOptions: DEFAULT_PROVIDER_OPTIONS,
			}
		}

		const execution = getAgentExecutionPolicy(loadedSkill.output)

		return {
			activeTools: execution.activeTools,
			messages: cachedMessages,
			model: anthropic(execution.modelId),
			providerOptions: DEFAULT_PROVIDER_OPTIONS,
		}
	},
	prepareCall: async ({ options = { user: null }, ...settings }) => {
		const [skills, defaultInstructions] = await Promise.all([
			findEnabledAgentSkillSummaries(options.user),
			getAgentDefaultInstructions(options.user),
		])

		if (skills.length === 0) {
			throw new AgentConfigurationError('Agent skill is not configured.')
		}

		const pageContext = options.pagePath
			? `Current guideline page: ${options.pagePath}`
			: undefined

		// pagePath는 페이지마다 달라 캐시를 깨뜨린다 — 캐시되는 고정 파트 뒤의 별도 system 파트로 뺀다.
		return {
			...settings,
			instructions: [
				{
					role: 'system' as const,
					content: [
						defaultInstructions,
						formatAgentSkillSelectionInstructions(skills),
					].join('\n\n'),
					providerOptions: CACHE_BREAKPOINT_PROVIDER_OPTIONS,
				},
				...(pageContext
					? [{ role: 'system' as const, content: `Published context:\n${pageContext}` }]
					: []),
			],
			toolsContext: toolsContextFor(options),
		}
	},
})

export interface AgentChatMessageMetadata {
	agentChatMessageId?: string
	agentChatSessionId?: number
	reaction?: AgentChatReaction
}

export type AgentChatMessage = InferAgentUIMessage<typeof agentChatAgent, AgentChatMessageMetadata>

function formatAgentSkillSelectionInstructions(
	skills: Awaited<ReturnType<typeof findEnabledAgentSkillSummaries>>,
) {
	const lines = skills.map((skill) => `- ${skill.name}: ${skill.description}`)

	return [
		'Before answering, call loadSkill once with the matching skill name.',
		'Choose by matching the user request to the skill description. Prefer template or asset skills for requests about what can be made, what should be made, creating assets, filling template slots, exporting images, or downloading results.',
		'Prefer guideline skills only for questions about published brand rules, guideline pages, sections, or usage standards.',
		'After loadSkill returns, follow its instructions field as the active skill instructions.',
		'Available skills:',
		...lines,
	].join('\n')
}
