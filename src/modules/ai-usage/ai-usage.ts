import type { AiUsageEvent } from '@/payload-types'
import type { AiUsageFeature, AiUsageStudio } from './ai-usage-catalog'

/**
 * AI 호출 1회의 토큰 사용량 — `ai-usage-events` 컬렉션에 그대로 들어가는 계약.
 *
 * 🔴 `AiUsage`(asset-check)·`AgentChatAiUsage`(agent-chat)와 이름이 겹치지만 같은 것이 아니다.
 *    그 둘은 세션 문서에 남기는 **합산** 기록이고, 이쪽은 계정별 집계를 위한 **호출 1건**이다.
 *    합산 기록은 `callCount`를 갖지만 여기서는 1행 = 1호출이라 그 값이 뜻을 잃는다.
 */
export interface AiUsageTokens {
	inputTokens?: number | undefined
	outputTokens?: number | undefined
	totalTokens?: number | undefined
	cacheReadInputTokens?: number | undefined
	cacheWriteInputTokens?: number | undefined
	reasoningTokens?: number | undefined
}

// 분류 축의 정본은 ai-usage-catalog다 — 컬렉션도 화면도 거기서 읽는다.
export type { AiUsageFeature, AiUsageStudio } from './ai-usage-catalog'

/** 이 호출이 남긴 작업 기록. 남기지 않는 호출(관리자 미리보기 등)은 없어도 된다. */
export type AiUsageSource = NonNullable<AiUsageEvent['source']>

export interface AiUsageRecord extends AiUsageTokens {
	createdBy: number
	feature: AiUsageFeature
	model: string
	/** 어느 스튜디오 화면에서 온 호출인가. 스튜디오 밖이면 넘기지 않는다. */
	studio?: AiUsageStudio
	source?: AiUsageSource
}

/** 토큰 필드의 유일한 목록 — 판정과 합산이 같은 것을 본다. */
const TOKEN_KEYS = [
	'inputTokens',
	'outputTokens',
	'totalTokens',
	'cacheReadInputTokens',
	'cacheWriteInputTokens',
	'reasoningTokens',
] as const satisfies readonly (keyof AiUsageTokens)[]

/**
 * provider가 한 필드도 안 채웠으면 기록할 것이 없다 — 빈 행을 쌓지 않기 위한 판정.
 * 🔴 키를 명시한다. `Object.values`로 훑으면 같이 넘어온 `createdBy` 같은 값을 토큰으로 세어
 *    판정이 항상 참이 된다(실제로 그랬다).
 */
export function hasAnyTokenCount(tokens: AiUsageTokens): boolean {
	return TOKEN_KEYS.some((key) => typeof tokens[key] === 'number' && (tokens[key] ?? 0) > 0)
}

/**
 * 같은 요청에서 여러 번 호출한 모델의 토큰을 한 행으로 합친다.
 * 🔴 provider가 usage를 통째로 안 주는 경우를 견뎌야 한다 — 계량이 던지면 이미 성공한 생성이 죽는다.
 */
export function sumAiUsageTokens(list: readonly (AiUsageTokens | undefined)[]): AiUsageTokens {
	const total = (read: (tokens: AiUsageTokens) => number | undefined) => {
		const values = list
			.map((tokens) => (tokens ? read(tokens) : undefined))
			.filter((value): value is number => typeof value === 'number')
		return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : undefined
	}
	return {
		inputTokens: total((t) => t.inputTokens),
		outputTokens: total((t) => t.outputTokens),
		totalTokens: total((t) => t.totalTokens),
		cacheReadInputTokens: total((t) => t.cacheReadInputTokens),
		cacheWriteInputTokens: total((t) => t.cacheWriteInputTokens),
		reasoningTokens: total((t) => t.reasoningTokens),
	}
}
