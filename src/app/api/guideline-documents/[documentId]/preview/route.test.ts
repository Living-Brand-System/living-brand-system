import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	getGuidelineDocumentPreviewTarget: vi.fn(),
	isCrossOriginRequest: vi.fn(),
}))

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/features/guideline/services/get-guideline-document-preview.service', () => ({
	getGuidelineDocumentPreviewTarget: mocks.getGuidelineDocumentPreviewTarget,
}))
vi.mock('@/lib/auth', () => ({
	isManager: () => true,
}))
vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))

import { GET } from './route'

describe('GET /api/guideline-documents/:documentId/preview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.authenticateRequest.mockResolvedValue({ user: { id: 7 } })
	})

	it('유효하지 않은 문서 ID를 거부한다', async () => {
		const response = await GET(new Request('http://localhost'), {
			params: Promise.resolve({ documentId: '0' }),
		})

		expect(response.status).toBe(400)
		expect(mocks.getGuidelineDocumentPreviewTarget).not.toHaveBeenCalled()
	})
})
