import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { findDraftGuidelineDocumentById } from './guideline-preview.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('findDraftGuidelineDocumentById', () => {
	it('미존재는 null로 돌려주도록 조회하고 DB 오류는 그대로 전파한다', async () => {
		const findByID = vi
			.fn()
			.mockResolvedValueOnce(null)
			.mockRejectedValueOnce(new Error('db down'))
		vi.mocked(getPayload).mockResolvedValue({ findByID } as never)

		await expect(findDraftGuidelineDocumentById(404, { id: 1 } as never)).resolves.toBeNull()
		expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ disableErrors: true }))

		await expect(findDraftGuidelineDocumentById(1, { id: 1 } as never)).rejects.toThrow(
			'db down',
		)
	})

	it('Payload 챕터 관계를 preview DTO로 변환한다', async () => {
		const findByID = vi.fn().mockResolvedValue({
			id: 3,
			title: 'Logo',
			slug: 'logo',
			chapter: { id: 2, title: 'Basics', slug: 'basics' },
			displayOrder: null,
		})
		vi.mocked(getPayload).mockResolvedValue({ findByID } as never)

		await expect(findDraftGuidelineDocumentById(3, { id: 1 } as never)).resolves.toMatchObject({
			id: 3,
			chapterSlug: 'basics',
			displayOrder: -1,
		})
	})
})
