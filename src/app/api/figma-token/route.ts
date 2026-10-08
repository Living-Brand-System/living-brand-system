import { z } from 'zod'
import {
	registerFigmaToken,
	removeFigmaToken,
} from '@/features/template-import/services/figma-token.service'
import { isManager } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

const bodySchema = z.object({ token: z.string().trim().min(1).max(256) })

/**
 * 내 Figma 개인 API 토큰을 등록(PUT)·삭제(DELETE)한다. 템플릿 가져오기를 쓰는 manager 이상만.
 * 🔴 토큰 원문은 응답·로그 어디에도 싣지 않는다(docs/07).
 */
/** 거절이면 그대로 돌려줄 응답, 통과면 요청자. */
async function authorize(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}
	const { payload, user } = await authenticateRequest()
	if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 })
	if (!isManager(user)) {
		return Response.json({ message: 'Forbidden' }, { status: 403 })
	}
	return { payload, user }
}

export async function PUT(request: Request): Promise<Response> {
	const auth = await authorize(request)
	if (auth instanceof Response) return auth

	const parsed = bodySchema.safeParse(await request.json().catch(() => null))
	if (!parsed.success) {
		return Response.json({ message: 'Figma API 토큰을 입력하세요.' }, { status: 400 })
	}

	await registerFigmaToken(auth.payload, auth.user, parsed.data.token)
	auth.payload.logger.info({ userId: auth.user.id }, 'figma-token.registered')
	return new Response(null, { status: 204 })
}

export async function DELETE(request: Request): Promise<Response> {
	const auth = await authorize(request)
	if (auth instanceof Response) return auth

	await removeFigmaToken(auth.payload, auth.user)
	auth.payload.logger.info({ userId: auth.user.id }, 'figma-token.removed')
	return new Response(null, { status: 204 })
}
