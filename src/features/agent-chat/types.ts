import type { AiUsageTotals } from '@/modules/ai-usage/ai-usage'

/** 답변 버블 피드백 — 컬렉션 select·라우트 검증·어드민 표가 이 목록 하나를 읽는다. */
export const AGENT_CHAT_REACTION_OPTIONS = [
	{ label: 'Good', value: 'good' },
	{ label: 'Bad', value: 'bad' },
] as const
export const AGENT_CHAT_REACTIONS = AGENT_CHAT_REACTION_OPTIONS.map((option) => option.value)
export type AgentChatReaction = (typeof AGENT_CHAT_REACTION_OPTIONS)[number]['value']

export interface AgentChatSessionUsage {
	name: string
	callCount?: number
}

/** 메시지 하나를 만든 모델·토큰의 합산 — 모양은 ai-usage의 합산 계약 하나다. */
export type AgentChatAiUsage = AiUsageTotals

export interface AgentChatSessionMessageInput {
	messageId: string
	role: 'system' | 'user' | 'assistant'
	text?: string
	usedSkills?: AgentChatSessionUsage[]
	usedTools?: AgentChatSessionUsage[]
	aiUsage?: AgentChatAiUsage
	reaction?: AgentChatReaction
	reactedAt?: string
}
