import { describe, expect, it, vi } from 'vitest'
import { findPublishedBrandLogos } from '@/features/template-core/repositories/brand-logo.payload.repository'
import { findPublishedTemplate } from '@/features/template-core/repositories/published-template.payload.repository'
import { getPublishedTemplate } from './get-published-template.service'

vi.mock('@/features/template-core/repositories/brand-logo.payload.repository', () => ({
	findPublishedBrandLogos: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/features/template-core/repositories/published-template.payload.repository', () => ({
	findPublishedTemplate: vi.fn().mockResolvedValue({
		id: 3,
		name: '명함',
		updatedAt: '2026-08-01T00:00:00.000Z',
		html: '<p data-node-id="name">이름</p><div data-node-id="photo"></div><p data-node-id="caption">캡션</p>',
		overrides: {
			name: {
				text: '기본',
				input: { label: '이름', maxLength: 20, aiInstruction: '영문 이름만' },
			},
			photo: { imageInput: { profileId: 7 }, imageColorize: { line: '#112233' } },
			caption: { text: '고정' },
		},
		width: 1200,
		height: 800,
	}),
}))

describe('getPublishedTemplate', () => {
	it('스튜디오가 쓰는 노드 설정만 남기고 저작 내부 정보를 SSR에 노출하지 않는다', async () => {
		const template = await getPublishedTemplate('summer-poster')

		expect(template?.nodeConfigs).toEqual({
			name: { input: { label: '이름', maxLength: 20 } },
			photo: { imageInput: { profileId: 7 }, imageColorize: { line: '#112233' } },
		})
		expect(JSON.stringify(template)).not.toContain('aiInstruction')
	})

	it('로고 레이어마다 같은 CI 모양의 색 버전을 CI_VARIANTS 순서로 싣는다', async () => {
		const logo = (id: number, ciShape: string, ciVariant: string) => ({
			id,
			name: `${ciShape}-${ciVariant}`,
			url: `/api/brand-logos/file/${id}.svg`,
			width: 2,
			height: 1,
			ciShape,
			ciVariant,
		})
		vi.mocked(findPublishedBrandLogos).mockResolvedValueOnce([
			logo(35, 'hd-horizontal', 'mono-white'),
			logo(14, 'hd-horizontal', 'default'),
			logo(15, 'hd-horizontal', 'mono-black'),
			logo(33, 'symbol', 'default'),
		] as never)
		vi.mocked(findPublishedTemplate).mockResolvedValueOnce({
			id: 4,
			name: '포스터',
			updatedAt: '2026-10-12T00:00:00.000Z',
			html: '<img data-node-id="logo" data-figma-type="VECTOR" data-asset-collection="brand-logos" data-asset-id="15" src="/api/brand-logos/file/15.svg">',
			overrides: { logo: { creator: { access: 'editable' } } },
			width: 100,
			height: 100,
		} as never)

		const template = await getPublishedTemplate('poster')

		expect(template?.ciVariants).toEqual({
			logo: [
				{ variant: 'default', id: 14, src: '/api/brand-logos/file/14.svg' },
				{ variant: 'mono-black', id: 15, src: '/api/brand-logos/file/15.svg' },
				{ variant: 'mono-white', id: 35, src: '/api/brand-logos/file/35.svg' },
			],
		})
	})
})
