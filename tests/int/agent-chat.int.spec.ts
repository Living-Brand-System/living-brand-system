import { describe, expect, it } from 'vitest'
import { getAgentChatErrorMessage } from '@/features/agent-chat/hooks/use-agent-chat'
import {
	getAgentReasoningMarker,
	getAgentSkillMarker,
	getAgentToolMarker,
} from '@/features/agent-chat/utils/derive-agent-message'
import type { AgentChatMessage } from '@/modules/agents/agent-chat.agent'

describe('agent chat errors', () => {
	it('uses JSON response messages', async () => {
		const response = Response.json({ message: 'Unauthorized' }, { status: 401 })

		await expect(getAgentChatErrorMessage(response)).resolves.toBe('Unauthorized')
	})

	it('falls back to status text', async () => {
		const response = new Response('nope', { status: 500, statusText: 'Internal Server Error' })

		await expect(getAgentChatErrorMessage(response)).resolves.toBe('Internal Server Error')
	})

	it('summarizes guideline search tool results as marker text', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-searchGuidelines',
					toolCallId: 'tool-1',
					state: 'output-available',
					input: { query: 'brand core' },
					output: [
						{ title: 'Brand Core', collection: 'guideline-documents', id: '1' },
						{ title: 'Identity', collection: 'guideline-documents', id: '2' },
					],
				},
			],
		} as AgentChatMessage

		expect(getAgentToolMarker(message)?.text).toBe('가이드라인 결과 2개를 찾았습니다')
	})

	it('summarizes Check catalog tool results as marker text', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-getCheckCatalog',
					toolCallId: 'tool-1',
					state: 'output-available',
					input: {},
					output: [
						{ key: 'color.palette', title: 'Color palette' },
						{ key: 'logo.clear-space', title: 'Logo clear space' },
					],
				},
			],
		} as AgentChatMessage

		expect(getAgentToolMarker(message)?.text).toBe('Check 카탈로그 2개를 확인했습니다')
	})

	it('uses loadSkill tool results as skill marker text', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-loadSkill',
					toolCallId: 'tool-1',
					state: 'output-available',
					input: { name: 'copywriter-test' },
					output: {
						name: 'copywriter-test',
						description: 'Rewrite copy.',
						instructions: 'Rewrite the sentence.',
					},
				},
			],
		} as AgentChatMessage

		expect(getAgentSkillMarker(message)?.text).toBe('copywriter-test')
		expect(getAgentToolMarker(message)).toBeNull()
	})

	it('uses loadSkill input as skill marker fallback while loading', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-loadSkill',
					toolCallId: 'tool-1',
					state: 'input-available',
					input: { name: 'guideline-qa' },
				},
			],
		} as AgentChatMessage

		expect(getAgentSkillMarker(message)).toEqual({
			isPending: true,
			text: 'guideline-qa',
		})
	})

	it('shows reasoning marker while reasoning streams', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [{ type: 'reasoning', text: 'Thinking...', state: 'streaming' }],
		} as AgentChatMessage

		expect(getAgentReasoningMarker(message)).toEqual({
			isPending: true,
			text: '확인 중',
		})
	})

	it('shows reasoning marker while an assistant message is active before reasoning parts arrive', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [{ type: 'text', text: '' }],
		} as AgentChatMessage

		expect(getAgentReasoningMarker(message, true)).toEqual({
			isPending: true,
			text: '확인 중',
		})
		expect(getAgentReasoningMarker(message, false)).toBeNull()
	})

	it('shows reasoning marker when reasoning is done', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [{ type: 'reasoning', text: 'Done.', state: 'done' }],
		} as AgentChatMessage

		expect(getAgentReasoningMarker(message)).toEqual({
			isPending: false,
			text: '확인 완료',
		})
	})

	it('keeps reasoning marker pending when a later reasoning part streams', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{ type: 'reasoning', text: 'Done.', state: 'done' },
				{ type: 'reasoning', text: 'Still thinking...', state: 'streaming' },
			],
		} as AgentChatMessage

		expect(getAgentReasoningMarker(message)).toEqual({
			isPending: true,
			text: '확인 중',
		})
	})

	it('summarizes guideline document list tool results as marker text', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-listGuidelineDocuments',
					toolCallId: 'tool-1',
					state: 'output-available',
					input: {},
					output: [
						{
							collection: 'guideline-documents',
							id: '1',
							chapterId: null,
							title: 'Core',
						},
						{
							collection: 'guideline-documents',
							id: '2',
							chapterId: '1',
							title: 'Name',
						},
					],
				},
			],
		} as AgentChatMessage

		expect(getAgentToolMarker(message)?.text).toBe('가이드라인 문서 2개를 확인했습니다')
	})

	it('shimmers tool markers until output is available', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-searchGuidelines',
					toolCallId: 'tool-1',
					state: 'input-available',
					input: { query: 'brand core' },
				},
			],
		} as AgentChatMessage

		expect(getAgentToolMarker(message)).toEqual({
			isPending: true,
			text: '가이드라인을 찾고 있습니다',
		})
	})

	it('stops shimmering when tool output is available', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-searchGuidelines',
					toolCallId: 'tool-1',
					state: 'output-available',
					input: { query: 'brand core' },
					output: [],
				},
			],
		} as AgentChatMessage

		expect(getAgentToolMarker(message)).toEqual({
			isPending: false,
			text: '가이드라인 결과 0개를 찾았습니다',
		})
	})

	it('uses template marker text for empty template search results', () => {
		const message = {
			id: '1',
			role: 'assistant',
			parts: [
				{
					type: 'tool-findTemplatesForRequest',
					toolCallId: 'tool-1',
					state: 'output-available',
					input: { query: '신규 입사자' },
					output: [],
				},
			],
		} as AgentChatMessage

		expect(getAgentToolMarker(message)).toEqual({
			isPending: false,
			text: '템플릿 검색을 완료했습니다',
		})
	})
})
