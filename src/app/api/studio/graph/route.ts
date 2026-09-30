import { listGraphStudioConfigs } from '@/features/graph-generation/services/list-graph-studio-configs.service'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

// 렌더링: 매 요청. 사용자별 published 프로파일을 읽으므로 캐시하지 않는다.
export const dynamic = 'force-dynamic'

/**
 * Graph 자산 브라우저가 열릴 때 교체 후보 계약을 내려준다 — 페이지 진입 비용에 목록을 싣지 않기 위한 경계다.
 * 🔴 주소는 화면(`/studio/graph`)과 같은 모양을 쓴다. 컬렉션 이름(`/api/graph-profiles`)을 쓰면
 *    Payload가 같은 자리에 여는 컬렉션 REST를 가려 버린다.
 */
export async function GET(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}

	try {
		return Response.json({ profiles: await listGraphStudioConfigs(user) })
	} catch (error) {
		payload.logger.error({ err: error }, 'studio-graph-list.failed')
		return Response.json({ message: 'Failed to load graph profiles.' }, { status: 500 })
	}
}
