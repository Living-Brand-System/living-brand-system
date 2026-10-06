/**
 * 계정별 AI 토큰 한도의 판정 — 순수 함수만 둔다(I/O는 repository·service가 갖는다).
 *
 * 🔑 한도는 두 기간을 따로 센다 — 일(한국 시간 0시~다음 날 0시)과 월(한국 시간 달력 월).
 *    둘 중 하나라도 닿으면 새 AI 요청을 막는다(사용자 결정 2026-10-06).
 * 🔑 값은 두 층이다 — 전체 기본값(전역 설정)과 계정별 설정. 계정이 「기본값 따름」이면 기본값을 쓴다.
 *    어느 층이든 「제한 없음」을 고를 수 있다.
 */
export const TOKEN_LIMIT_PERIODS = ['daily', 'monthly'] as const

export type TokenLimitPeriod = (typeof TOKEN_LIMIT_PERIODS)[number]

/** 전체 기본값 한 기간 — 제한 없음이거나 토큰 수다. */
export type DefaultTokenLimit = { mode?: 'unlimited' | 'limit' | null; tokens?: number | null }

/** 계정 설정 한 기간 — 기본값을 따르거나, 제한 없음이거나, 토큰 수다. */
export type AccountTokenLimit = {
	mode?: 'default' | 'unlimited' | 'limit' | null
	tokens?: number | null
}

export type TokenUsage = Record<TokenLimitPeriod, number>

/** 기간별 유효 한도. `null`은 제한 없음이다. */
export type TokenLimits = Record<TokenLimitPeriod, number | null>

export const TOKEN_LIMIT_PERIOD_LABELS: Record<TokenLimitPeriod, string> = {
	daily: '오늘',
	monthly: '이번 달',
}

/**
 * 한 기간의 유효 한도. 계정이 정하지 않았으면(또는 「기본값 따름」이면) 기본값을 쓴다.
 * 🔴 「한도 지정」인데 숫자가 없으면 제한 없음으로 읽는다 — 저장 검증이 막지만, 막기 전에 들어간 값이
 *    모든 요청을 막아 버리는 쪽보다 안전하다.
 */
export function resolveTokenLimit(
	account: AccountTokenLimit | null | undefined,
	fallback: DefaultTokenLimit | null | undefined,
): number | null {
	const setting = !account?.mode || account.mode === 'default' ? fallback : account
	return setting?.mode === 'limit' && typeof setting.tokens === 'number' && setting.tokens > 0
		? setting.tokens
		: null
}

export function resolveTokenLimits(
	account: Partial<Record<TokenLimitPeriod, AccountTokenLimit | null>> | null | undefined,
	fallback: Partial<Record<TokenLimitPeriod, DefaultTokenLimit | null>> | null | undefined,
): TokenLimits {
	return {
		daily: resolveTokenLimit(account?.daily, fallback?.daily),
		monthly: resolveTokenLimit(account?.monthly, fallback?.monthly),
	}
}

/** 이미 한도에 닿은 기간. 둘 다 닿았으면 더 긴 쪽(월)을 알린다 — 내일이 돼도 풀리지 않으므로. */
export function exceededTokenPeriod(
	usage: TokenUsage,
	limits: TokenLimits,
): TokenLimitPeriod | null {
	const reached = (period: TokenLimitPeriod) => {
		const limit = limits[period]
		return limit !== null && usage[period] >= limit
	}
	if (reached('monthly')) return 'monthly'
	if (reached('daily')) return 'daily'
	return null
}
