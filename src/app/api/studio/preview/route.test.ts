// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
	class StudioProfileNotFoundError extends Error {}
	class StudioProfileDraftPendingError extends Error {}
	return {
		authenticateRequest: vi.fn(),
		isCrossOriginRequest: vi.fn(),
		isManager: vi.fn(),
		updateProfilePreview: vi.fn(),
		StudioProfileNotFoundError,
		StudioProfileDraftPendingError,
	}
})

vi.mock('@/lib/auth', () => ({ isManager: mocks.isManager }))
vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))
vi.mock('@/features/studio-preview/services/update-profile-preview.service', () => ({
	isStudioPreviewKind: (value: unknown) =>
		['graphic', 'graph', 'image', 'template'].includes(value as string),
	updateProfilePreview: mocks.updateProfilePreview,
	StudioProfileNotFoundError: mocks.StudioProfileNotFoundError,
	StudioProfileDraftPendingError: mocks.StudioProfileDraftPendingError,
}))

import { POST } from './route'

function pngFile(bytes = 32) {
	return new File([new Uint8Array(bytes)], 'preview.png', { type: 'image/png' })
}

function requestWith(entries: Record<string, FormDataEntryValue>) {
	return {
		headers: new Headers(),
		formData: async () => ({ get: (key: string) => entries[key] ?? null }),
	} as unknown as Request
}

const graphicRequest = () =>
	requestWith({ studio: 'graphic', profileId: 'key-visual-pattern', file: pngFile() })

describe('POST /api/studio/preview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.isManager.mockReturnValue(true)
		mocks.updateProfilePreview.mockResolvedValue({
			url: '/api/application-images/file/p.png',
			alt: 'alt',
		})
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: { error: vi.fn() } },
			user: { id: 7 },
		})
	})

	it('형식이 깨진 본문은 500이 아니라 400이다', async () => {
		const broken = {
			headers: new Headers(),
			formData: async () => {
				throw new TypeError('Could not parse content as FormData.')
			},
		} as unknown as Request
		const response = await POST(broken)
		expect(response.status).toBe(400)
		expect(mocks.updateProfilePreview).not.toHaveBeenCalled()
	})

	it('매니저가 아니면 거부한다', async () => {
		mocks.isManager.mockReturnValue(false)

		expect((await POST(graphicRequest())).status).toBe(403)
		expect(mocks.updateProfilePreview).not.toHaveBeenCalled()
	})

	it('PNG가 아니면 거부한다', async () => {
		const response = await POST(
			requestWith({
				studio: 'graphic',
				profileId: 'key-visual-pattern',
				file: new File(['x'], 'p.jpg', { type: 'image/jpeg' }),
			}),
		)

		expect(response.status).toBe(400)
		expect(mocks.updateProfilePreview).not.toHaveBeenCalled()
	})

	it('모르는 스튜디오면 거부한다', async () => {
		const response = await POST(
			requestWith({ studio: 'video', profileId: '1', file: pngFile() }),
		)
		expect(response.status).toBe(400)
	})

	it('폼을 서비스 입력으로 옮기고 결과를 그대로 돌려준다', async () => {
		const response = await POST(graphicRequest())

		expect(mocks.updateProfilePreview).toHaveBeenCalledWith({
			studio: 'graphic',
			profileId: 'key-visual-pattern',
			png: expect.any(Buffer),
			user: { id: 7 },
		})
		await expect(response.json()).resolves.toEqual({
			previewImage: { url: '/api/application-images/file/p.png', alt: 'alt' },
		})
	})

	it('프로파일이 없으면 404, 초안이 얹혀 있으면 409, 그 밖은 500', async () => {
		mocks.updateProfilePreview.mockRejectedValueOnce(
			new mocks.StudioProfileNotFoundError('없음'),
		)
		expect((await POST(graphicRequest())).status).toBe(404)

		mocks.updateProfilePreview.mockRejectedValueOnce(
			new mocks.StudioProfileDraftPendingError('초안'),
		)
		const conflict = await POST(graphicRequest())
		expect(conflict.status).toBe(409)
		await expect(conflict.json()).resolves.toEqual({ message: '초안' })

		mocks.updateProfilePreview.mockRejectedValueOnce(new Error('db down'))
		expect((await POST(graphicRequest())).status).toBe(500)
	})
})
