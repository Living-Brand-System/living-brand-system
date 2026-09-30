import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findDraftGuidelineDocumentById } from '../repositories/guideline-preview.payload.repository'
import {
	getGuidelineDocumentPreviewTarget,
	getGuidelineTopicPreview,
} from './get-guideline-document-preview.service'

vi.mock('../repositories/guideline-preview.payload.repository', () => ({
	findDraftGuidelineDocumentById: vi.fn(),
}))

const topic = {
	id: 2,
	title: 'Draft Basics',
	slug: 'basics',
	chapterSlug: 'brand-system',
	headerImage: null,
	blocks: [],
	displayOrder: 1,
}

describe('guideline document preview', () => {
	beforeEach(() => vi.resetAllMocks())

	it('발행되지 않은 draft 토픽도 챕터 slug로 URL을 만든다', async () => {
		vi.mocked(findDraftGuidelineDocumentById).mockResolvedValue(topic as never)

		// #앵커 금지: 동일 출처 iframe(Better Editor)에서 앵커가 부모 admin 문서까지 스크롤시킨다.
		await expect(
			getGuidelineDocumentPreviewTarget(2, { id: 1 } as never),
		).resolves.toMatchObject({
			href: '/guideline/brand-system/basics?previewDocument=2',
			chapterSlug: 'brand-system',
			topicSlug: 'basics',
		})

		await expect(getGuidelineTopicPreview(2, { id: 1 } as never)).resolves.toMatchObject({
			title: 'Draft Basics',
			blocks: [],
		})
	})

	// 🔴 chapter는 required지만 초안은 그 검증을 건너뛴다 — URL을 만들 수 없으면 preview도 없다.
	it('챕터가 비었거나 문서가 없으면 null이고 조회 실패는 전파한다', async () => {
		vi.mocked(findDraftGuidelineDocumentById).mockResolvedValueOnce(null)
		await expect(getGuidelineDocumentPreviewTarget(404, { id: 1 } as never)).resolves.toBeNull()

		vi.mocked(findDraftGuidelineDocumentById).mockResolvedValueOnce({
			...topic,
			chapterSlug: null,
		} as never)
		await expect(getGuidelineDocumentPreviewTarget(2, { id: 1 } as never)).resolves.toBeNull()

		vi.mocked(findDraftGuidelineDocumentById).mockRejectedValueOnce(new Error('db down'))
		await expect(getGuidelineDocumentPreviewTarget(2, { id: 1 } as never)).rejects.toThrow(
			'db down',
		)
	})
})
