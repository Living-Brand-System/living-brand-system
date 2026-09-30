import { listGeneratedImageHistoryPage } from '@/features/image-generation/services/list-generated-image-history.service'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

// 렌더링: 매 요청. 사용자 권한으로 생성 기록을 읽으므로 캐시하지 않는다.
export const dynamic = 'force-dynamic'

/**
 * 좌측 갤러리가 이 앱에서 생성된 이미지를 최신순으로 받아 간다.
 * 🔴 주소는 화면(`/studio/image`)과 같은 모양을 쓴다 — 컬렉션 이름(`/api/generated-images`)을
 *    쓰면 Payload가 같은 자리에 여는 컬렉션 REST를 가려 버린다.
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
		const params = new URL(request.url).searchParams
		const page = Number(params.get('page') ?? '1')
		return Response.json(
			await listGeneratedImageHistoryPage({
				bestOnly: params.get('best') === '1',
				page,
				user,
			}),
		)
	} catch (error) {
		payload.logger.error({ err: error }, 'studio-image-history.failed')
		return Response.json({ message: 'Failed to load generated images.' }, { status: 500 })
	}
}
