import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	env: {
		GEMINI_API_KEY: 'google-key',
		OPENAI_API_KEY: 'openai-key',
	},
	createGoogle: vi.fn(),
	generateImage: vi.fn(),
	googleImage: vi.fn(),
	openaiImage: vi.fn(),
}))

vi.mock('@/env', () => ({ env: mocks.env }))
vi.mock('ai', () => ({ generateImage: mocks.generateImage }))
vi.mock('@ai-sdk/google', () => ({
	createGoogle: mocks.createGoogle,
}))
vi.mock('@ai-sdk/openai', () => ({
	openai: { image: mocks.openaiImage },
}))

import { generateBrandImages, getImageModelApiKey } from './image-generation.ai.repository'

describe('getImageModelApiKey', () => {
	it('프리셋 표에서 해당 공급자의 환경 API 키를 조회한다', () => {
		expect(getImageModelApiKey('google-nano-banana-2-lite')).toBe('google-key')
		expect(getImageModelApiKey('openai-gpt-image-2')).toBe('openai-key')
	})
})

describe('generateBrandImages', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.createGoogle.mockReturnValue({ image: mocks.googleImage })
		mocks.googleImage.mockReturnValue('google-model')
		mocks.openaiImage.mockReturnValue('openai-model')
		mocks.generateImage.mockResolvedValue({
			image: { base64: 'google', mediaType: 'image/png' },
			usage: { inputTokens: 10, outputTokens: 500, totalTokens: 510 },
		})
	})

	it('Nano Banana 후보 수만큼 16:9 이미지를 직접 생성한다', async () => {
		await expect(
			generateBrandImages({
				prompt: 'technical excavator',
				count: 2,
				modelPreset: 'google-nano-banana-2-lite',
				aspectRatio: '16:9',
				imageSize: '1K',
			}),
		).resolves.toEqual({
			images: ['data:image/png;base64,google', 'data:image/png;base64,google'],
			model: 'gemini-3.1-flash-lite-image',
			provider: 'google',
			// 장마다 따로 호출하므로 요청 1건의 사용량은 장별 합이다.
			usage: {
				inputTokens: 20,
				outputTokens: 1000,
				totalTokens: 1020,
				cacheReadInputTokens: undefined,
				cacheWriteInputTokens: undefined,
				reasoningTokens: undefined,
			},
		})

		expect(mocks.createGoogle).toHaveBeenCalledWith({ apiKey: 'google-key' })
		expect(mocks.googleImage).toHaveBeenCalledWith('gemini-3.1-flash-lite-image')
		expect(mocks.generateImage).toHaveBeenCalledTimes(2)
		expect(mocks.generateImage).toHaveBeenCalledWith({
			model: 'google-model',
			prompt: 'technical excavator',
			providerOptions: {
				google: {
					imageConfig: {
						aspectRatio: '16:9',
						imageSize: '1K',
					},
				},
			},
		})
	})

	it.each([
		'1K',
		'2K',
		'4K',
	] as const)('Nano Banana 2에 %s와 참조 이미지를 전달한다', async (imageSize) => {
		const seedImage = new Uint8Array([137, 80, 78, 71])
		const result = await generateBrandImages({
			prompt: 'excavator',
			count: 1,
			modelPreset: 'google-nano-banana-2',
			aspectRatio: '16:9',
			imageSize,
			seedImage,
		})
		expect(result.model).toBe('gemini-3.1-flash-image')
		expect(mocks.googleImage).toHaveBeenCalledWith('gemini-3.1-flash-image')
		expect(mocks.generateImage).toHaveBeenCalledWith({
			model: 'google-model',
			prompt: { text: 'excavator', images: [seedImage] },
			providerOptions: { google: { imageConfig: { aspectRatio: '16:9', imageSize } } },
		})
	})

	it('gpt-image-2의 16:9 4K 계약을 유효한 픽셀 크기로 변환한다', async () => {
		mocks.generateImage.mockResolvedValueOnce({
			images: [{ base64: 'openai', mediaType: 'image/png' }],
		})

		await generateBrandImages({
			prompt: 'technical excavator',
			count: 1,
			modelPreset: 'openai-gpt-image-2',
			aspectRatio: '16:9',
			imageSize: '4K',
		})

		expect(mocks.generateImage).toHaveBeenCalledWith({
			model: 'openai-model',
			prompt: 'technical excavator',
			n: 1,
			size: '3840x2160',
		})
		expect(mocks.openaiImage).toHaveBeenCalledWith('gpt-image-2')
	})

	it('시드 이미지를 Google 이미지 편집 프롬프트로 전달한다', async () => {
		const seedImage = new Uint8Array([137, 80, 78, 71])

		await generateBrandImages({
			prompt: 'change only the camera viewpoint',
			count: 1,
			modelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			seedImage,
		})

		expect(mocks.generateImage).toHaveBeenCalledWith({
			model: 'google-model',
			prompt: {
				text: 'change only the camera viewpoint',
				images: [seedImage],
			},
			providerOptions: {
				google: {
					imageConfig: {
						aspectRatio: '16:9',
						imageSize: '1K',
					},
				},
			},
		})
	})
})
