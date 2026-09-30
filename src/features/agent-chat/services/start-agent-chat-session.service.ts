import {
	type AgentChatSessionUsageStep,
	createAgentChatSessionUsageCollector,
} from '@/features/agent-chat/domain/agent-chat-session-usage'
import {
	type AgentChatSessionStatus,
	type AgentChatSessionUpdateData,
	createAgentChatSessionRecord,
	findLatestAgentChatSessionMessagesContainingAny,
	saveAgentChatSessionRecord,
} from '@/features/agent-chat/repositories/agent-chat-session.payload.repository'
import type { AgentChatAiUsage, AgentChatSessionMessageInput } from '@/features/agent-chat/types'
import { getAgentMessageText } from '@/features/agent-chat/utils/derive-agent-message'
import type { AgentChatMessage } from '@/modules/agents/agent-chat.agent'
import { recordAiUsage } from '@/modules/ai-usage/repositories/ai-usage.payload.repository'
import type { User } from '@/payload-types'

export interface StartAgentChatSessionInput {
	messages: AgentChatMessage[]
	pagePath?: string
	user: User
}

/**
 * Agent 채팅 세션을 시작하고 스트림 실행 기록을 저장하는 유스케이스.
 * 생성 전에 히스토리 assistant 메시지의 실행 메타데이터를 직전 레코드에서 백필한다(합본 체인).
 * 스트림 스텝은 요청 스코프 mutable 상태에만 누적하고 DB에는 생성 1회와
 * 종결(completed/failed) 후 정상 경로 1회만 저장한다. 저장 I/O는 agent-chat-session
 * repository가 소유한다. 종결 후 recordStep은 no-op이며, fail/finalize는 미저장 terminal
 * 상태만 같은 값으로 재시도한다. 완료된 세션을 뒤집지 않으면서 일시적인 종결 저장 실패가
 * running 레코드를 남기지 않게 한다. 스텝 상한처럼 completed 신호 없이 끝나는 턴은
 * finalize()가 스트림 종료 시점에 종결 저장한다.
 */
export async function startAgentChatSession(input: StartAgentChatSessionInput) {
	const assistantMessageId = crypto.randomUUID()
	const requestMessages = await backfillAgentChatSessionMessages(
		toSessionMessages(input.messages),
		input.user,
	)
	const record = await createAgentChatSessionRecord({
		status: 'running',
		pagePath: input.pagePath,
		messageCount: requestMessages.length,
		messages: requestMessages,
		user: input.user,
	})

	// ponytail: aggregate class 대신 요청 스코프 상태 — 세션 생명주기가 한 요청 안에서 끝난다.
	const usage = createAgentChatSessionUsageCollector()
	let status: AgentChatSessionStatus = 'running'
	let assistantText = ''
	let errorMessage: string | undefined
	let completedAt: string | undefined
	const isTerminal = () => status !== 'running'

	/** 저장 필드만 뽑는다. assistant 메시지는 이 시점에 조건부 합성한다. */
	const toUpdateData = (): AgentChatSessionUpdateData => {
		const snapshot = usage.snapshot()
		const hasAssistantContent =
			Boolean(assistantText) ||
			Boolean(snapshot.aiUsage) ||
			snapshot.usedTools.length > 0 ||
			snapshot.usedSkills.length > 0
		const messages = hasAssistantContent
			? [
					...requestMessages,
					{
						messageId: assistantMessageId,
						role: 'assistant' as const,
						text: assistantText,
						usedTools: snapshot.usedTools,
						usedSkills: snapshot.usedSkills,
						aiUsage: snapshot.aiUsage,
					},
				]
			: requestMessages

		return {
			status,
			messages,
			messageCount: messages.length,
			usedTools: snapshot.usedTools,
			usedSkills: snapshot.usedSkills,
			errorMessage,
			completedAt,
		}
	}

	let terminalPersisted = false
	let terminalSavePromise: Promise<void> | undefined
	const persistTerminal = async () => {
		if (terminalPersisted) return
		terminalSavePromise ??= saveTerminalWithRetry(record.id, toUpdateData(), input.user).then(
			async () => {
				terminalPersisted = true
				await recordTurnAiUsage(usage.snapshot().aiUsage, input.user, record.id)
			},
		)
		try {
			await terminalSavePromise
		} finally {
			if (!terminalPersisted) terminalSavePromise = undefined
		}
	}

	return {
		assistantMessageId,
		id: record.id,
		fail: async (message: string) => {
			if (!isTerminal()) {
				status = 'failed'
				errorMessage = message
				completedAt = new Date().toISOString()
			}
			await persistTerminal()
		},
		/** 스트림 종료 안전망 — 스텝 상한 등으로 completed 신호 없이 끝난 턴을 종결 저장한다. */
		finalize: async () => {
			if (!isTerminal()) {
				status = 'completed'
				completedAt = new Date().toISOString()
			}
			await persistTerminal()
		},
		/** 스트림 스텝 1회분을 메모리에 누적한다. DB 쓰기는 하지 않는다. */
		recordStep: async ({ step, text }: { step: AgentChatSessionUsageStep; text?: string }) => {
			if (isTerminal()) return
			if (text) assistantText = text
			usage.addStep(step)
		},
	}
}

/**
 * 한 턴이 쓴 토큰을 계정별 집계에 남긴다. 종결 저장 뒤 1회만 부른다.
 *
 * ponytail: 한 턴 = 한 행이다. 수집기가 토큰을 모델별로 나누지 않고 모델 이름만 이어 붙이므로,
 * 한 턴이 모델을 둘 쓰면 그 행의 model은 "a, b"가 된다(스킬이 자기 모델을 지정하는 경우).
 * 모델별 단가 분석이 필요해지면 수집기가 모델을 키로 토큰을 나누게 고친다.
 */
async function recordTurnAiUsage(
	aiUsage: AgentChatAiUsage | undefined,
	user: User,
	agentChatSessionId: number,
): Promise<void> {
	if (!aiUsage?.model) return
	await recordAiUsage({
		createdBy: user.id,
		feature: 'agent-chat',
		model: aiUsage.model,
		inputTokens: aiUsage.inputTokens,
		outputTokens: aiUsage.outputTokens,
		totalTokens: aiUsage.totalTokens,
		cacheReadInputTokens: aiUsage.cacheReadInputTokens,
		cacheWriteInputTokens: aiUsage.cacheWriteInputTokens,
		reasoningTokens: aiUsage.reasoningTokens,
		source: { relationTo: 'agent-chat-sessions', value: agentChatSessionId },
	})
}

async function saveTerminalWithRetry(
	id: number,
	data: AgentChatSessionUpdateData,
	user: User,
): Promise<void> {
	let cause: unknown
	// 일시적 저장 실패는 1회 재시도하고, 실패 원인은 cause 체인으로 남긴다.
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			await saveAgentChatSessionRecord(id, data, user)
			return
		} catch (error) {
			cause = error
		}
	}
	throw new Error('Agent chat session terminal save failed.', { cause })
}

/**
 * 클라이언트 왕복으로 비는 히스토리 assistant 메시지의 실행 메타데이터(usedTools/usedSkills/aiUsage)를
 * 직전 세션 메시지에서 messageId 매칭으로 복사한다. 조회 결과는 이미 백필된 합본이므로
 * 1건 조회로 충분하다. 미종결 턴으로 저장되지 않은 assistant가 있어도 나머지 messageId로 합본을 찾도록
 * 전체 assistant id로 조회한다. 조회 I/O와 실패 로깅은 agent-chat-session repository가 소유하고,
 * 여기서는 실패 시 입력을 그대로 반환한다(best-effort — 백필은 채팅의 전제조건이 아니다).
 */
export async function backfillAgentChatSessionMessages(
	messages: AgentChatSessionMessageInput[],
	user: User,
): Promise<AgentChatSessionMessageInput[]> {
	const assistantMessageIds = messages
		.filter((message) => message.role === 'assistant')
		.map((message) => message.messageId)

	if (assistantMessageIds.length === 0) {
		return messages
	}

	let previousMessages: AgentChatSessionMessageInput[] = []

	try {
		previousMessages = await findLatestAgentChatSessionMessagesContainingAny(
			assistantMessageIds,
			user,
		)
	} catch {
		// Repository 초기화까지 실패해도 best-effort 백필이 본 채팅을 막지 않는다.
	}

	const sources = new Map(
		previousMessages
			.filter((message) => message.role === 'assistant')
			.map((message) => [message.messageId, message]),
	)

	if (sources.size === 0) {
		return messages
	}

	return messages.map((message) => {
		if (
			message.role !== 'assistant' ||
			message.usedTools ||
			message.usedSkills ||
			message.aiUsage
		) {
			return message
		}

		const source = sources.get(message.messageId)
		if (!source || (!source.usedTools && !source.usedSkills && !source.aiUsage)) {
			return message
		}

		return {
			...message,
			...(source.usedTools ? { usedTools: source.usedTools } : {}),
			...(source.usedSkills ? { usedSkills: source.usedSkills } : {}),
			...(source.aiUsage ? { aiUsage: source.aiUsage } : {}),
		}
	})
}

function toSessionMessages(messages: AgentChatMessage[]): AgentChatSessionMessageInput[] {
	return messages.map((message) => ({
		messageId: message.metadata?.agentChatMessageId ?? message.id,
		role: message.role,
		text: getAgentMessageText(message),
		reaction: message.metadata?.reaction,
	}))
}
