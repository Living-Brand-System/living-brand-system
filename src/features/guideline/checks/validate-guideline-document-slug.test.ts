import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hasGuidelineDocumentSlugConflict } from '../repositories/guideline-document.payload.repository'
import { validateGuidelineDocumentSlug } from './validate-guideline-document-slug'

vi.mock('../repositories/guideline-document.payload.repository', () => ({
	hasGuidelineDocumentSlugConflict: vi.fn(),
}))

const hasSlugConflict = vi.mocked(hasGuidelineDocumentSlugConflict)

describe('validateGuidelineDocumentSlug', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('같은 locale·챕터의 중복만 거부하고 현재 문서는 제외한다', async () => {
		hasSlugConflict.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
		const req = { locale: 'ko' } as never
		const args = {
			collection: { slug: 'guideline-documents' },
			data: { chapter: 2 },
			originalDoc: { id: 7, slug: 'logo' },
			req,
			value: 'logo',
		} as never

		await expect(validateGuidelineDocumentSlug(args)).resolves.toBe('logo')
		expect(hasSlugConflict).toHaveBeenLastCalledWith(req, {
			slug: 'logo',
			chapterId: 2,
			currentId: 7,
		})
		await expect(validateGuidelineDocumentSlug(args)).rejects.toMatchObject({
			data: { errors: [{ path: 'slug' }] },
		})
	})
})
