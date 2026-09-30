// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	isCrossOriginRequest: vi.fn(),
	isManager: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	findByID: vi.fn(),
	find: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ isManager: mocks.isManager }))
vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
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

describe('POST /api/studio/preview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.isManager.mockReturnValue(true)
		mocks.findByID.mockResolvedValue({ id: 3, name: '템플릿', _status: 'published' })
		mocks.find.mockResolvedValue({
			docs: [{ id: 9, name: 'Key Visual Pattern', _status: 'published' }],
		})
		mocks.create.mockResolvedValue({ id: 100 })
		mocks.update.mockResolvedValue({
			previewImage: { url: '/api/application-images/file/p.png', alt: 'alt' },
		})
		mocks.authenticateRequest.mockResolvedValue({
			payload: {
				logger: { error: vi.fn() },
				create: mocks.create,
				update: mocks.update,
				findByID: mocks.findByID,
				find: mocks.find,
			},
			user: { id: 7 },
		})
	})

	it('매니저가 아니면 거부한다', async () => {
		mocks.isManager.mockReturnValue(false)

		const response = await POST(
			requestWith({ studio: 'graphic', profileId: 'key-visual-pattern', file: pngFile() }),
		)

		expect(response.status).toBe(403)
		expect(mocks.create).not.toHaveBeenCalled()
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
		expect(mocks.create).not.toHaveBeenCalled()
	})

	it('graphic은 숫자 id가 아니라 runtime으로 프로파일을 찾는다', async () => {
		await POST(
			requestWith({ studio: 'graphic', profileId: 'key-visual-pattern', file: pngFile() }),
		)

		expect(mocks.find).toHaveBeenCalledWith(
			expect.objectContaining({
				collection: 'graphic-profiles',
				where: { runtime: { equals: 'key-visual-pattern' } },
			}),
		)
		expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }))
	})

	it('🔴 갱신이 게시 상태를 초안으로 떨어뜨리지 않는다', async () => {
		await POST(
			requestWith({ studio: 'graphic', profileId: 'key-visual-pattern', file: pngFile() }),
		)

		// versioned 컬렉션은 `_status`를 빠뜨리면 최신 초안 버전의 상태를 따라 써서 게시가 풀린다.
		expect(mocks.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ previewImage: 100, _status: 'published' }),
			}),
		)
	})

	it('미리보기 이미지는 published로 만든다', async () => {
		await POST(requestWith({ studio: 'template', profileId: '3', file: pngFile() }))

		expect(mocks.create).toHaveBeenCalledWith(
			expect.objectContaining({
				collection: 'application-images',
				data: expect.objectContaining({ _status: 'published' }),
			}),
		)
	})

	it('프로파일이 없으면 404를 낸다', async () => {
		mocks.find.mockResolvedValue({ docs: [] })

		const response = await POST(
			requestWith({ studio: 'graphic', profileId: 'nope', file: pngFile() }),
		)

		expect(response.status).toBe(404)
		expect(mocks.create).not.toHaveBeenCalled()
	})
})
