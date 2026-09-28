import { describe, expect, it, vi } from 'vitest'
import { buildGuidelineNavigationChapters } from './get-guideline-navigation.service'

vi.mock('../repositories/guideline-view.payload.repository', () => ({
	listGuidelineChapters: vi.fn(),
	listPublishedGuidelineNavigationTopics: vi.fn(),
}))
vi.mock('./get-guideline-metadata.service', () => ({ getGuidelineMetadata: vi.fn() }))

describe('buildGuidelineNavigationChapters', () => {
	// 🔴 URL은 breadcrumb이 아니라 챕터 slug + 토픽 slug로 조립한다(2026-08-26).
	it('챕터별로 토픽을 묶고 앵커 URL을 만든다', () => {
		const navigation = buildGuidelineNavigationChapters(
			[{ id: 1, title: 'Brand', slug: 'brand', displayOrder: 0 }],
			[
				{
					chapterId: 1,
					id: 2,
					sections: [
						{
							id: 'primary-logo',
							headingLevel: 2,
							parentSectionId: null,
							anchor: 'primary-logo',
							title: 'Primary Logo',
						},
					],
					slug: 'logo',
					title: 'Logo',
				},
			],
		)

		expect(navigation).toEqual([
			{
				id: 1,
				title: 'Brand',
				topics: [
					{
						id: 2,
						title: 'Logo',
						href: '/guideline/brand/logo',
						sections: [
							{
								id: 'primary-logo',
								headingLevel: 2,
								parentSectionId: null,
								anchor: 'primary-logo',
								title: 'Primary Logo',
								href: '/guideline/brand/logo#primary-logo',
							},
						],
					},
				],
			},
		])
	})

	// chapter는 required지만 초안은 그 검증을 건너뛴다 — 짝 없는 토픽이 트리를 깨면 안 된다.
	it('어느 챕터에도 속하지 않은 토픽은 목차에 넣지 않는다', () => {
		const navigation = buildGuidelineNavigationChapters(
			[{ id: 1, title: 'Brand', slug: 'brand', displayOrder: 0 }],
			[
				{
					chapterId: null,
					id: 9,
					sections: [],
					slug: 'orphan',
					title: 'Orphan',
				},
			],
		)

		expect(navigation[0]?.topics).toEqual([])
	})
})
