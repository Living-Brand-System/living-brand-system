'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useMemo } from 'react'
import type { AgentChatMessage } from '@/features/agent-chat/agent-chat.agent'

async function fetchAgentChat(input: RequestInfo | URL, init?: RequestInit) {
	const response = await fetch(input, init)

	if (response.ok) {
		return response
	}

	throw new Error(await getAgentChatErrorMessage(response))
}

export async function getAgentChatErrorMessage(response: Response) {
	const data: unknown = await response.json().catch(() => null)
	const message =
		typeof data === 'object' &&
		data !== null &&
		'message' in data &&
		typeof data.message === 'string'
			? data.message
			: response.statusText || 'Agent request failed.'

	return message
}

export function useAgentChat() {
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: '/api/agent-chat',
				credentials: 'same-origin',
				fetch: fetchAgentChat,
			}),
		[],
	)

	return useChat<AgentChatMessage>({ transport })
}
