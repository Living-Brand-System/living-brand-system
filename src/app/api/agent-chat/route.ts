import { consumeStream, createAgentUIStreamResponse } from 'ai'
import { parseAgentChatRequest } from '@/app/api/agent-chat/parse-agent-chat-request'
import {
	agentChatAgent,
	assertAgentChatProviderConfigured,
} from '@/features/agent-chat/agent-chat.agent'
import { startAgentChatSession } from '@/features/agent-chat/services/start-agent-chat-session.service'
import { validateAgentChatMessages } from '@/features/agent-chat/validate-agent-chat-messages.agent'
import { AgentConfigurationError } from '@/lib/errors'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'
import {
	assertWithinTokenLimit,
	TokenLimitExceededError,
} from '@/modules/ai-usage/services/token-limit.service'

export const maxDuration = 30

// 25MB — base64 이미지 첨부(~33% 팽창) 여유. 무제한 JSON 적재 방지 (docs/07 #17).
const MAX_BODY_BYTES = 25_000_000

export async function POST(req: Request) {
	if (isCrossOriginRequest(req)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	// content-length 없는(chunked) 요청은 통과한다 — 브라우저 fetch는 항상 길이를 싣는다.
	if (Number(req.headers.get('content-length')) > MAX_BODY_BYTES) {
		return Response.json({ message: 'Request is too large.' }, { status: 413 })
	}

	const { payload, user } = await authenticateRequest()

	// Agent 질의도 내부 사용자 요청만 허용한다.
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}

	const parsed = await parseAgentChatRequest(req)

	if (!parsed.success) {
		return Response.json({ message: 'Invalid request.' }, { status: 400 })
	}

	const validatedMessages = await validateAgentChatMessages(parsed.data.messages)

	if (!validatedMessages.success) {
		return Response.json({ message: 'Invalid request.' }, { status: 400 })
	}

	// 모델을 부르기 전에 한도를 본다 — 세션도 만들지 않는다.
	try {
		await assertWithinTokenLimit(user.id)
	} catch (error) {
		if (error instanceof TokenLimitExceededError) {
			return Response.json({ message: error.message }, { status: 429 })
		}
		throw error
	}

	const requestId = crypto.randomUUID()
	const chatSession = await startAgentChatSession({
		pagePath: parsed.data.pagePath,
		messages: validatedMessages.data,
		user,
	})

	// 세션 종료 저장 실패는 응답 흐름을 막지 않고 동일한 키로 로깅만 한다.
	const endSession = (save: Promise<unknown>) =>
		save.catch((error) => {
			payload.logger.error({ err: error, requestId }, 'agent-chat.session-update.failed')
		})

	try {
		// stream 시작 전에 동기로 검증해야 설정 오류를 HTTP 상태로 매핑할 수 있다.
		assertAgentChatProviderConfigured()

		// 스트리밍 Response 생성은 HTTP adapter인 route가 소유한다 (AI SDK 공식 패턴).
		return await createAgentUIStreamResponse({
			agent: agentChatAgent,
			abortSignal: req.signal,
			consumeSseStream: consumeStream,
			uiMessages: validatedMessages.data,
			options: {
				agentChatSessionId: chatSession.id,
				pagePath: parsed.data.pagePath,
				user,
			},
			onStepEnd: async (step) => {
				await chatSession.recordStep({
					step,
					text: 'text' in step && typeof step.text === 'string' ? step.text : undefined,
				})
			},
			messageMetadata: ({ part }) =>
				part.type === 'start'
					? {
							agentChatSessionId: chatSession.id,
							agentChatMessageId: chatSession.assistantMessageId,
						}
					: undefined,
			onError: (error) => {
				// 스트림 오류의 실제 원인은 여기서만 잡을 수 있다 — 사용자에게는 일반화된 문구만 나간다.
				payload.logger.error({ err: error, requestId }, 'agent-chat.stream.failed')
				void endSession(chatSession.fail('Agent response failed.'))
				return 'Agent response failed.'
			},
			onEnd: async ({ isAborted, finishReason }) => {
				await endSession(
					isAborted || finishReason == null || finishReason === 'error'
						? chatSession.fail('Agent response interrupted.')
						: chatSession.finalize(),
				)
			},
		})
	} catch (error) {
		await endSession(
			chatSession.fail(error instanceof Error ? error.message : 'Agent response failed.'),
		)
		payload.logger.error({ err: error, requestId }, 'agent-chat.request.failed')

		if (error instanceof AgentConfigurationError) {
			// Route는 provider 환경변수 이름을 알지 않고 서비스 설정 실패만 변환한다.
			return Response.json({ message: error.message }, { status: 503 })
		}

		// 상세 오류는 위 로그에만 남기고 사용자에게는 일반화된 메시지만 반환한다.
		return Response.json({ message: 'Agent response failed.' }, { status: 500 })
	}
}
