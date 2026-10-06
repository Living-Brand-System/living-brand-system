/**
 * needs_review 사유 코드와 사용자 노출 문구의 단일 소유자.
 * 서버 판정 경로(check-plan·evaluator·run-check)와 브라우저 폴백(submit-check.client)이 함께 참조하므로
 * checker registry 같은 서버 전용 의존을 들이지 않는다. 순수 상수와 순수 함수만 둔다.
 */

export const NEEDS_REVIEW_DETAILS = {
	reference_asset_unavailable: '레퍼런스 이미지 불러오기 실패',
	invalid_criteria: 'Heuristic 판정 기준 없음',
	ai_checker_invalid: 'AI 검사 도구 설정 오류',
	ai_not_configured: 'AI 설정 없음',
	image_not_available: 'AI 평가용 이미지 없음',
	ai_output_invalid: 'AI 관측값 형식 오류',
	ai_request_failed: 'AI 평가 실패',
	/** 모델까지 가지 못한 실패 — 요청이 서버에서 완주하지 못했고, 판정은 시도조차 되지 않았다. */
	ai_request_unreachable: 'AI 요청 전달 실패',
	/** 계정의 AI 토큰 한도에 닿아 서버가 모델 호출을 막았다. */
	ai_token_limit: 'AI 토큰 한도 초과',
	checker_not_registered: 'Checker 미등록',
} as const

export type NeedsReviewReasonCode = keyof typeof NEEDS_REVIEW_DETAILS

/** 사유 코드 하나로 needs_review 원판정을 만든다. 문구는 NEEDS_REVIEW_DETAILS가 소유한다. */
export function needsReview(reasonCode: NeedsReviewReasonCode) {
	return {
		status: 'needs_review' as const,
		fulfillment: null,
		detail: NEEDS_REVIEW_DETAILS[reasonCode],
		reasonCode,
	}
}
