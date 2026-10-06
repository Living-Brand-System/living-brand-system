/**
 * 계정별 AI 토큰 한도의 판정 — 순수 함수만 둔다(I/O는 repository·service가 갖는다).
 *
 * 🔑 한도는 두 기간을 따로 센다 — 일(한국 시간 0시~다음 날 0시)과 월(한국 시간 달력 월).
 *    둘 중 하나라도 닿으면 새 AI 요청을 막는다(사용자 결정 2026-10-06).
 * 🔑 값은 세 층이다(사용자 결정 2026-10-06).
 *    - LBS 기본값(`DEFAULT_TOKEN_LIMITS`): 전역 설정을 한 번도 저장하지 않았을 때도 걸리는 값.
 *    - 전체 기본값(전역 설정): 일·월 토큰 수. 항상 한도가 있다 — 「제한 없음」이 없다.
 *    - 계정 설정: 비워 두면 기본값을 따르고, 숫자를 넣으면 그 값이다. 「한도 없음」을 켜면 두 기간 모두 무제한이다.
 */
export const TOKEN_LIMIT_PERIODS = ['daily', 'monthly'] as const

export type TokenLimitPeriod = (typeof TOKEN_LIMIT_PERIODS)[number]

/**
 * LBS 자체의 기본값 — 전역 설정이 비어 있어도 한도는 항상 있다. 전역 설정 필드의 기본값도 이것을 읽는다.
 */
export const DEFAULT_TOKEN_LIMITS: Record<TokenLimitPeriod, number> = {
	daily: 10_000,
	monthly: 100_000,
}

/** 전체 기본값 — 아직 한 번도 저장하지 않았으면 비어 있을 수 있다(그때는 `DEFAULT_TOKEN_LIMITS`). */
export type DefaultTokenLimits = Partial<Record<TokenLimitPeriod, number | null>>

/** 계정 설정 — 비운 기간은 기본값을 따른다. */
export type AccountTokenLimits = Partial<Record<TokenLimitPeriod, number | null>> & {
	unlimited?: boolean | null
}

export type TokenUsage = Record<TokenLimitPeriod, number>

/** 기간별 유효 한도. `null`은 제한 없음이다. */
export type TokenLimits = Record<TokenLimitPeriod, number | null>

export const TOKEN_LIMIT_PERIOD_LABELS: Record<TokenLimitPeriod, string> = {
	daily: '오늘',
	monthly: '이번 달',
}

const positive = (value: number | null | undefined) =>
	typeof value === 'number' && value > 0 ? value : null

/** 지금 걸리는 전체 기본값 — 저장된 전역 설정, 없으면 LBS 기본값. */
export function resolveDefaultTokenLimits(
	defaults: DefaultTokenLimits | null | undefined,
): Record<TokenLimitPeriod, number> {
	return {
		daily: positive(defaults?.daily) ?? DEFAULT_TOKEN_LIMITS.daily,
		monthly: positive(defaults?.monthly) ?? DEFAULT_TOKEN_LIMITS.monthly,
	}
}

/** 계정의 유효 한도. 「한도 없음」이면 두 기간 모두 무제한이고, 아니면 계정 값 → 기본값 순으로 쓴다. */
export function resolveTokenLimits(
	account: AccountTokenLimits | null | undefined,
	defaults: DefaultTokenLimits | null | undefined,
): TokenLimits {
	if (account?.unlimited) return { daily: null, monthly: null }
	const fallback = resolveDefaultTokenLimits(defaults)
	return {
		daily: positive(account?.daily) ?? fallback.daily,
		monthly: positive(account?.monthly) ?? fallback.monthly,
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

/** 사용 비율(0~1). 무제한이면 `null`이다 — 그래프를 그리지 않는다. */
export function tokenUsageRatio(used: number, limit: number | null): number | null {
	return limit === null ? null : Math.min(used / limit, 1)
}

/**
 * 한도 입력칸의 글자를 토큰 수로 읽는다 — 빈칸은 `null`(기본값을 따름), 1 이상의 정수는 그 수다.
 * 콤마·앞뒤 공백은 허용한다. 그 밖(0, 음수, 소수, 글자 섞임)은 `undefined` — 반영하지 않고 직전 값으로 돌린다.
 */
export function parseTokenInput(text: string): number | null | undefined {
	const raw = text.replaceAll(',', '').trim()
	if (raw === '') return null
	return /^[1-9]\d*$/.test(raw) ? Number(raw) : undefined
}
