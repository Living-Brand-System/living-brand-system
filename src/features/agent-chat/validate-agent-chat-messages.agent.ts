import { safeValidateUIMessages } from 'ai'
import { type AgentChatMessage, agentChatAgent } from '@/features/agent-chat/agent-chat.agent'

/**
 * Route Handler가 받은 UI message가 현재 agent tool schema와 맞는지 검증한다.
 * 실제 tool 실행 I/O는 포함하지 않는다. 스트리밍 Response 생성은 route가 소유한다.
 */
export function validateAgentChatMessages(messages: unknown) {
	return safeValidateUIMessages<AgentChatMessage>({
		messages,
		// ponytail: UI messages never carry tool context; this mirrors AI SDK's harness cast.
		tools: agentChatAgent.tools as never,
	})
}
