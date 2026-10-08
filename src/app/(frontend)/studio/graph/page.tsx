import { notFound, redirect } from 'next/navigation'
import { listGraphStudioConfigs } from '@/features/graphic-generation/services/list-graph-studio-configs.service'
import { isAdmin } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { getStudioGraphRoute, routes } from '@/lib/routes'

// 렌더링: 매 요청. 권한과 발행된 프로파일을 읽으므로 캐시하지 않는다(docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

/**
 * Graph Studio — 가이드라인 B.11 INFOGRAPHIC의 표현을 만든다.
 * Graphic과 같은 파이프라인을 쓰고 서는 자리만 다르다(`GRAPH_RUNTIME_IDS`).
 */
export default async function GenerateGraphPage() {
	const { user } = await requireUser(routes.studio.graph)
	// ponytail: worker에게 아직 열지 않은 스튜디오 — admin 밖에는 이 주소가 없다(404). 열 때 이 줄을 지운다.
	if (!isAdmin(user)) notFound()
	const [config] = await listGraphStudioConfigs(user)
	if (!config) notFound()

	// 근거는 `/studio/graphic`의 같은 자리에 적혀 있다.
	redirect(getStudioGraphRoute(config.id))
}
