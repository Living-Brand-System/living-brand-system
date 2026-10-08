import { z } from 'zod'
import { saveAgentChatReaction } from '@/features/agent-chat/services/save-agent-chat-reaction.service'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

const reactionSchema = z.object({
	agentChatSessionId: z.number().int().positive(),
	messageId: z.string().min(1),
	reaction: z.enum(['good', 'bad']),
})

/**
 * Agent 채팅 리액션 저장 엔드포인트 — 세션 안의 특정 답변 메시지 피드백만 갱신한다.
 */
export async function POST(req: Request) {
	if (isCrossOriginRequest(req)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { user } = await authenticateRequest()
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}

	const parsed = reactionSchema.safeParse(await req.json().catch(() => null))
	if (!parsed.success) {
		return Response.json({ message: 'Invalid request.' }, { status: 400 })
	}

	const session = await saveAgentChatReaction({
		agentChatSessionId: parsed.data.agentChatSessionId,
		messageId: parsed.data.messageId,
		reaction: parsed.data.reaction,
		user,
	})

	if (!session) {
		return Response.json({ message: 'Not found.' }, { status: 404 })
	}

	return Response.json({ reaction: parsed.data.reaction })
}
