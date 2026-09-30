import { describe, expect, it, vi } from 'vitest'
import type { PublishedHtmlTemplate } from '@/features/template-customization/domain/template-studio-config'
import { getTemplateStudio } from './get-template-studio.service'

const published: PublishedHtmlTemplate = {
	kind: 'html',
	id: 7,
	name: '포스터',
	html: '<div><p data-node-id="1:1" data-figma-type="TEXT" data-name="Title">기본 제목</p></div>',
	nodeConfigs: {
		'1:1': { input: { label: '제목', maxLength: 20, maxLines: 1 } },
	},
	width: 800,
	height: 600,
	templateVersion: '2026-08-01T00:00:00.000Z',
	exportPolicy: { allowedFormats: ['png'] },
}

vi.mock('@/features/template-customization/services/get-published-template.service', () => ({
	getPublishedTemplate: vi.fn(async (slug: string) => (slug === 'poster' ? published : null)),
}))
vi.mock('@/features/image-generation/services/list-image-studio-configs.service', () => ({
	listImageStudioConfigs: vi.fn(async () => []),
}))
vi.mock('@/features/graphic-generation/services/list-graphic-studio-configs.service', () => ({
	listGraphicStudioConfigs: vi.fn(async () => []),
}))
// 🔴 이것이 빠져 있어 단위 테스트가 Payload를 실제로 부팅했다 — 빈 DB에서는 스키마 생성까지
//    이 테스트가 떠안아 CI가 타임아웃으로 죽었다.
vi.mock(
	'@/features/template-customization/repositories/brand-highlight-color.payload.repository',
	() => ({ getTemplateHighlightColor: vi.fn(async () => '#1d7a4c') }),
)

describe('getTemplateStudio', () => {
	it('published 템플릿이 없으면 null을 반환한다', async () => {
		expect(await getTemplateStudio('missing', { id: 1 })).toBeNull()
	})

	it('Effective Config를 파생하고 클라이언트 뷰에는 Admin 정책을 싣지 않는다', async () => {
		const studio = await getTemplateStudio('poster', { id: 1 })

		expect(studio?.config).toMatchObject({ studio: 'template', id: 7, name: '포스터' })
		expect(studio?.template).toEqual({
			id: 7,
			name: '포스터',
			html: published.html,
			width: 800,
			height: 600,
		})
		expect(JSON.stringify(studio?.template)).not.toContain('controllerRestrictions')
		expect(JSON.stringify(studio?.template)).not.toContain('exportPolicy')
		// 강조색 배선이 끊겨도 테스트가 통과하지 않게 값까지 본다.
		expect(studio?.highlightColor).toBe('#1d7a4c')
	})
})
