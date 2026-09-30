import type React from 'react'
import { SectionLayout } from '@/components/global/section-layout'
import { StudioCapabilitiesProvider } from '@/components/studio/shared/studio-capabilities'
import { isManager } from '@/lib/auth'
import { authenticateRequest } from '@/lib/request-auth'

// 렌더링: 매 요청. 사용자 권한을 읽으므로 캐시하지 않는다(각 페이지도 이미 force-dynamic이다).
export const dynamic = 'force-dynamic'

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
	// 회원 게이트는 각 페이지가 소유한다(request-auth의 requireUser 주석) — 여기서는 권한만 읽고,
	// 비회원이면 아무 권한도 없는 값으로 흘러간 뒤 페이지가 로그인으로 보낸다.
	const { user } = await authenticateRequest()

	return (
		<StudioCapabilitiesProvider canManageProfiles={isManager(user)}>
			{/* nav를 주지 않는다 — 진입점 6개가 GlobalHeader에 그대로 있어 좌측 메뉴는 같은 것을 두 번 그렸다. */}
			<SectionLayout variant="workspace">{children}</SectionLayout>
		</StudioCapabilitiesProvider>
	)
}
