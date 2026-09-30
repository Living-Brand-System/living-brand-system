import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentChatSessionUsageStep } from '@/features/agent-chat/domain/agent-chat-session-usage'
import {
	createAgentChatSessionRecord,
	findLatestAgentChatSessionMessagesContainingAny,
	saveAgentChatSessionRecord,
} from '@/features/agent-chat/repositories/agent-chat-session.payload.repository'
import {
	backfillAgentChatSessionMessages,
	startAgentChatSession,
} from '@/features/agent-chat/services/start-agent-chat-session.service'
import type { AgentChatSessionMessageInput } from '@/features/agent-chat/types'
import type { AgentChatMessage } from '@/modules/agents/agent-chat.agent'
import type { User } from '@/payload-types'

vi.mock('@/features/agent-chat/repositories/agent-chat-session.payload.repository', () => ({
	createAgentChatSessionRecord: vi.fn(),
	findLatestAgentChatSessionMessagesContainingAny: vi.fn(),
	saveAgentChatSessionRecord: vi.fn(),
}))

// 🔴 이 테스트는 세션 저장만 본다. 막지 않으면 사용량 기록이 진짜 Payload를 부팅해 insert를
//    시도하고, 존재하지 않는 사용자라 FK로 실패하면서 재시도까지 돈다 — CI에서 4.2초를 먹어
//    5초 제한을 넘겼다(2026-09-28). `recordAiUsage`는 스스로 던지지 않으므로 실패가 조용하다.
vi.mock('@/modules/ai-usage/repositories/ai-usage.payload.repository', () => ({
	recordAiUsage: vi.fn(),
}))

const createSession = vi.mocked(createAgentChatSessionRecord)
const findPrevious = vi.mocked(findLatestAgentChatSessionMessagesContainingAny)
const saveSession = vi.mocked(saveAgentChatSessionRecord)

const user = { id: 7 } as User
const messages = [
	{
		id: 'user-message',
		role: 'user',
		parts: [{ type: 'text', text: '가이드라인을 찾아줘.' }],
	},
] as AgentChatMessage[]

const toolStep = {
	model: { modelId: 'test-model' },
	usage: {
		inputTokens: 10,
		inputTokenDetails: {
			noCacheTokens: 10,
			cacheReadTokens: undefined,
			cacheWriteTokens: undefined,
		},
		outputTokens: 5,
		outputTokenDetails: { textTokens: 5, reasoningTokens: undefined },
		totalTokens: 15,
	},
	toolCalls: [{ toolName: 'searchGuidelines', input: {} }],
	toolResults: [],
} as unknown as AgentChatSessionUsageStep

function savedData(callIndex = 0) {
	return saveSession.mock.calls[callIndex][1]
}

describe('startAgentChatSession', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		createSession.mockResolvedValue({ id: 41 })
		findPrevious.mockResolvedValue([])
	})

	it('요청 메시지로 running 세션을 생성한다', async () => {
		await startAgentChatSession({ messages, pagePath: '/guidelines', user })

		expect(createSession).toHaveBeenCalledWith({
			status: 'running',
			pagePath: '/guidelines',
			messageCount: 1,
			messages: [
				{
					messageId: 'user-message',
					role: 'user',
					text: '가이드라인을 찾아줘.',
				},
			],
			user,
		})
	})

	it('스트림 스텝은 저장하지 않고 finalize에서 한 번만 저장한다', async () => {
		const session = await startAgentChatSession({ messages, pagePath: '/guidelines', user })

		await session.recordStep({ step: toolStep })
		expect(saveSession).not.toHaveBeenCalled()

		await session.recordStep({
			text: '찾은 가이드라인입니다.',
			step: toolStep,
		})
		expect(saveSession).not.toHaveBeenCalled()

		await session.finalize()
		expect(saveSession).toHaveBeenCalledTimes(1)

		const [savedId, data, savedUser] = saveSession.mock.calls[0]
		expect(savedId).toBe(41)
		expect(savedUser).toBe(user)
		expect(data.status).toBe('completed')
		expect(data.completedAt).toEqual(expect.any(String))
		expect(data.messageCount).toBe(2)
		expect(data.usedTools).toEqual([{ name: 'searchGuidelines', callCount: 2 }])
		expect(data.messages[1]).toMatchObject({
			messageId: session.assistantMessageId,
			role: 'assistant',
			text: '찾은 가이드라인입니다.',
			usedTools: [{ name: 'searchGuidelines', callCount: 2 }],
			aiUsage: expect.objectContaining({ callCount: 2, totalTokens: 30 }),
		})
		// 토큰 사용량은 assistant 메시지에만 남긴다 — 세션 상단 그룹 이중 저장은 제거됐다.
		expect(data).not.toHaveProperty('aiUsage')
	})

	it('텍스트와 usage가 전혀 없으면 assistant 메시지를 추가하지 않는다', async () => {
		const session = await startAgentChatSession({ messages, user })

		await session.finalize()

		const data = savedData()
		expect(data.messages).toHaveLength(1)
		expect(data.messageCount).toBe(1)
		expect(data.messages[0]).toMatchObject({ messageId: 'user-message', role: 'user' })
	})

	it('종결 후 fail과 recordStep은 no-op이고 완료 세션을 뒤집지 않는다', async () => {
		const session = await startAgentChatSession({ messages, user })

		await session.recordStep({ text: '완료 응답', step: toolStep })
		await session.finalize()
		expect(saveSession).toHaveBeenCalledTimes(1)

		await session.recordStep({ text: '늦은 스텝', step: toolStep })
		await session.fail('late error')
		expect(saveSession).toHaveBeenCalledTimes(1)
		expect(savedData().status).toBe('completed')
		expect(savedData().usedTools).toEqual([{ name: 'searchGuidelines', callCount: 1 }])
	})

	it('finalize는 completed 신호 없이 끝난 턴을 종결 저장한다', async () => {
		const session = await startAgentChatSession({ messages, user })

		await session.recordStep({ step: toolStep })
		await session.finalize()

		expect(saveSession).toHaveBeenCalledTimes(1)
		expect(savedData().status).toBe('completed')
		expect(savedData().usedTools).toEqual([{ name: 'searchGuidelines', callCount: 1 }])
	})

	it('이미 종결된 세션에서 finalize는 no-op이다', async () => {
		const session = await startAgentChatSession({ messages, user })

		await session.recordStep({ text: '완료 응답', step: toolStep })
		await session.finalize()
		await session.finalize()

		expect(saveSession).toHaveBeenCalledTimes(1)
	})

	it('종결 저장이 일시 실패하면 같은 terminal 상태를 재시도한다', async () => {
		const saveError = new Error('Temporary database failure.')
		saveSession.mockRejectedValueOnce(saveError).mockResolvedValueOnce(undefined)
		const session = await startAgentChatSession({ messages, user })

		await session.recordStep({ text: '완료 응답', step: toolStep })
		await session.finalize()

		expect(saveSession).toHaveBeenCalledTimes(2)
		expect(savedData(1).status).toBe('completed')
	})

	it('종결 저장 재시도도 실패하면 후속 호출이 같은 terminal 상태 저장을 다시 시도한다', async () => {
		const saveError = new Error('Database failure.')
		const retryError = new Error('Database retry failure.')
		saveSession.mockRejectedValueOnce(saveError).mockRejectedValueOnce(retryError)
		const session = await startAgentChatSession({ messages, user })

		await session.recordStep({ text: '완료 응답', step: toolStep })
		await expect(session.finalize()).rejects.toMatchObject({ cause: retryError })

		saveSession.mockResolvedValueOnce(undefined)
		await session.fail('late error')

		expect(saveSession).toHaveBeenCalledTimes(3)
		expect(savedData(2).status).toBe('completed')
	})

	it('중단된 세션은 failed로 한 번 저장하고 누적된 부분 텍스트를 보존한다', async () => {
		const session = await startAgentChatSession({ messages, user })

		await session.recordStep({ text: '부분 응답', step: toolStep })
		await session.fail('Agent response interrupted.')

		expect(saveSession).toHaveBeenCalledTimes(1)
		expect(savedData()).toMatchObject({
			status: 'failed',
			errorMessage: 'Agent response interrupted.',
			completedAt: expect.any(String),
		})
		expect(savedData().messages[1]).toMatchObject({ role: 'assistant', text: '부분 응답' })
	})

	it('히스토리 assistant 메시지를 백필해서 세션을 생성한다', async () => {
		const historyMessages = [
			{
				id: 'user-1',
				role: 'user',
				parts: [{ type: 'text', text: '가이드라인을 찾아줘.' }],
			},
			{
				id: 'assistant-1',
				role: 'assistant',
				parts: [{ type: 'text', text: '가이드라인입니다.' }],
			},
			{
				id: 'user-2',
				role: 'user',
				parts: [{ type: 'text', text: '더 자세히.' }],
			},
		] as AgentChatMessage[]
		findPrevious.mockResolvedValue([
			{
				messageId: 'assistant-1',
				role: 'assistant',
				text: '가이드라인입니다.',
				usedTools: [{ name: 'loadSkill', callCount: 1 }],
				aiUsage: { model: 'test-model', callCount: 1, totalTokens: 120 },
			},
		])

		await startAgentChatSession({ messages: historyMessages, user })

		expect(findPrevious).toHaveBeenCalledWith(['assistant-1'], user)
		const created = createSession.mock.calls[0][0]
		expect(created.messages?.[1]).toMatchObject({
			messageId: 'assistant-1',
			usedTools: [{ name: 'loadSkill', callCount: 1 }],
			aiUsage: { model: 'test-model', callCount: 1, totalTokens: 120 },
		})
	})
})

describe('backfillAgentChatSessionMessages', () => {
	const history: AgentChatSessionMessageInput[] = [
		{ messageId: 'u-1', role: 'user', text: '가이드라인 알려줘' },
		{ messageId: 'a-1', role: 'assistant', text: '가이드라인입니다.', reaction: 'good' },
		{ messageId: 'u-2', role: 'user', text: '더 자세히' },
	]

	const previousMessages: AgentChatSessionMessageInput[] = [
		{ messageId: 'u-1', role: 'user', text: '가이드라인 알려줘' },
		{
			messageId: 'a-1',
			role: 'assistant',
			text: '가이드라인입니다.',
			reaction: 'bad',
			usedTools: [{ name: 'loadSkill', callCount: 1 }],
			usedSkills: [{ name: 'Guideline Curator', callCount: 1 }],
			aiUsage: {
				model: 'claude-sonnet-4-6',
				callCount: 2,
				inputTokens: 100,
				outputTokens: 20,
				totalTokens: 120,
				cacheReadInputTokens: 0,
				cacheWriteInputTokens: 0,
				reasoningTokens: 0,
			},
		},
	]

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('히스토리 assistant 메시지에 직전 레코드의 메타데이터를 복사하고 text·reaction은 현재값을 유지한다', async () => {
		findPrevious.mockResolvedValue(previousMessages)

		const result = await backfillAgentChatSessionMessages(history, user)

		expect(findPrevious).toHaveBeenCalledWith(['a-1'], user)
		expect(result[1]).toMatchObject({
			messageId: 'a-1',
			text: '가이드라인입니다.',
			reaction: 'good',
			usedTools: [{ name: 'loadSkill', callCount: 1 }],
			usedSkills: [{ name: 'Guideline Curator', callCount: 1 }],
			aiUsage: { model: 'claude-sonnet-4-6', callCount: 2, totalTokens: 120 },
		})
		expect(result[0]).toEqual(history[0])
		expect(result[2]).toEqual(history[2])
	})

	it('assistant 메시지가 없는 첫 턴은 조회 없이 입력을 그대로 반환한다', async () => {
		const firstTurn: AgentChatSessionMessageInput[] = [
			{ messageId: 'u-1', role: 'user', text: '안녕' },
		]

		const result = await backfillAgentChatSessionMessages(firstTurn, user)

		expect(result).toBe(firstTurn)
		expect(findPrevious).not.toHaveBeenCalled()
	})

	it('직전 레코드에 없는 messageId는 빈칸 그대로 둔다', async () => {
		findPrevious.mockResolvedValue([])

		const result = await backfillAgentChatSessionMessages(history, user)

		expect(result[1]).toEqual(history[1])
	})

	it('Repository 초기화까지 실패해도 입력을 그대로 반환한다', async () => {
		findPrevious.mockRejectedValue(new Error('repository unavailable'))

		const result = await backfillAgentChatSessionMessages(history, user)

		expect(result).toEqual(history)
	})

	it('미종결 턴의 assistant는 조회에 포함하되 저장되지 않아 빈칸으로 남는다', async () => {
		const historyWithUnfinishedTurn: AgentChatSessionMessageInput[] = [
			{ messageId: 'u-1', role: 'user', text: '가이드라인 알려줘' },
			{ messageId: 'a-0', role: 'assistant', text: '' },
			{ messageId: 'u-1b', role: 'user', text: '가이드라인 알려줘' },
			{ messageId: 'a-1', role: 'assistant', text: '가이드라인입니다.', reaction: 'good' },
			{ messageId: 'u-2', role: 'user', text: '더 자세히' },
		]
		findPrevious.mockResolvedValue(previousMessages)

		const result = await backfillAgentChatSessionMessages(historyWithUnfinishedTurn, user)

		expect(findPrevious).toHaveBeenCalledWith(['a-0', 'a-1'], user)
		expect(result[1]).toEqual(historyWithUnfinishedTurn[1])
		expect(result[3]).toMatchObject({
			messageId: 'a-1',
			usedTools: [{ name: 'loadSkill', callCount: 1 }],
			usedSkills: [{ name: 'Guideline Curator', callCount: 1 }],
			aiUsage: { model: 'claude-sonnet-4-6', callCount: 2, totalTokens: 120 },
		})
	})
})
