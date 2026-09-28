import type { AiUsageFeature, AiUsageStudio } from './ai-usage-catalog'

/**
 * 집계의 최소 알갱이 — (계정 × 기능 × 스튜디오 × 모델 × 일자) 한 칸.
 *
 * 🔑 화면이 요구하는 네 축이 전부 이 배열을 접은 결과다. 축이 늘어도 쿼리가 늘지 않고,
 *    어느 축으로 접든 같은 집합의 분할이라 총계가 변하지 않는다.
 */
export interface AiUsageBreakdownRow {
	/** null = 계정이 삭제됨. 토큰은 남으므로 집계에서 빼지 않는다. */
	userId: number | null
	userEmail: string | null
	feature: AiUsageFeature
	/** null = 스튜디오 밖(admin 미리보기·전역 헤더 챗). */
	studio: AiUsageStudio | null
	model: string
	/** `AI_USAGE_TIME_ZONE` 기준 YYYY-MM-DD. 문자열 비교만으로 기간을 자르려고 문자열이다. */
	dayKey: string
	callCount: number
	inputTokens: number
	outputTokens: number
	totalTokens: number
	cacheReadInputTokens: number
	cacheWriteInputTokens: number
	reasoningTokens: number
}
