import { z } from 'zod'
import {
	type OutlineTextResult,
	outlineTextRun,
} from '@/features/studio-export/services/outline-text.service'
import { isPayloadUser } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

export const maxDuration = 30

/** 한 판의 글줄 수 상한. 넘으면 템플릿이 아니라 잘못된 호출이다. */
const MAX_RUNS = 500

const requestSchema = z.object({
	runs: z
		.array(
			z.object({
				text: z.string().min(1).max(2_000),
				fontFamily: z.string().min(1).max(200),
				fontSize: z.number().positive().max(2_000),
				fontWeight: z.number().min(1).max(1_000).optional(),
				letterSpacing: z.number().min(-100).max(100).optional(),
			}),
		)
		.min(1)
		.max(MAX_RUNS),
})

/**
 * 글줄을 윤곽선 path로 바꿔 준다. 인쇄용 벡터 내보내기가 서체 설치에 의존하지 않게 하는 단계다.
 *
 * 🔴 서버에만 있는 이유는 서체 파일과 fontkit이다(`/api/ci-outline`과 같다). 그쪽은 CI 락업 전용으로
 *    em 좌표계 path를 주고, 이쪽은 요청 크기에 맞춘 px 좌표계 path를 준다 — 소비자가 달라 합치지 않는다.
 */
export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}
	const { user } = await authenticateRequest()
	if (!isPayloadUser(user)) return Response.json({ message: 'Unauthorized.' }, { status: 401 })

	const body = requestSchema.safeParse(await request.json().catch(() => null))
	if (!body.success) return Response.json({ message: 'Invalid request.' }, { status: 400 })

	const runs: OutlineTextResult[] = await Promise.all(body.data.runs.map(outlineTextRun))

	return Response.json({ runs }, { headers: { 'Cache-Control': 'no-store' } })
}
