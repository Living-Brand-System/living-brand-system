import { notFound, redirect } from 'next/navigation'
import { listGraphicStudioConfigs } from '@/features/graphic-generation/services/list-graphic-studio-configs.service'
import { requireUser } from '@/lib/request-auth'
import { getStudioGraphicRoute, routes } from '@/lib/routes'

// 렌더링: 매 요청. 권한과 발행된 Graphic Profile을 읽으므로 캐시하지 않는다.
// 🔴 방식을 선언으로 못박는다 — 추론에 맡기면 프로덕션에서만 드러나는 차이가 생긴다
//    (docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

export default async function GenerateGraphicPage() {
	const { user } = await requireUser(routes.studio.graphic)
	// 시작 계약 하나만 싣는다 — 교체 후보 목록은 자산 브라우저가 열릴 때 /api/graphic-profiles가 내려준다.
	const [config] = await listGraphicStudioConfigs(user)
	if (!config) notFound()

	/**
	 * 고를 것이 정해졌으면 주소도 그것을 가리켜야 한다 — 그래야 새로고침·공유·뒤로가기가 같은
	 * 화면을 연다(`/studio/template`이 이미 같은 방식이다).
	 * 🔴 이 자리에서 화면을 그리지 않는다. 그리면 「무엇을 보고 있는지 주소가 모르는 화면」이
	 *    딥링크와 나란히 생겨 같은 것을 두 벌로 관리하게 된다.
	 */
	redirect(getStudioGraphicRoute(config.id))
}
