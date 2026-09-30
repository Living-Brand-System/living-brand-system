import { createGoogle } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { generateImage } from 'ai'
import { env } from '@/env'
import {
	GOOGLE_NANO_BANANA_2_LITE_MODEL,
	GOOGLE_NANO_BANANA_2_MODEL,
	type ImageModelPreset,
	OPENAI_GPT_IMAGE_2_MODEL,
} from '@/features/image-generation/domain/image-model'
import {
	type ImageAspectRatio,
	type ImageOutputSize,
	toOpenAIImageSize,
} from '@/features/image-generation/domain/image-size'
import { type AiUsageTokens, sumAiUsageTokens } from '@/modules/ai-usage/ai-usage'

/** 프리셋별 실제 모델 호출 입력 — 시드 이미지는 편집 프롬프트 형태로 이미 합성돼 있다. */
interface ImageProviderCallInput {
	prompt: string | { text: string; images: Uint8Array[] }
	count: number
	aspectRatio: ImageAspectRatio
	imageSize: ImageOutputSize
}

/** 한 프리셋 호출의 결과 — data URI와, provider가 보고한 토큰 사용량. */
interface ProviderImages {
	images: string[]
	usage: AiUsageTokens
}

interface ImageModelProviderEntry {
	apiKey: () => string | undefined
	generate: (input: ImageProviderCallInput) => Promise<ProviderImages>
	model: string
	provider: 'google' | 'openai'
}

/** 프리셋 → {환경 API 키, 모델 id, provider 태그, 실제 호출} 단일 표 — 프리셋 분기는 여기서만 일어난다. */
const imageModelProviders = {
	'google-nano-banana-2-lite': {
		apiKey: () => env.GEMINI_API_KEY,
		model: GOOGLE_NANO_BANANA_2_LITE_MODEL,
		provider: 'google',
		generate: (input) => generateGoogleImages(GOOGLE_NANO_BANANA_2_LITE_MODEL, input),
	},
	'google-nano-banana-2': {
		apiKey: () => env.GEMINI_API_KEY,
		model: GOOGLE_NANO_BANANA_2_MODEL,
		provider: 'google',
		generate: (input) => generateGoogleImages(GOOGLE_NANO_BANANA_2_MODEL, input),
	},
	'openai-gpt-image-2': {
		apiKey: () => env.OPENAI_API_KEY,
		model: OPENAI_GPT_IMAGE_2_MODEL,
		provider: 'openai',
		generate: async ({ prompt, count, aspectRatio, imageSize }) => {
			const { images, usage } = await generateImage({
				model: openai.image(OPENAI_GPT_IMAGE_2_MODEL),
				prompt,
				n: count,
				size: toOpenAIImageSize(aspectRatio, imageSize),
			})
			return {
				images: images.map((image) => `data:${image.mediaType};base64,${image.base64}`),
				usage,
			}
		},
	},
} satisfies Record<ImageModelPreset, ImageModelProviderEntry>

/** 프리셋 표에서 파생된 provider 태그 union — 유일한 선언. */
export type ImageModelProvider = (typeof imageModelProviders)[ImageModelPreset]['provider']

/** 프리셋이 요구하는 환경 API 키를 조회한다 — 서비스의 가용성 판단에 쓰인다. */
export function getImageModelApiKey(modelPreset: ImageModelPreset): string | undefined {
	return imageModelProviders[modelPreset].apiKey()
}

/** 선택된 외부 이미지 모델 호출과 data URI 변환을 소유한다. */
export async function generateBrandImages({
	prompt,
	count,
	modelPreset,
	aspectRatio,
	imageSize,
	seedImage,
}: {
	prompt: string
	count: number
	modelPreset: ImageModelPreset
	aspectRatio: ImageAspectRatio
	imageSize: ImageOutputSize
	seedImage?: Uint8Array
}): Promise<{
	images: string[]
	model: string
	provider: ImageModelProvider
	usage: AiUsageTokens
}> {
	const entry = imageModelProviders[modelPreset]
	const imagePrompt = seedImage ? { text: prompt, images: [seedImage] } : prompt
	const { images, usage } = await entry.generate({
		prompt: imagePrompt,
		count,
		aspectRatio,
		imageSize,
	})

	return {
		images,
		model: entry.model,
		provider: entry.provider,
		usage,
	}
}

async function generateGoogleImages(
	model: string,
	{ prompt, count, aspectRatio, imageSize }: ImageProviderCallInput,
): Promise<ProviderImages> {
	const google = createGoogle({ apiKey: env.GEMINI_API_KEY })
	// 장수만큼 따로 호출하므로 사용량도 장마다 나온다 — 요청 1건의 값으로 합친다.
	const results = await Promise.all(
		Array.from({ length: count }, async () => {
			const { image, usage } = await generateImage({
				model: google.image(model),
				prompt,
				providerOptions: {
					google: {
						imageConfig: { aspectRatio, imageSize },
					},
				},
			})
			return { image: `data:${image.mediaType};base64,${image.base64}`, usage }
		}),
	)
	return {
		images: results.map(({ image }) => image),
		usage: sumAiUsageTokens(results.map(({ usage }) => usage)),
	}
}
