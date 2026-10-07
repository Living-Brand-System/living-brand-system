import type { ModelMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { prunePriorTurns } from './prune-prior-turns'

const toolTurn = (toolName: string, toolCallId: string): ModelMessage[] => [
	{
		role: 'assistant',
		content: [
			{ type: 'reasoning', text: 'thinking' },
			{ type: 'tool-call', toolCallId, toolName, input: {} },
		],
	},
	{
		role: 'tool',
		content: [
			{
				type: 'tool-result',
				toolCallId,
				toolName,
				output: { type: 'json', value: { body: 'x' } },
			},
		],
	},
]

describe('prunePriorTurns', () => {
	it('조회성 tool과 reasoning은 지우고, 다음 턴이 이어받는 tool 결과와 답변은 남긴다', () => {
		const pruned = prunePriorTurns([
			{ role: 'user', content: '로고 규정 알려줘' },
			...toolTurn('readGuidelineDocument', 'read-1'),
			...toolTurn('findTemplatesForRequest', 'find-1'),
			{ role: 'assistant', content: [{ type: 'text', text: '답변' }] },
			{ role: 'user', content: '두 번째 템플릿으로 만들어줘' },
		])

		const parts = pruned.flatMap((message) =>
			typeof message.content === 'string'
				? [message.content]
				: message.content.map((part) =>
						'toolName' in part ? `${part.type}:${part.toolName}` : part.type,
					),
		)

		expect(parts).toEqual([
			'로고 규정 알려줘',
			'tool-call:findTemplatesForRequest',
			'tool-result:findTemplatesForRequest',
			'text',
			'두 번째 템플릿으로 만들어줘',
		])
	})
})
