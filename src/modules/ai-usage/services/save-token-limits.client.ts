import type { AccountTokenLimits, TokenLimitPeriod } from '../token-limit'

/** Payload REST 응답에서 사람이 읽을 오류 문구를 꺼낸다. 성공이면 null. */
async function failureOf(response: Response | null): Promise<string | null> {
	if (response?.ok) return null
	const body = response
		? ((await response.json().catch(() => null)) as {
				errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
			} | null)
		: null
	const first = body?.errors?.[0]
	return first?.data?.errors?.[0]?.message ?? first?.message ?? '저장하지 못했습니다.'
}

const sendJson = (url: string, method: 'POST' | 'PATCH', body: unknown) =>
	fetch(url, {
		method,
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	}).catch(() => null)

/**
 * AI 토큰 한도 저장 — Payload REST로 바로 쓴다. 필드 권한(manager 이상)과 검증은 Payload가 그대로
 * 강제하므로 여기에는 판정이 없다. 돌려주는 값은 실패 문구이고, 성공이면 null이다.
 */
export async function saveDefaultTokenLimits(
	limits: Record<TokenLimitPeriod, number | null>,
): Promise<string | null> {
	return failureOf(await sendJson('/api/globals/ai-token-limits', 'POST', limits))
}

export async function saveAccountTokenLimits(
	userId: number,
	limits: AccountTokenLimits,
): Promise<string | null> {
	return failureOf(await sendJson(`/api/users/${userId}`, 'PATCH', { tokenLimits: limits }))
}
