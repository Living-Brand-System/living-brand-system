/**
 * AI(heuristic) 검수 판정 조립 — 관측값 스키마와 기준 비교를 소유한다.
 * AI 호출·프롬프트는 ai-check.ai.repository가, 실행 흐름은 run-check.service가 소유하고,
 * 이 파일은 "관측값 → 판정" 순수 계산만 담당한다. deterministic 픽셀 checker(checkers/)가 아니다.
 */
import { z } from 'zod'
import type { AiCheckResult, HeuristicCriterion } from '@/features/asset-check/checkers/types'
import { needsReview } from '@/features/asset-check/domain/needs-review'
import { OBSERVATION_VALUES } from './heuristic-criterion'

// 길이 상한·숫자 범위 제약은 structured output 문법 컴파일 크기를 폭발시켜 뺀다.
// 길이·범위 안내는 프롬프트가 담당하고, 판정은 value(enum·숫자)만 사용한다.
export const presenceObservationSchema = z.strictObject({
	value: z.enum(OBSERVATION_VALUES),
	confidence: z.number(),
	reason: z.string().min(1),
})

export const measureObservationSchema = z.strictObject({
	value: z.union([z.number(), z.enum(['uncertain', 'not_applicable'])]),
	confidence: z.number(),
	reason: z.string().min(1),
})

export type HeuristicObservation =
	| z.infer<typeof presenceObservationSchema>
	| z.infer<typeof measureObservationSchema>

/** AI 관측값을 Check 기준과 비교해 최종 상태를 결정한다. kind와 무관하게 compare 한 곳에서 판정한다. */
export function evaluateHeuristic(
	criteria: readonly HeuristicCriterion[],
	observations: Record<string, HeuristicObservation> | undefined,
): AiCheckResult {
	if (criteria.length === 0) return needsReview('invalid_criteria')
	if (!observations) return needsReview('ai_output_invalid')

	const comparisons = criteria.map((criterion) => {
		const observation = observations[criterion.id]
		if (!observation) return null
		return {
			criterionId: criterion.id,
			question: criterion.question,
			kind: criterion.kind ?? 'presence',
			expected: criterion.expected,
			operator: criterion.kind === 'measure' ? criterion.operator : undefined,
			max: criterion.kind === 'measure' ? criterion.max : undefined,
			unit: criterion.kind === 'measure' ? criterion.unit : undefined,
			actual: observation.value,
			confidence: observation.confidence,
			reason: observation.reason,
			satisfied:
				observation.value === 'uncertain' || observation.value === 'not_applicable'
					? null
					: compare(criterion, observation.value),
		}
	})
	if (comparisons.some((comparison) => comparison === null)) {
		return needsReview('ai_output_invalid')
	}

	const complete = comparisons.filter((comparison) => comparison !== null)
	const applicable = complete.filter((comparison) => comparison.actual !== 'not_applicable')
	if (applicable.length === 0) {
		return {
			status: 'pass',
			fulfillment: null,
			reasonCode: 'not_applicable',
			summary: { total: 0, satisfied: 0, failed: 0, uncertain: 0 },
			observations: complete,
		}
	}

	const failed = applicable.filter((comparison) => comparison.satisfied === false).length
	const uncertain = applicable.filter((comparison) => comparison.satisfied === null).length
	const satisfied = applicable.filter((comparison) => comparison.satisfied === true).length
	const status = failed > 0 ? 'fail' : uncertain > 0 ? 'needs_review' : 'pass'

	return {
		status,
		fulfillment: Math.round((satisfied / applicable.length) * 100),
		summary: { total: applicable.length, satisfied, failed, uncertain },
		observations: complete,
	}
}

/** kind별 관측값-기준 비교. 관측값 타입이 기준과 어긋나면 판정 불가(null)로 남긴다. */
function compare(
	criterion: HeuristicCriterion,
	value: 'present' | 'absent' | number,
): boolean | null {
	if (criterion.kind === 'measure') {
		if (typeof value !== 'number') return null
		if (criterion.operator === 'gte') return value >= criterion.expected
		if (criterion.operator === 'lte') return value <= criterion.expected
		return value >= criterion.expected && value <= (criterion.max ?? criterion.expected)
	}
	return typeof value === 'number' ? null : value === criterion.expected
}

/** AI 조언 문단을 advisory 결과로 감싼다. 조언만 싣고 판정은 만들지 않는다. */
export function evaluateAdvisory(advice: string | undefined): AiCheckResult {
	const trimmed = advice?.trim()
	if (!trimmed) return needsReview('ai_output_invalid')
	return { status: 'advisory', fulfillment: null, detail: trimmed }
}
