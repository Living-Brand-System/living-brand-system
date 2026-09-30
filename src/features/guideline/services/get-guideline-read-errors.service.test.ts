import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	findChapterBySlug,
	findGuidelineMetadataGlobal,
	findPublishedTopicBySlug,
	listGuidelineChapters,
	listPublishedGuidelineNavigationTopics,
} from '@/features/guideline/repositories/guideline-view.payload.repository'
import { getGuidelineMetadata } from './get-guideline-metadata.service'
import { getGuidelineNavigation } from './get-guideline-navigation.service'
import { getGuidelineTopic } from './get-guideline-topic.service'

vi.mock('../repositories/guideline-view.payload.repository', () => ({
	findChapterBySlug: vi.fn(),
	findGuidelineMetadataGlobal: vi.fn(),
	findPublishedTopicBySlug: vi.fn(),
	listGuidelineChapters: vi.fn(),
	listPublishedGuidelineNavigationTopics: vi.fn(),
}))

const chapter = { id: 1, title: 'Brand', slug: 'brand', displayOrder: 0 }

describe('guideline read service failures', () => {
	beforeEach(() => {
		vi.resetAllMocks()
		vi.mocked(findGuidelineMetadataGlobal).mockResolvedValue({
			companyName: 'Company',
			documentTitle: 'Guideline',
			faviconHref: null,
			issuedLabel: null,
			primaryHex: null,
			primaryDarkHex: null,
		})
		vi.mocked(listGuidelineChapters).mockResolvedValue([])
		vi.mocked(listPublishedGuidelineNavigationTopics).mockResolvedValue([])
	})

	it('챕터 미존재는 null이고 토픽 조회 실패는 전파한다', async () => {
		vi.mocked(findChapterBySlug).mockResolvedValueOnce(null)
		await expect(getGuidelineTopic('missing', 'logo')).resolves.toBeNull()

		vi.mocked(findChapterBySlug).mockResolvedValue(chapter)
		vi.mocked(findPublishedTopicBySlug).mockResolvedValueOnce(null)
		await expect(getGuidelineTopic('brand', 'missing')).resolves.toBeNull()

		vi.mocked(findPublishedTopicBySlug).mockRejectedValueOnce(new Error('db down'))
		await expect(getGuidelineTopic('brand', 'logo')).rejects.toThrow('db down')
	})

	it('metadata 조회 실패를 가짜 기본값으로 숨기지 않는다', async () => {
		vi.mocked(findGuidelineMetadataGlobal).mockRejectedValueOnce(new Error('db down'))

		await expect(getGuidelineMetadata()).rejects.toThrow('db down')
	})

	it('빈 목록은 빈 navigation이고 조회 실패는 전파한다', async () => {
		await expect(getGuidelineNavigation()).resolves.toMatchObject({
			title: 'Guideline',
			chapters: [],
		})

		vi.mocked(listGuidelineChapters).mockRejectedValueOnce(new Error('db down'))
		await expect(getGuidelineNavigation()).rejects.toThrow('db down')
	})
})
