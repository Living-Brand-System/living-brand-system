import { describe, expect, it } from 'vitest'
import type { AgentChatMessage } from '@/features/agent-chat/agent-chat.agent'
import {
	getAgentSkillMarker,
	getAgentTemplateAttachments,
	getAgentToolMarker,
} from './derive-agent-message'

function message(parts: unknown[]): AgentChatMessage {
	return { id: 'message-1', role: 'assistant', parts } as never
}

describe('getAgentTemplateAttachments', () => {
	it('JSON 제거 전에 저장된 첨부는 건너뛰고 HTML 첨부만 반환한다', () => {
		const attachments = getAgentTemplateAttachments(
			message([
				{
					type: 'tool-prepareTemplateImage',
					state: 'output-available',
					toolCallId: 'legacy',
					output: { type: 'template-image', templateId: 1, template: {}, values: {} },
				},
				{
					type: 'tool-prepareTemplateImage',
					state: 'output-available',
					toolCallId: 'html',
					output: {
						type: 'template-image',
						kind: 'html',
						templateId: 2,
						name: 'HTML template',
						html: '<div id="__stage"></div>',
						width: 100,
						height: 100,
						values: {},
					},
				},
			]),
		)

		expect(attachments).toHaveLength(1)
		expect(attachments[0]?.key).toBe('html')
	})
})

describe('getAgentSkillMarker', () => {
	it('완료된 loadSkill 출력의 skill 이름을 보여준다', () => {
		expect(
			getAgentSkillMarker(
				message([
					{
						type: 'tool-loadSkill',
						state: 'output-available',
						input: { name: 'answer-guideline' },
						output: { name: 'answer-guideline', instructions: '...' },
					},
				]),
			),
		).toEqual({ isPending: false, text: 'answer-guideline' })
	})

	it('출력 전에는 입력 이름을 pending으로, 이름이 없으면 Loading Skill을 보여준다', () => {
		expect(
			getAgentSkillMarker(
				message([
					{
						type: 'tool-loadSkill',
						state: 'input-available',
						input: { name: 'generate-image' },
					},
				]),
			),
		).toEqual({ isPending: true, text: 'generate-image' })
		expect(
			getAgentSkillMarker(
				message([{ type: 'tool-loadSkill', state: 'input-streaming', input: {} }]),
			),
		).toEqual({ isPending: true, text: 'Loading Skill' })
		expect(getAgentSkillMarker(message([{ type: 'text', text: '답' }]))).toBeNull()
	})
})

describe('getAgentToolMarker', () => {
	it('tool part가 없으면 null, loadSkill만 있으면 null을 반환한다', () => {
		expect(getAgentToolMarker(message([{ type: 'text', text: '답' }]))).toBeNull()
		expect(
			getAgentToolMarker(
				message([
					{
						type: 'tool-loadSkill',
						state: 'output-available',
						input: { name: 'answer-guideline' },
						output: { name: 'answer-guideline' },
					},
				]),
			),
		).toBeNull()
	})

	it('결과 개수는 같은 tool의 여러 part에 걸쳐 합산한다', () => {
		expect(
			getAgentToolMarker(
				message([
					{
						type: 'tool-searchGuidelines',
						state: 'output-available',
						output: [{ id: '1' }, { id: '2' }],
					},
					{
						type: 'tool-searchGuidelines',
						state: 'output-available',
						output: [{ id: '3' }],
					},
				]),
			),
		).toEqual({ isPending: false, text: '가이드라인 결과 3개를 찾았습니다' })
	})

	it('우선순위가 높은 tool 결과 문구를 먼저 쓴다', () => {
		expect(
			getAgentToolMarker(
				message([
					{
						type: 'tool-searchGuidelines',
						state: 'output-available',
						output: [{ id: '1' }],
					},
					{
						type: 'tool-listGuidelineDocuments',
						state: 'output-available',
						output: [{ id: '1' }, { id: '2' }],
					},
				]),
			),
		).toEqual({ isPending: false, text: '가이드라인 문서 2개를 확인했습니다' })
	})

	it('각 tool 종류의 결과 문구를 만든다', () => {
		const cases: [string, unknown, string][] = [
			['tool-readGuidelineDocument', { title: 'Logo' }, '가이드라인 문서 1개를 읽었습니다'],
			['tool-getCheckCatalog', [{ key: 'a' }], 'Check 카탈로그 1개를 확인했습니다'],
			[
				'tool-prepareTemplateImage',
				{ type: 'template-image' },
				'템플릿 이미지 1개를 준비했습니다',
			],
			['tool-runCheck', { checkSessionId: 3 }, '이미지 검수 1건을 완료했습니다'],
			[
				'tool-listCheckScenarios',
				[{ key: 'logo', title: '로고' }],
				'검수 시나리오 1개를 확인했습니다',
			],
			[
				'tool-generateImage',
				{ type: 'generated-images', images: [{ url: 'a' }, { url: 'b' }] },
				'이미지 2개를 생성했습니다',
			],
			[
				'tool-listImageProfiles',
				[{ id: 1, name: '제품', slug: 'product' }],
				'이미지 프로필 1개를 확인했습니다',
			],
			['tool-findTemplatesForRequest', [{ id: 1 }, { id: 2 }], '템플릿 2개를 확인했습니다'],
		]

		for (const [type, output, text] of cases) {
			expect(
				getAgentToolMarker(message([{ type, state: 'output-available', output }])),
			).toEqual({ isPending: false, text })
		}
	})

	it('진행 중인 part가 있으면 isPending을 켠다', () => {
		expect(
			getAgentToolMarker(
				message([
					{
						type: 'tool-searchGuidelines',
						state: 'output-available',
						output: [{ id: '1' }],
					},
					{ type: 'tool-readGuidelineDocument', state: 'input-available', input: {} },
				]),
			),
		).toEqual({ isPending: true, text: '가이드라인 결과 1개를 찾았습니다' })
	})

	it('결과 문구가 없으면 검수 > 이미지 생성 > 템플릿 > 가이드라인 순 fallback 문구를 쓴다', () => {
		expect(
			getAgentToolMarker(
				message([{ type: 'tool-runCheck', state: 'input-available', input: {} }]),
			),
		).toEqual({ isPending: true, text: '이미지를 검수하고 있습니다' })
		expect(
			getAgentToolMarker(
				message([{ type: 'tool-generateImage', state: 'input-available', input: {} }]),
			),
		).toEqual({ isPending: true, text: '이미지를 생성하고 있습니다' })
		expect(
			getAgentToolMarker(
				message([
					{
						type: 'tool-generateImage',
						state: 'output-available',
						output: { status: 'failed', message: '실패' },
					},
				]),
			),
		).toEqual({ isPending: false, text: '이미지 생성을 완료했습니다' })
		expect(
			getAgentToolMarker(
				message([
					{
						type: 'tool-runCheck',
						state: 'output-available',
						output: { status: 'missing-image' },
					},
				]),
			),
		).toEqual({ isPending: false, text: '이미지 검수를 완료했습니다' })
		expect(
			getAgentToolMarker(
				message([
					{ type: 'tool-findTemplatesForRequest', state: 'output-available', output: [] },
					{ type: 'tool-prepareTemplateImage', state: 'input-available', input: {} },
				]),
			),
		).toEqual({ isPending: true, text: '템플릿을 찾고 있습니다' })
		expect(
			getAgentToolMarker(
				message([
					{ type: 'tool-findTemplatesForRequest', state: 'output-available', output: [] },
				]),
			),
		).toEqual({ isPending: false, text: '템플릿 검색을 완료했습니다' })
		expect(
			getAgentToolMarker(
				message([{ type: 'tool-searchGuidelines', state: 'output-available', output: [] }]),
			),
		).toEqual({ isPending: false, text: '가이드라인 결과 0개를 찾았습니다' })
		expect(
			getAgentToolMarker(
				message([{ type: 'tool-searchGuidelines', state: 'input-streaming', input: {} }]),
			),
		).toEqual({ isPending: true, text: '가이드라인을 찾고 있습니다' })
		expect(
			getAgentToolMarker(
				message([{ type: 'tool-listGuidelineDocuments', state: 'output-error' }]),
			),
		).toEqual({ isPending: false, text: '가이드라인 검색을 완료했습니다' })
	})
})
