import type { AiUsage } from '@/features/asset-check/checkers/types'
import { recordAiUsage } from '@/modules/ai-usage/repositories/ai-usage.payload.repository'
import type { User } from '@/payload-types'

/**
 * 검수 1회가 부른 모델들의 사용량을 계정별 집계에 남긴다.
 * 모델마다 단가가 다르므로 그룹별로 한 행씩 남기고, 세션 문서에 남는 합산본과는 별개다.
 */
export async function recordCheckAiUsage(
	usages: readonly AiUsage[] | undefined,
	user: User,
	checkSessionId: number,
): Promise<void> {
	for (const usage of usages ?? []) {
		await recordAiUsage({
			createdBy: user.id,
			feature: 'asset-check',
			// 검수는 review 스튜디오에서만 들어온다 — 호출자가 하나뿐이라 여기서 못박는다.
			studio: 'review',
			model: usage.model,
			inputTokens: usage.inputTokens,
			outputTokens: usage.outputTokens,
			totalTokens: usage.totalTokens,
			cacheReadInputTokens: usage.cacheReadInputTokens,
			cacheWriteInputTokens: usage.cacheWriteInputTokens,
			reasoningTokens: usage.reasoningTokens,
			source: { relationTo: 'check-sessions', value: checkSessionId },
		})
	}
}
