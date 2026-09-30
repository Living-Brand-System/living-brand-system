import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	generateImages: vi.fn(),
	isCrossOriginRequest: vi.fn(),
	logger: { error: vi.fn(), info: vi.fn() },
}))

vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))
vi.mock('@/features/image-generation/services/generate-image.service', () => ({
	generateImages: mocks.generateImages,
}))

import { POST } from './route'

// route는 error.name으로 매핑하므로 실제 클래스 대신 이름만 맞춘 오류로 검증한다.
function namedError(name: string) {
	const error = new Error(name)
	error.name = name
	return error
}

function imageRequest(body: unknown) {
	return new Request('http://localhost/api/generate-image', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
}

describe('POST /api/generate-image', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: mocks.logger },
			user: { id: 1 },
		})
		mocks.generateImages.mockResolvedValue({
			aspectRatio: '1:1',
			generatedImages: [
				{
					collection: 'generated-images',
					createdAt: '2026-07-31T03:00:00.000Z',
					id: 8,
					url: '/api/generated-images/file/generated.png',
				},
			],
			images: ['/api/generated-images/file/generated.png'],
			imageSize: '1K',
			model: 'gpt-image-2',
			prompt: 'sample',
			provider: 'openai',
		})
	})

	it('인증되지 않은 요청을 거부한다', async () => {
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: mocks.logger },
			user: null,
		})

		const response = await POST(imageRequest({ prompt: 'sample' }))

		expect(response.status).toBe(401)
		expect(mocks.generateImages).not.toHaveBeenCalled()
	})

	it.each([
		{ prompt: '', count: 1 },
		{ prompt: 'sample', count: 0 },
		{ prompt: 'sample', count: 1.5 },
		{ prompt: 'sample' },
		{ prompt: 'sample', profileId: 0 },
		{ prompt: 'sample', imageModelPreset: 'openai-gpt-image-2' },
		{ prompt: 'sample', profileId: 5, aspectRatio: '7:5' },
		{ prompt: 'sample', profileId: 5, imageSize: '8K' },
	])('일반 생성 계약 밖의 입력을 거부한다: %o', async (body) => {
		const response = await POST(imageRequest(body))

		expect(response.status).toBe(400)
		expect(mocks.generateImages).not.toHaveBeenCalled()
	})

	it('생성기나 정규화 모델을 사용할 수 없으면 503을 반환한다', async () => {
		mocks.generateImages.mockRejectedValue(namedError('ImageGenerationUnavailableError'))

		const response = await POST(imageRequest({ prompt: 'sample', profileId: 5 }))

		expect(response.status).toBe(503)
	})

	it('공통 생성 한도를 넘으면 재시도 시간을 포함한 429를 반환한다', async () => {
		mocks.generateImages.mockRejectedValue(
			Object.assign(namedError('ImageGenerationLimitError'), { retryAfterSeconds: 12 }),
		)

		const response = await POST(imageRequest({ prompt: 'sample', profileId: 5 }))

		expect(response.status).toBe(429)
		expect(response.headers.get('Retry-After')).toBe('12')
	})

	it('유효한 입력과 사용자를 서비스에 전달하고 실제 모델을 반환한다', async () => {
		const response = await POST(imageRequest({ prompt: '  sample  ', profileId: 5, count: 1 }))

		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({
			aspectRatio: '1:1',
			generatedImages: [
				{
					collection: 'generated-images',
					createdAt: '2026-07-31T03:00:00.000Z',
					id: 8,
					url: '/api/generated-images/file/generated.png',
				},
			],
			images: ['/api/generated-images/file/generated.png'],
			imageSize: '1K',
			model: 'gpt-image-2',
			prompt: 'sample',
		})
		expect(mocks.generateImages).toHaveBeenCalledWith({
			userInput: 'sample',
			count: 1,
			profileId: 5,
			// 이 라우트의 사용량은 언제나 이미지 스튜디오로 집계된다.
			studio: 'image',
			user: { id: 1 },
		})
	})

	it('슬롯 비율 오버라이드를 서비스에 그대로 전달한다', async () => {
		const response = await POST(
			imageRequest({ prompt: 'sample', profileId: 5, count: 1, aspectRatio: '16:9' }),
		)

		expect(response.status).toBe(200)
		expect(mocks.generateImages).toHaveBeenCalledWith({
			userInput: 'sample',
			count: 1,
			profileId: 5,
			aspectRatio: '16:9',
			// 이 라우트의 사용량은 언제나 이미지 스튜디오로 집계된다.
			studio: 'image',
			user: { id: 1 },
		})
	})

	it('해상도 오버라이드를 서비스에 그대로 전달한다', async () => {
		const response = await POST(
			imageRequest({ prompt: 'sample', profileId: 5, count: 1, imageSize: '4K' }),
		)

		expect(response.status).toBe(200)
		expect(mocks.generateImages).toHaveBeenCalledWith({
			userInput: 'sample',
			count: 1,
			profileId: 5,
			imageSize: '4K',
			// 이 라우트의 사용량은 언제나 이미지 스튜디오로 집계된다.
			studio: 'image',
			user: { id: 1 },
		})
	})

	it('모델이 지원하지 않는 해상도 오버라이드는 400으로 매핑한다', async () => {
		mocks.generateImages.mockRejectedValue(namedError('UnsupportedImageOutputSizeError'))

		const response = await POST(
			imageRequest({ prompt: 'sample', profileId: 5, imageSize: '4K' }),
		)

		expect(response.status).toBe(400)
	})

	it('프로파일 Controller가 거부한 입력은 400으로 매핑한다', async () => {
		mocks.generateImages.mockRejectedValue(namedError('InvalidImageControllerInputError'))

		const response = await POST(imageRequest({ prompt: 'sample', profileId: 5 }))

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			message: '이미지 프로파일이 허용하지 않는 생성 옵션입니다.',
		})
	})

	it('published 프로파일이 없으면 404를 반환한다', async () => {
		mocks.generateImages.mockRejectedValue(namedError('ImageProfileNotFoundError'))

		const response = await POST(imageRequest({ prompt: 'sample', profileId: 404 }))

		expect(response.status).toBe(404)
	})

	it('시드 이미지 오류를 카메라 route가 아니어도 400으로 매핑한다', async () => {
		mocks.generateImages.mockRejectedValue(namedError('InvalidSeedImageError'))

		const response = await POST(imageRequest({ prompt: 'sample', profileId: 5 }))

		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({ message: 'Invalid seed image.' })
	})

	it('참조와 카메라 값을 서비스로 넘긴다', async () => {
		const response = await POST(
			imageRequest({
				profileId: 5,
				reference: { generatedImageId: 8 },
				camera: { azimuthDeg: 45, elevationDeg: 20 },
			}),
		)

		expect(response.status).toBe(200)
		expect(mocks.generateImages).toHaveBeenCalledWith(
			expect.objectContaining({
				userInput: '',
				camera: { azimuthDeg: 45, elevationDeg: 20 },
				reference: {
					generatedImageId: 8,
					requestUrl: 'http://localhost/api/generate-image',
				},
			}),
		)
	})

	it('프롬프트도 참조도 없으면 400으로 거부한다', async () => {
		const response = await POST(imageRequest({ profileId: 5 }))

		expect(response.status).toBe(400)
		expect(mocks.generateImages).not.toHaveBeenCalled()
	})

	it('첨부 참조는 주소 없이 그대로 넘긴다 — 본문에 이미 들어 있다', async () => {
		const response = await POST(
			imageRequest({
				prompt: 'sample',
				profileId: 5,
				reference: { upload: 'data:image/png;base64,AAAA' },
			}),
		)

		expect(response.status).toBe(200)
		expect(mocks.generateImages).toHaveBeenCalledWith(
			expect.objectContaining({
				reference: { upload: 'data:image/png;base64,AAAA' },
			}),
		)
	})

	it('변환 후 첨부 상한을 넘는 본문은 모델 호출 전에 거부한다', async () => {
		const response = await POST(
			imageRequest({
				profileId: 5,
				prompt: '제품',
				reference: { upload: `data:image/webp;base64,${'A'.repeat(1_334_000)}` },
			}),
		)
		expect(response.status).toBe(400)
		expect(mocks.generateImages).not.toHaveBeenCalled()
	})

	it('첨부만 보내고 프롬프트를 비우면 400으로 거부한다 — 첨부는 프롬프트를 물려주지 않는다', async () => {
		const response = await POST(
			imageRequest({ profileId: 5, reference: { upload: 'data:image/png;base64,AAAA' } }),
		)

		expect(response.status).toBe(400)
		expect(mocks.generateImages).not.toHaveBeenCalled()
	})
})
