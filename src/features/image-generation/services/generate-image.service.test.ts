import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	env: {
		GEMINI_API_KEY: undefined as string | undefined,
		NODE_ENV: 'test' as 'development' | 'production' | 'test',
		OPENAI_API_KEY: undefined as string | undefined,
	},
	acquireImageGenerationSlot: vi.fn(),
	findPublishedImageProfile: vi.fn(),
	generateBrandImages: vi.fn(),
	normalizeImageProfilePrompt: vi.fn(),
	releaseImageGenerationSlot: vi.fn(),
	resolveGeneratedImageReference: vi.fn(),
	storeGeneratedImages: vi.fn(),
}))

vi.mock('@/env', () => ({ env: mocks.env }))
vi.mock('@/features/image-generation/image-generation-gate', () => ({
	// 게이트 창 상태는 게이트 단위 테스트가 검증한다 — 여기서는 서비스 연결(획득·해제 순서)만 본다.
	acquireImageGenerationSlot: mocks.acquireImageGenerationSlot,
	ImageGenerationLimitError: class extends Error {},
}))
vi.mock(
	'@/features/image-generation/repositories/image-generation.ai.repository',
	async (importOriginal) => ({
		// 프리셋 표의 실제 API 키 조회(getImageModelApiKey)는 그대로 두고 모델 호출만 대체한다.
		...(await importOriginal<
			typeof import('@/features/image-generation/repositories/image-generation.ai.repository')
		>()),
		generateBrandImages: mocks.generateBrandImages,
	}),
)
vi.mock('@/features/image-generation/repositories/image-profile.payload.repository', () => ({
	findPublishedImageProfile: mocks.findPublishedImageProfile,
}))
vi.mock('@/features/image-generation/repositories/generated-image.payload.repository', () => ({
	resolveGeneratedImageReference: mocks.resolveGeneratedImageReference,
	storeGeneratedImages: mocks.storeGeneratedImages,
}))
vi.mock('@/features/image-generation/services/normalize-image-profile-prompt.service', () => ({
	ImageGenerationUnavailableError: class extends Error {},
	normalizeImageProfilePrompt: mocks.normalizeImageProfilePrompt,
}))

import {
	generateImages,
	generateImagesWithSettings,
	ImageGenerationUnavailableError,
	ImageProfileNotFoundError,
	InvalidImageControllerInputError,
	InvalidSeedImageError,
	planImageGenerationFromProfile,
	planImageGenerationFromSettings,
	UnsupportedImageOutputSizeError,
} from './generate-image.service'

// 실제 1x1 PNG — 첨부 검증(sharp)이 모의가 아니라 진짜로 형식을 읽는지 falsifiable하게 둔다.
const ONE_PIXEL_PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const ONE_PIXEL_PNG = `data:image/png;base64,${ONE_PIXEL_PNG_BASE64}`
const ONE_PIXEL_PNG_BYTES = Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64')

describe('generateImages', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.env.NODE_ENV = 'test'
		mocks.env.GEMINI_API_KEY = undefined
		mocks.env.OPENAI_API_KEY = undefined
		mocks.acquireImageGenerationSlot.mockReturnValue(mocks.releaseImageGenerationSlot)
		mocks.findPublishedImageProfile.mockResolvedValue(null)
		mocks.resolveGeneratedImageReference.mockResolvedValue(null)
		mocks.storeGeneratedImages.mockResolvedValue([
			{
				collection: 'generated-images',
				createdAt: '2026-07-31T03:00:00.000Z',
				id: 8,
				url: '/api/generated-images/file/generated.png',
			},
		])
	})

	it('fails closed when no image provider is configured', async () => {
		await expect(
			generateImagesWithSettings({
				userInput: 'sample',
				count: 1,
				aspectRatio: '1:1',
				imageModelPreset: 'openai-gpt-image-2',
				imageSize: '1K',
				user: { id: 1 },
			}),
		).rejects.toBeInstanceOf(ImageGenerationUnavailableError)
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
		expect(mocks.acquireImageGenerationSlot).not.toHaveBeenCalled()
	})

	it('prefers the configured OpenAI provider', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,openai'],
			model: 'gpt-image-2',
			provider: 'openai',
		})

		await generateImagesWithSettings({
			userInput: 'sample',
			count: 1,
			aspectRatio: '1:1',
			imageModelPreset: 'openai-gpt-image-2',
			imageSize: '1K',
			user: { id: 1 },
		})

		expect(mocks.generateBrandImages).toHaveBeenCalledWith({
			prompt: 'sample',
			count: 1,
			modelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '1K',
		})
	})

	it('published 프로파일을 정규화해 저장된 출력 계약으로 생성한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			controllerRestrictions: {
				controls: [
					{ controlId: 'ratio', defaultValue: '3:2' },
					{ controlId: 'resolution', defaultValue: '2K' },
				],
			},
			profilePrompt: [{ key: 'style', value: 'minimalist' }],
			userPromptNormalization: [{ key: 'mood', candidates: [{ value: 'organic' }] }],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { style: 'minimalist', mood: 'organic', subject: '파란 세럼병' },
			normalizedInput: { mood: 'organic' },
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,profile'],
			model: 'gpt-image-2',
			provider: 'openai',
		})
		const user = { id: 1 }

		await expect(
			generateImages({
				userInput: '파란 세럼병',
				profileId: 5,
				user,
				count: 2,
			}),
		).resolves.toEqual({
			aspectRatio: '3:2',
			generatedImages: [
				{
					collection: 'generated-images',
					createdAt: '2026-07-31T03:00:00.000Z',
					id: 8,
					url: '/api/generated-images/file/generated.png',
				},
			],
			images: ['/api/generated-images/file/generated.png'],
			imageSize: '2K',
			model: 'gpt-image-2',
			prompt: JSON.stringify({
				style: 'minimalist',
				mood: 'organic',
				subject: '파란 세럼병',
			}),
			profileId: 5,
			profileName: 'Technical Illustration',
			provider: 'openai',
		})
		expect(mocks.findPublishedImageProfile).toHaveBeenCalledWith(user, 5)
		expect(mocks.normalizeImageProfilePrompt).toHaveBeenCalledWith({
			profilePrompt: [{ key: 'style', value: 'minimalist' }],
			userPromptNormalization: [{ key: 'mood', candidates: [{ value: 'organic' }] }],
			userPrompt: '파란 세럼병',
		})
		expect(mocks.generateBrandImages).toHaveBeenCalledWith({
			prompt: JSON.stringify({
				style: 'minimalist',
				mood: 'organic',
				subject: '파란 세럼병',
			}),
			count: 2,
			modelPreset: 'openai-gpt-image-2',
			aspectRatio: '3:2',
			imageSize: '2K',
		})
		expect(mocks.storeGeneratedImages).toHaveBeenCalledWith({
			createdBy: 1,
			effectivePrompt: JSON.stringify({
				style: 'minimalist',
				mood: 'organic',
				subject: '파란 세럼병',
			}),
			images: ['data:image/png;base64,profile'],
			inputPrompt: '파란 세럼병',
			model: 'gpt-image-2',
			profile: expect.objectContaining({
				aspectRatio: '3:2',
				id: 5,
				imageSize: '2K',
				name: 'Technical Illustration',
			}),
		})
		// 참조 없는 생성은 sourceImage를 기록하지 않는다.
		expect(mocks.storeGeneratedImages).toHaveBeenCalledWith(
			expect.not.objectContaining({ sourceImage: expect.anything() }),
		)
	})

	it('슬롯 비율 오버라이드는 프로파일 비율 대신 모델 호출에 반영된다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '2:3',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { subject: '파란 세럼병' },
			normalizedInput: {},
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,profile'],
			model: 'gpt-image-2',
			provider: 'openai',
		})

		const result = await generateImages({
			userInput: '파란 세럼병',
			profileId: 5,
			user: { id: 1 },
			count: 1,
			aspectRatio: '16:9',
		})

		expect(mocks.generateBrandImages).toHaveBeenCalledWith(
			expect.objectContaining({ aspectRatio: '16:9', imageSize: '1K' }),
		)
		expect(result.aspectRatio).toBe('16:9')
		// 저장 메타데이터도 프로파일 비율(2:3)이 아니라 실제 생성 비율을 기록해야 한다.
		expect(mocks.storeGeneratedImages).toHaveBeenCalledWith(
			expect.objectContaining({
				profile: expect.objectContaining({ aspectRatio: '16:9' }),
			}),
		)
	})

	it('해상도 오버라이드는 프로파일 해상도 대신 모델 호출에 반영된다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '2:3',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { subject: '파란 세럼병' },
			normalizedInput: {},
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,profile'],
			model: 'gpt-image-2',
			provider: 'openai',
		})

		const result = await generateImages({
			userInput: '파란 세럼병',
			profileId: 5,
			user: { id: 1 },
			count: 1,
			imageSize: '4K',
		})

		expect(mocks.generateBrandImages).toHaveBeenCalledWith(
			expect.objectContaining({ aspectRatio: '2:3', imageSize: '4K' }),
		)
		expect(result.imageSize).toBe('4K')
		// 저장 메타데이터도 프로파일 해상도(1K)가 아니라 실제 생성 해상도를 기록해야 한다.
		expect(mocks.storeGeneratedImages).toHaveBeenCalledWith(
			expect.objectContaining({
				profile: expect.objectContaining({ imageSize: '4K' }),
			}),
		)
	})

	it('프로파일 Controller가 허용하지 않는 해상도 오버라이드는 호출 전에 거부한다', async () => {
		mocks.env.GEMINI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			features: [{ blockType: 'cameraControl' }],
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { subject: '굴착기' },
			normalizedInput: {},
		})

		const generation = generateImages({
			userInput: '굴착기',
			profileId: 5,
			user: { id: 1 },
			count: 1,
			imageSize: '4K',
		})
		await expect(generation).rejects.toBeInstanceOf(InvalidImageControllerInputError)
		await expect(generation).rejects.toThrow('resolution')
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
		expect(mocks.storeGeneratedImages).not.toHaveBeenCalled()
	})

	it('published prompt maxLength를 정규화 전에 강제한다', async () => {
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			slug: 'technical',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '2:3',
			imageSize: '1K',
			controllerRestrictions: {
				controls: [{ controlId: 'prompt', maxLength: 3 }],
			},
			profilePrompt: [],
			userPromptNormalization: [],
		})

		await expect(
			generateImages({
				userInput: '1234',
				profileId: 5,
				user: { id: 1 },
				count: 1,
			}),
		).rejects.toBeInstanceOf(InvalidImageControllerInputError)
		expect(mocks.normalizeImageProfilePrompt).not.toHaveBeenCalled()
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
	})

	it('저장된 Controller의 options와 readonly를 정규화 전에 강제한다', async () => {
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			slug: 'technical',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '2:3',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
			controllerRestrictions: storedRestrictions(),
		})

		await expect(
			generateImages({
				userInput: '제품',
				profileId: 5,
				user: { id: 1 },
				count: 1,
			}),
		).rejects.toThrow('batch')
		await expect(
			generateImages({
				userInput: '제품',
				profileId: 5,
				user: { id: 1 },
				count: 2,
				aspectRatio: '16:9',
			}),
		).rejects.toThrow('ratio')
		expect(mocks.normalizeImageProfilePrompt).not.toHaveBeenCalled()
	})

	it('Nano Banana 프로파일은 Google 키와 16:9 계약을 사용한다', async () => {
		mocks.env.GEMINI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'google-nano-banana-2-lite',
			controllerRestrictions: {
				controls: [{ controlId: 'ratio', defaultValue: '16:9' }],
			},
			profilePrompt: [{ key: 'style', value: 'technical' }],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { style: 'technical', subject: '굴착기' },
			normalizedInput: {},
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,google'],
			model: 'gemini-3.1-flash-lite-image',
			provider: 'google',
		})

		await generateImages({
			userInput: '굴착기',
			profileId: 5,
			user: { id: 1 },
			count: 2,
		})

		expect(mocks.generateBrandImages).toHaveBeenCalledWith({
			prompt: JSON.stringify({ style: 'technical', subject: '굴착기' }),
			count: 2,
			modelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
		})
	})

	it('Admin 생성 테스트의 저장 전 모델과 크기를 사용한다', async () => {
		mocks.env.GEMINI_API_KEY = 'key'
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,google'],
			model: 'gemini-3.1-flash-lite-image',
			provider: 'google',
		})

		await generateImagesWithSettings({
			userInput: 'technical excavator',
			count: 1,
			aspectRatio: '16:9',
			imageModelPreset: 'google-nano-banana-2-lite',
			imageSize: '1K',
			user: { id: 1 },
		})

		expect(mocks.findPublishedImageProfile).not.toHaveBeenCalled()
		expect(mocks.generateBrandImages).toHaveBeenCalledWith({
			prompt: 'technical excavator',
			count: 1,
			modelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
		})
	})

	it('Nano Banana 2 Lite의 2K 출력을 호출 전에 타입 있는 오류로 거부한다', async () => {
		mocks.env.GEMINI_API_KEY = 'key'

		const generation = generateImagesWithSettings({
			userInput: 'technical excavator',
			count: 1,
			aspectRatio: '16:9',
			imageModelPreset: 'google-nano-banana-2-lite',
			imageSize: '2K',
			user: { id: 1 },
		})
		await expect(generation).rejects.toBeInstanceOf(UnsupportedImageOutputSizeError)
		await expect(generation).rejects.toThrow('does not support 2K')
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
		expect(mocks.acquireImageGenerationSlot).not.toHaveBeenCalled()
	})

	it('Google 키가 없는 Nano Banana 프로파일은 다른 모델로 보내지 않는다', async () => {
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			features: [{ blockType: 'cameraControl' }],
			profilePrompt: [{ key: 'style', value: 'technical' }],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { style: 'technical', subject: '굴착기' },
			normalizedInput: {},
		})

		await expect(
			generateImages({
				userInput: '굴착기',
				profileId: 5,
				user: { id: 1 },
				count: 1,
			}),
		).rejects.toBeInstanceOf(ImageGenerationUnavailableError)
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
	})

	it('published 프로파일이 없으면 생성기를 호출하지 않는다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'

		await expect(
			generateImages({
				userInput: 'sample',
				profileId: 404,
				user: { id: 1 },
				count: 1,
			}),
		).rejects.toBeInstanceOf(ImageProfileNotFoundError)
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
	})

	it('모델 호출 전에 사용자 ID로 생성 게이트를 획득하고 성공 후 해제한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,openai'],
			model: 'gpt-image-2',
			provider: 'openai',
		})

		await generateImagesWithSettings({
			userInput: 'sample',
			count: 1,
			aspectRatio: '1:1',
			imageModelPreset: 'openai-gpt-image-2',
			imageSize: '1K',
			user: { id: 7 },
		})

		expect(mocks.acquireImageGenerationSlot).toHaveBeenCalledWith(7)
		expect(mocks.acquireImageGenerationSlot.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.generateBrandImages.mock.invocationCallOrder[0] ?? 0,
		)
		expect(mocks.releaseImageGenerationSlot).toHaveBeenCalledOnce()
	})

	it('모델 호출이 실패해도 동시 실행 슬롯을 해제한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.generateBrandImages.mockRejectedValue(new Error('provider down'))

		await expect(
			generateImagesWithSettings({
				userInput: 'sample',
				count: 1,
				aspectRatio: '1:1',
				imageModelPreset: 'openai-gpt-image-2',
				imageSize: '1K',
				user: { id: 1 },
			}),
		).rejects.toThrow('provider down')
		expect(mocks.releaseImageGenerationSlot).toHaveBeenCalledOnce()
	})

	it('게이트가 한도 초과를 던지면 모델을 호출하지 않고 그대로 전파한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.acquireImageGenerationSlot.mockImplementation(() => {
			throw new Error('limit reached')
		})

		await expect(
			generateImagesWithSettings({
				userInput: 'sample',
				count: 1,
				aspectRatio: '1:1',
				imageModelPreset: 'openai-gpt-image-2',
				imageSize: '1K',
				user: { id: 1 },
			}),
		).rejects.toThrow('limit reached')
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
	})

	it('참조가 있으면 생성 플랜의 seedImage로 넘긴다', async () => {
		mocks.env.GEMINI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { subject: '유조선' },
			normalizedInput: {},
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,seeded'],
			model: 'gemini-3.1-flash-lite-image',
			provider: 'google',
		})
		// 참조 fixture를 사용자 프롬프트와 다른 값으로 둔다 — 우선순위(사용자가 이김)가 falsifiable하도록.
		mocks.resolveGeneratedImageReference.mockResolvedValue({
			data: Buffer.from('seed'),
			generatedImageId: 8,
			prompt: { effective: '{"subject":"화물선"}', input: '화물선' },
		})

		await generateImages({
			userInput: '유조선',
			profileId: 5,
			user: { id: 1 },
			count: 1,
			reference: { generatedImageId: 8, requestUrl: 'http://localhost/api/generate-image' },
		})

		// expect.any(Uint8Array)는 jsdom 테스트 환경에서 Buffer와 realm이 갈려 instanceof가 어긋난다 —
		// 바이트를 펼쳐 비교한다.
		const [call] = mocks.generateBrandImages.mock.calls[0]
		expect([...call.seedImage]).toEqual([...Buffer.from('seed')])
		expect(mocks.storeGeneratedImages).toHaveBeenCalledWith(
			expect.objectContaining({
				effectivePrompt: '{"subject":"유조선"}',
				inputPrompt: '유조선',
				sourceImage: 8,
			}),
		)
	})

	it('프롬프트를 비우고 참조만 보내면 참조의 프롬프트를 물려받는다', async () => {
		mocks.env.GEMINI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,seeded'],
			model: 'gemini-3.1-flash-lite-image',
			provider: 'google',
		})
		mocks.resolveGeneratedImageReference.mockResolvedValue({
			data: Buffer.from('seed'),
			generatedImageId: 8,
			prompt: { effective: '{"subject":"유조선"}', input: '유조선' },
		})

		await generateImages({
			userInput: '',
			profileId: 5,
			user: { id: 1 },
			count: 1,
			reference: { generatedImageId: 8, requestUrl: 'http://localhost/api/generate-image' },
		})

		// 사용자 입력이 없으므로 정규화 모델을 부르지 않는다.
		expect(mocks.normalizeImageProfilePrompt).not.toHaveBeenCalled()
		expect(mocks.storeGeneratedImages).toHaveBeenCalledWith(
			expect.objectContaining({
				effectivePrompt: '{"subject":"유조선"}',
				inputPrompt: '유조선',
			}),
		)
	})

	it('참조도 프롬프트도 없으면 컨트롤러 입력 오류로 거부한다', async () => {
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
		})

		await expect(
			generateImages({ userInput: '', profileId: 5, user: { id: 1 }, count: 1 }),
		).rejects.toThrow('rejected prompt')
	})

	it('해석할 수 없는 참조는 하드 거부하고 조용히 프롬프트만으로 흘러가지 않는다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
		})
		// 남의 생성 이미지 id를 참조로 보낸 경우를 흉내낸다 — 저장소 4중 where가 걸러 null을 돌려준다.
		mocks.resolveGeneratedImageReference.mockResolvedValue(null)

		await expect(
			generateImages({
				userInput: '유조선',
				profileId: 5,
				user: { id: 1 },
				count: 1,
				reference: {
					generatedImageId: 999,
					requestUrl: 'http://localhost/api/generate-image',
				},
			}),
		).rejects.toBeInstanceOf(InvalidSeedImageError)
		// 하드 거부의 실질: null이 조용히 프롬프트-only 생성으로 흘러가지 않는다.
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
	})

	it('프로파일이 첨부를 열지 않았으면 업로드 참조를 거부한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
			features: [],
		})

		await expect(
			generateImages({
				userInput: '유조선',
				profileId: 5,
				user: { id: 1 },
				count: 1,
				reference: { upload: ONE_PIXEL_PNG },
			}),
		).rejects.toBeInstanceOf(InvalidImageControllerInputError)
		// 거부는 유료 호출보다 앞선다 — 정규화도 모델도 부르지 않는다.
		expect(mocks.normalizeImageProfilePrompt).not.toHaveBeenCalled()
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
	})

	it('첨부한 참조는 시드로 쓰지만 저장하지 않으므로 sourceImage를 남기지 않는다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
			features: [{ blockType: 'referenceImage' }],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { subject: '유조선' },
			normalizedInput: {},
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,seeded'],
			model: 'gpt-image-2',
			provider: 'openai',
		})

		await generateImages({
			userInput: '유조선',
			profileId: 5,
			user: { id: 1 },
			count: 1,
			reference: { upload: ONE_PIXEL_PNG },
		})

		// 저장된 생성 결과를 다시 받아 오는 경로를 타지 않는다 — 첨부는 본문에 이미 들어 있다.
		expect(mocks.resolveGeneratedImageReference).not.toHaveBeenCalled()
		const [call] = mocks.generateBrandImages.mock.calls[0]
		expect([...call.seedImage]).toEqual([...ONE_PIXEL_PNG_BYTES])
		expect(mocks.storeGeneratedImages).toHaveBeenCalledWith(
			expect.not.objectContaining({ sourceImage: expect.anything() }),
		)
	})

	it('첨부 data URI가 실제 이미지가 아니면 시드 오류로 거부한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
			features: [{ blockType: 'referenceImage' }],
		})

		await expect(
			generateImages({
				userInput: '유조선',
				profileId: 5,
				user: { id: 1 },
				count: 1,
				// MIME은 png라고 주장하지만 내용은 이미지가 아니다 — sharp가 잡는다.
				reference: {
					upload: `data:image/png;base64,${Buffer.from('nope').toString('base64')}`,
				},
			}),
		).rejects.toBeInstanceOf(InvalidSeedImageError)
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
	})

	it('프로파일이 카메라 feature를 열지 않았는데 camera 값을 보내면 거부한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Flat Graphic',
			slug: 'flat-graphic',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '1K',
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { subject: '유조선' },
			normalizedInput: {},
		})

		await expect(
			generateImages({
				userInput: '유조선',
				profileId: 5,
				user: { id: 1 },
				count: 1,
				camera: { azimuthDeg: 0, elevationDeg: 0 },
			}),
		).rejects.toBeInstanceOf(InvalidImageControllerInputError)
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
		// 카메라 신뢰 경계 검증이 참조 다운로드·유료 정규화 호출보다 먼저 거부해야 한다(회귀 방지).
		expect(mocks.resolveGeneratedImageReference).not.toHaveBeenCalled()
		expect(mocks.normalizeImageProfilePrompt).not.toHaveBeenCalled()
	})

	it('feature는 열렸지만 azimuthDeg가 허용 구간 밖이면 거부한다', async () => {
		mocks.env.OPENAI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '1K',
			features: [
				{ blockType: 'cameraControl', azimuths: ['front'], elevations: ['eye-level'] },
			],
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.normalizeImageProfilePrompt.mockResolvedValue({
			finalPrompt: { subject: '유조선' },
			normalizedInput: {},
		})

		await expect(
			generateImages({
				userInput: '유조선',
				profileId: 5,
				user: { id: 1 },
				count: 1,
				camera: { azimuthDeg: 90, elevationDeg: 0 },
			}),
		).rejects.toBeInstanceOf(InvalidImageControllerInputError)
		expect(mocks.generateBrandImages).not.toHaveBeenCalled()
		// 카메라 신뢰 경계 검증이 참조 다운로드·유료 정규화 호출보다 먼저 거부해야 한다(회귀 방지).
		expect(mocks.resolveGeneratedImageReference).not.toHaveBeenCalled()
		expect(mocks.normalizeImageProfilePrompt).not.toHaveBeenCalled()
	})

	it('카메라 값을 주면 프롬프트에 각도 키를 얹는다', async () => {
		mocks.env.GEMINI_API_KEY = 'key'
		mocks.findPublishedImageProfile.mockResolvedValue({
			id: 5,
			name: 'Technical Illustration',
			imageModelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			features: [{ blockType: 'cameraControl' }],
			profilePrompt: [],
			userPromptNormalization: [],
		})
		mocks.generateBrandImages.mockResolvedValue({
			images: ['data:image/png;base64,seeded'],
			model: 'gemini-3.1-flash-lite-image',
			provider: 'google',
		})
		mocks.resolveGeneratedImageReference.mockResolvedValue({
			data: Buffer.from('seed'),
			generatedImageId: 8,
			prompt: { effective: '{"subject":"유조선"}', input: '유조선' },
		})

		await generateImages({
			userInput: '',
			profileId: 5,
			user: { id: 1 },
			count: 1,
			camera: { azimuthDeg: 90, elevationDeg: 0 },
			reference: { generatedImageId: 8, requestUrl: 'http://localhost/api/generate-image' },
		})

		const [plan] = mocks.generateBrandImages.mock.calls[0]
		expect(JSON.parse(plan.prompt)).toMatchObject({
			subject: '유조선',
			camera: expect.stringContaining('right side view'),
		})
	})
})

describe('image generation plan resolvers', () => {
	it('published 프로파일의 모델·출력 계약을 생성 플랜으로 해석한다', () => {
		const seedImage = new Uint8Array([137, 80, 78, 71])

		expect(
			planImageGenerationFromProfile(
				{
					id: 5,
					imageModelPreset: 'google-nano-banana-2-lite',
					name: 'Technical Illustration',
				},
				{
					prompt: '{"subject":"굴착기"}',
					count: 2,
					aspectRatio: '16:9',
					imageSize: '1K',
					seedImage,
				},
			),
		).toEqual({
			prompt: '{"subject":"굴착기"}',
			count: 2,
			modelPreset: 'google-nano-banana-2-lite',
			aspectRatio: '16:9',
			imageSize: '1K',
			profileId: 5,
			profileName: 'Technical Illustration',
			seedImage,
		})
	})

	it('해석된 Effective 비율과 해상도를 플랜에 쓴다', () => {
		expect(
			planImageGenerationFromProfile(
				{
					id: 5,
					imageModelPreset: 'openai-gpt-image-2',
					name: 'Technical Illustration',
				},
				{
					prompt: '{"subject":"굴착기"}',
					count: 1,
					aspectRatio: '16:9',
					imageSize: '1K',
				},
			),
		).toMatchObject({ aspectRatio: '16:9', imageSize: '1K' })
	})

	it('명시 설정은 프롬프트를 trim해 프로파일 없는 플랜으로 해석한다', () => {
		expect(
			planImageGenerationFromSettings({
				userInput: '  technical excavator  ',
				count: 1,
				imageModelPreset: 'openai-gpt-image-2',
				aspectRatio: '1:1',
				imageSize: '2K',
			}),
		).toEqual({
			prompt: 'technical excavator',
			count: 1,
			modelPreset: 'openai-gpt-image-2',
			aspectRatio: '1:1',
			imageSize: '2K',
		})
	})
})

function storedRestrictions() {
	return {
		controls: [
			{
				controlId: 'batch',
				optionValues: ['1', '2'],
				defaultValue: '2',
				availability: 'readonly',
			},
			{
				controlId: 'ratio',
				optionValues: ['2:3', '16:9'],
				defaultValue: '2:3',
				availability: 'readonly',
			},
			{
				controlId: 'resolution',
				optionValues: ['1K', '2K'],
				defaultValue: '1K',
				availability: 'disabled',
			},
		],
	}
}
