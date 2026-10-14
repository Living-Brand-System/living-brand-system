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

export interface AgentChatAiUsage {
	model?: string
	callCount?: number
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	cacheReadInputTokens?: number
	cacheWriteInputTokens?: number
	reasoningTokens?: number
	rawUsage?: Record<string, unknown>
}

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
