/**
 * 내 Figma 토큰 등록·삭제 브라우저 fetch — `PUT·DELETE /api/figma-token` 호출과 401 판별을 소유한다.
 * 화면 상태(입력값·대기·오류 표시)와 미인증 시 리다이렉트는 호출자(useFigmaToken)가 담당한다.
 * 🔴 토큰 원문은 요청 본문에만 싣고 어디에도 남기지 않는다(docs/07).
 */

export type FigmaTokenRequestResult =
	| { status: 'ok' }
	| { status: 'unauthorized' }
	| { status: 'error'; message: string | null }

async function send(method: 'PUT' | 'DELETE', body?: unknown): Promise<FigmaTokenRequestResult> {
	const response = await fetch('/api/figma-token', {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	}).catch(() => null)

	if (response?.status === 401) return { status: 'unauthorized' }
	if (response?.ok) return { status: 'ok' }
	const failure = (await response?.json().catch(() => null)) as { message?: string } | null
	return { status: 'error', message: failure?.message ?? null }
}

export const requestFigmaTokenRegistration = (token: string) => send('PUT', { token })
export const requestFigmaTokenRemoval = () => send('DELETE')
