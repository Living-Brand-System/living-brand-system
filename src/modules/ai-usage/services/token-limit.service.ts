import { findUserTokenLimits } from '@/features/auth/services/user-settings.service'
import { findDefaultTokenLimits } from '../repositories/token-limit.payload.repository'
import { findTokenUsage } from '../repositories/token-usage.payload.repository'
import {
	exceededTokenPeriod,
	resolveTokenLimits,
	TOKEN_LIMIT_PERIOD_LABELS,
	type TokenLimitPeriod,
	type TokenLimits,
	type TokenUsage,
} from '../token-limit'

/** 계정이 이 기간의 AI 토큰 한도를 다 썼다 — 메시지는 사용자에게 그대로 보여 줄 문구다. */
export class TokenLimitExceededError extends Error {
	constructor(
		readonly period: TokenLimitPeriod,
		readonly limit: number,
	) {
		super(
			`${TOKEN_LIMIT_PERIOD_LABELS[period]} AI 토큰 한도(${limit.toLocaleString('ko-KR')} 토큰)를 모두 썼어요. 관리자에게 한도 조정을 요청하세요.`,
		)
		this.name = 'TokenLimitExceededError'
	}
}

/**
 * AI 모델을 부르기 **전에** 이 계정이 한도 안에 있는지 본다. 넘었으면 `TokenLimitExceededError`를 던진다.
 *
 * 🔑 사용량은 호출이 끝난 뒤 기록되므로 진행 중인 요청이 한도를 조금 넘길 수 있다 — 막는 것은 새 요청이다
 *    (사용자 결정 2026-10-06).
 * 🔑 한도 값은 사용자 권한과 무관하게 서버가 읽는다(overrideAccess) — 한도 필드는 본인에게도 숨겨져 있다.
 */
export async function assertWithinTokenLimit(userId: number): Promise<void> {
	const { limits, usage } = await getTokenLimitStatus(userId)
	const period = exceededTokenPeriod(usage, limits)
	const limit = period ? limits[period] : null
	if (period && limit !== null) throw new TokenLimitExceededError(period, limit)
}

/**
 * 한 계정의 유효 한도와 오늘·이번 달 사용량. 🔑 막는 판정(`assertWithinTokenLimit`)과 본인 화면(내 사용량)이
 * 같은 값을 본다 — 화면이 따로 세면 「아직 남았다」고 보이는데 막히는 어긋남이 생긴다.
 * 🔑 한도 필드는 본인에게도 숨겨져 있어 소유자(auth) 저장소가 overrideAccess로 읽는다 — 호출부가 본인 id만 넘긴다.
 */
export async function getTokenLimitStatus(
	userId: number,
): Promise<{ limits: TokenLimits; usage: TokenUsage }> {
	const [account, defaults, usage] = await Promise.all([
		findUserTokenLimits(userId),
		findDefaultTokenLimits(),
		findTokenUsage([userId]),
	])
	return {
		limits: resolveTokenLimits(account, defaults),
		usage: usage.get(userId) ?? { daily: 0, monthly: 0 },
	}
}

/** 한도 화면이 보여 줄 계정별 오늘·이번 달 사용량. 누구의 수를 읽을지는 호출부가 권한으로 정한다. */
export function getTokenUsage(userIds: readonly number[]) {
	return findTokenUsage(userIds)
}
