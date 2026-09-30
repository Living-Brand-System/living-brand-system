import {
	type FlatImagePrompt,
	type ImageProfilePromptRow,
	type ImagePromptNormalizationRow,
	mergeImageProfilePrompt,
} from '@/features/image-generation/domain/image-profile-prompt'
import { normalizeImagePromptWithAi } from '@/features/image-generation/repositories/image-prompt-normalization.ai.repository'
import type { AiUsageTokens } from '@/modules/ai-usage/ai-usage'

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
