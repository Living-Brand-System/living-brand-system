import {
	type FlatImagePrompt,
	type ImageProfilePromptRow,
	type ImagePromptNormalizationRow,
	mergeImageProfilePrompt,
} from '@/features/image-generation/domain/image-profile-prompt'
import { normalizeImagePromptWithAi } from '@/features/image-generation/repositories/image-prompt-normalization.ai.repository'
import type { AiUsageTokens } from '@/modules/ai-usage/ai-usage'
import { recordAiUsage } from '@/modules/ai-usage/repositories/ai-usage.payload.repository'
import { assertWithinTokenLimit } from '@/modules/ai-usage/services/token-limit.service'

/** Provider·정규화 모델 미설정을 route/agent 표면이 일반 생성 실패와 구분하기 위한 서비스 오류. */
export class ImageGenerationUnavailableError extends Error {
	constructor() {
		super('Image generation is not configured.')
		this.name = 'ImageGenerationUnavailableError'
	}
}

/**
 * 유스케이스 경계: 임의 사용자 프롬프트를 관리자가 정한 후보로 정규화하고 flat JSON을 만든다.
 * 모델 호출 I/O는 image-prompt-normalization AI repository가 소유한다.
 */
export async function normalizeImageProfilePrompt({
	profilePrompt,
	userPromptNormalization,
	userPrompt,
}: {
	profilePrompt: ImageProfilePromptRow[]
	userPromptNormalization: ImagePromptNormalizationRow[]
	userPrompt: string
}): Promise<{
	finalPrompt: FlatImagePrompt
	normalizedInput: FlatImagePrompt
	/** 정규화에 모델을 쓴 경우에만 있다 — 후보 표가 비면 호출 자체가 없다. */
	usage?: { model: string; tokens: AiUsageTokens }
}> {
	const normalized =
		userPromptNormalization.length === 0
			? { prompt: {} as FlatImagePrompt, usage: undefined }
			: await normalizeImagePromptWithAi(userPrompt, userPromptNormalization)
	if (!normalized) throw new ImageGenerationUnavailableError()
	const normalizedInput = normalized.prompt

	return {
		normalizedInput,
		...(normalized.usage
			? { usage: { model: normalized.model, tokens: normalized.usage } }
			: {}),
		finalPrompt: mergeImageProfilePrompt(
			profilePrompt,
			normalizedInput,
			userPromptNormalization.length === 0 ? userPrompt : undefined,
		),
	}
}

/**
 * 관리자 프로파일 테스트 패널의 정규화 미리보기 — 이미지 생성 밖에서 모델을 단독으로 부르므로
 * 토큰 한도와 사용량 기록을 여기서 맡는다(이미지 생성 경로는 `generate-image.service`가 맡는다).
 */
export async function previewImageProfilePrompt(
	input: Parameters<typeof normalizeImageProfilePrompt>[0],
	userId: number,
) {
	await assertWithinTokenLimit(userId)
	const result = await normalizeImageProfilePrompt(input)
	if (result.usage) {
		await recordAiUsage({
			createdBy: userId,
			feature: 'image-generation',
			model: result.usage.model,
			...result.usage.tokens,
		})
	}
	return result
}
