import { z } from 'zod'
import { isPayloadUser } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

/**
 * 내 비밀번호 변경 — 앱에서 자격 증명을 바꿀 수 있는 유일한 자리.
 *
 * 🔴 **현재 비밀번호를 반드시 확인한다.** Payload의 `update`는 옛 비밀번호를 묻지 않으므로,
 *    확인 없이 열면 세션을 훔친 사람이 계정을 통째로 가져간다. 확인은 `payload.login`으로 한다 —
 *    같은 operation이라 잠금·시도 횟수가 그대로 걸린다.
 * 🔴 비밀번호는 응답·로그 어디에도 싣지 않는다(docs/07 「출력과 에러」).
 */
const requestSchema = z.object({
	currentPassword: z.string().min(1).max(200),
	// docs/07 「비밀번호 정책」 — 내부 사용자 비밀번호는 최소 12자.
	nextPassword: z.string().min(12).max(200),
})

export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()
	if (!isPayloadUser(user)) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}

	const parsed = requestSchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) {
		return Response.json({ message: '새 비밀번호는 12자 이상이어야 합니다.' }, { status: 422 })
	}

	try {
		await payload.login({
			collection: 'users',
			data: { email: user.email, password: parsed.data.currentPassword },
		})
	} catch {
		payload.logger.warn({ userId: user.id }, 'auth.password-change-rejected')
		return Response.json({ message: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 })
	}

	try {
		// 🔑 overrideAccess: false — `Users.access.update`가 selfOrAdmin이라 남의 문서는 못 고친다.
		//    role은 adminFieldOnly라 여기서 권한이 올라갈 수 없다.
		await payload.update({
			collection: 'users',
			data: { password: parsed.data.nextPassword },
			id: user.id,
			overrideAccess: false,
			user,
		})
	} catch (error) {
		payload.logger.error({ err: error, userId: user.id }, 'auth.password-change-failed')
		return Response.json({ message: '비밀번호를 바꾸지 못했습니다.' }, { status: 500 })
	}

	payload.logger.info({ userId: user.id }, 'auth.password-changed')
	return new Response(null, { status: 204 })
}
