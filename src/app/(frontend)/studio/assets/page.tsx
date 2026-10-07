import { notFound } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { routes } from '@/lib/routes'

// 렌더링: 매 요청. 회원 게이트가 세션을 읽으므로 캐시하지 않는다.
export const dynamic = 'force-dynamic'

export default async function StudioAssetsPage() {
	const { user } = await requireUser(routes.studio.assets)
	// ponytail: 미개발 표면 — admin 밖에는 이 주소가 없다(404). 개발이 끝나면 이 줄을 지운다.
	if (!isAdmin(user)) notFound()
	return null
}
