import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import {
	findChapterBySlug,
	findGuidelineMetadataGlobal,
	findPublishedTopicBySlug,
	listPublishedGuidelineNavigationTopics,
} from './guideline-view.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('listPublishedGuidelineNavigationTopics', () => {
	it('목차는 섹션의 부모·제목 단계를 보존하고 옛 블록은 읽지 않는다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{
					id: 1,
					chapter: 1,
					title: 'New',
					slug: 'new',
					contentModel: 'sections',
					blocks: [{ blockType: 'section', anchor: 'retired', title: 'Retired' }],
					sections: [
						{ id: 'main-id', type: 'section', anchor: 'main', title: 'Main' },
						{ id: 'sub-id', type: 'subsection', anchor: 'sub', title: 'Sub' },
					],
				},
				{
					id: 2,
					chapter: 1,
					title: 'Old',
					slug: 'old',
					blocks: [{ blockType: 'section', anchor: 'legacy', title: 'Legacy' }],
				},
			],
		})
		vi.mocked(getPayload).mockResolvedValue({ find } as never)
		const topics = await listPublishedGuidelineNavigationTopics()
		expect(topics.map((topic) => topic.sections)).toEqual([
			[
				{
					id: 'main-id',
					anchor: 'main',
					title: 'Main',
					headingLevel: 2,
					parentSectionId: null,
				},
				{
					id: 'sub-id',
					anchor: 'sub',
					title: 'Sub',
					headingLevel: 3,
					parentSectionId: 'main-id',
				},
			],
			[],
		])
	})
	it('global 관계 문서를 plain metadata DTO로 변환한다', async () => {
		const findGlobal = vi.fn().mockResolvedValue({
			companyName: 'Company',
			documentTitle: 'Guideline',
			favicon: { id: 1, url: '/favicon.png' },
			issuedLabel: '2026.07',
			primaryColor: { id: 2, hex: '112233' },
			primaryColorDark: 3,
		})
		vi.mocked(getPayload).mockResolvedValue({ findGlobal } as never)

		await expect(findGuidelineMetadataGlobal()).resolves.toEqual({
			companyName: 'Company',
			documentTitle: 'Guideline',
			faviconHref: '/favicon.png',
			issuedLabel: '2026.07',
			primaryHex: '112233',
			primaryDarkHex: null,
		})
	})

	it('fallback 없이 published 통합 문서만 한 번 조회한다', async () => {
		const find = vi.fn().mockResolvedValue({ docs: [] })
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await listPublishedGuidelineNavigationTopics()

		expect(find).toHaveBeenCalledTimes(1)
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				collection: 'guideline-documents',
				draft: false,
				fallbackLocale: false,
				locale: 'ko',
			}),
		)
		expect(find.mock.calls[0]?.[0]).not.toHaveProperty('where')
	})

	it('chapter와 topic을 canonical slug와 챕터 범위로 조회한다', async () => {
		const find = vi.fn().mockResolvedValue({ docs: [] })
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await findChapterBySlug('brand')
		await findPublishedTopicBySlug(1, 'logo')

		expect(find.mock.calls[0]?.[0].where).toEqual({
			slug: { equals: 'brand' },
		})
		expect(find.mock.calls[1]?.[0].where).toEqual({
			and: [{ slug: { equals: 'logo' } }, { chapter: { equals: 1 } }],
		})
	})

	it('navigation Payload 관계와 본문을 plain DTO로 변환한다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{
					id: 2,
					title: 'Basics',
					description: '브랜드의 기본 요소',
					slug: 'basics',
					chapter: { id: 1, title: 'Brand' },
					// depth 1 — 업로드 관계가 문서로 풀려 온다. 카드 썸네일이 그 URL을 쓴다.
					headerImage: {
						id: 9,
						url: '/api/application-images/file/basics.webp',
						alt: '기본 요소 표지',
					},
				},
				{ id: 3, title: 'Empty', slug: 'empty', chapter: 1, headerImage: 9 },
			],
		})
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await expect(listPublishedGuidelineNavigationTopics()).resolves.toEqual([
			{
				chapterId: 1,
				description: '브랜드의 기본 요소',
				id: 2,
				sections: [],
				slug: 'basics',
				thumbnail: {
					src: '/api/application-images/file/basics.webp',
					alt: '기본 요소 표지',
				},
				title: 'Basics',
			},
			// 풀리지 않은 관계(id)는 썸네일을 만들지 않는다 — 빈 판이다.
			{
				chapterId: 1,
				description: null,
				id: 3,
				sections: [],
				slug: 'empty',
				thumbnail: null,
				title: 'Empty',
			},
		])
	})
})
