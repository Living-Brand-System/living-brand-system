import config from '@payload-config'
import { AuthenticationError, generatePayloadCookie, getPayload, LockedAuth } from 'payload'
import { z } from 'zod'
import { isCrossOriginRequest } from '@/lib/request-auth'

/**
 * 앱 로그인 — Payload Admin을 거치지 않고 세션을 얻는 유일한 입구.
 *
 * 🔴 **실패 이유를 가르지 않는다.** 없는 계정·틀린 비밀번호·잠긴 계정이 전부 같은 응답이어야
 *    이메일이 존재하는지가 새어 나가지 않는다(docs/07 「사용자 열거 방지」). 그래서 Payload가
 *    돌려주는 상세 메시지를 그대로 흘리지 않고 여기서 하나로 덮는다.
 * 🔑 인증 자체는 `payload.login`이 한다 — REST 핸들러와 같은 operation이라 로그인 시도 제한
 *    (기본 5회 / 10분 잠금)과 훅이 그대로 돈다. 우리가 비밀번호를 만지는 자리는 없다.
 */
const requestSchema = z.object({
	email: z.email().max(320),
	password: z.string().min(1).max(200),
})

const FAILURE_BODY = { message: '이메일 또는 비밀번호가 올바르지 않습니다.' }

export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const parsed = requestSchema.safeParse(await request.json().catch(() => null))
	// 형식 오류도 같은 응답이다 — 무엇이 틀렸는지 말하면 그것도 탐색의 실마리가 된다.
	if (!parsed.success) return Response.json(FAILURE_BODY, { status: 401 })

	const payload = await getPayload({ config })
	try {
		const { token } = await payload.login({
			collection: 'users',
			data: { email: parsed.data.email, password: parsed.data.password },
		})
		if (!token) throw new Error('login returned no token')

		// 쿠키 속성(httpOnly·sameSite·만료)은 Payload가 소유한다 — 자체 세션 쿠키를 만들지 않는다(docs/07 #16).
		const cookie = generatePayloadCookie({
			collectionAuthConfig: payload.collections.users.config.auth,
			cookiePrefix: payload.config.cookiePrefix ?? 'payload',
			token,
		})
		return new Response(null, { headers: { 'Set-Cookie': cookie }, status: 204 })
	} catch (error) {
		// 🔴 「자격 증명이 틀렸다」와 「지금 서버가 못 한다」를 가른다. 전부 401로 내리면 DB가
		//    끊긴 동안 멀쩡한 사용자가 「비밀번호가 틀렸다」를 보고 다시 치다가 계정을 잠근다.
		const rejected = error instanceof AuthenticationError || error instanceof LockedAuth
		// 🔴 이메일도 비밀번호도 남기지 않는다(docs/06 §14 — 로그에 개인정보 금지). 흔한 인증
		//    실패는 사실만, 예상 밖 예외는 원인을 남겨야 장애와 오타를 가를 수 있다.
		if (rejected) payload.logger.warn('auth.login-rejected')
		else payload.logger.error({ err: error }, 'auth.login-failed')

		return rejected
			? Response.json(FAILURE_BODY, { status: 401 })
			: Response.json({ message: 'Login failed.' }, { status: 500 })
	}
}
