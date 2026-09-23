import { redirect } from 'next/navigation'
import { AccountCard } from '@/components/auth/account-card'
import { McpKeyIssuer } from '@/components/studio/mcp/mcp-key-issuer'
import { isPayloadUser } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { loginHref, routes } from '@/lib/routes'

// 렌더링: 매 요청. 로그인 계정을 읽으므로 캐시하지 않는다(docs/05).
export const dynamic = 'force-dynamic'

/**
 * 내 계정 — 헤더의 「Account」가 닿는 곳이자 앱에서 로그아웃할 수 있는 유일한 자리.
 *
 * 🔑 비로그인이면 `requireUser`가 로그인으로 보내고 돌아온다. 그래서 헤더는 로그인 여부를 몰라도
 *    되고, `/`와 `/guideline`의 정적 렌더가 깨지지 않는다.
 */
export default async function AccountPage() {
	const { user } = await requireUser(routes.account)
	// MCP API 키 세션으로는 열 수 없다 — 계정 화면은 사람 계정의 것이므로 로그인으로 돌려보낸다.
	if (!isPayloadUser(user)) redirect(loginHref(routes.account))

	// 앱 셸이 헤더를 본문 위에 겹치므로 그 높이만큼 비운다(section-layout과 같은 값).
	return (
		<main className="grid h-full justify-items-center overflow-y-auto p-4 pt-[50px] md:p-6 xl:pt-(--global-header-height)">
			{/* 폭은 화면 조합이 소유한다(docs/10 §4). MCP 카드의 명령 두 칸이 나란히 서는 폭 = 672px. */}
			<div className="flex w-full max-w-2xl flex-col gap-4 py-6">
				<AccountCard createdAt={user.createdAt} email={user.email} />
				{/* MCP 키는 계정당 하나다 — 스튜디오 도구가 아니라 이 계정의 설정이라 여기 선다. */}
				<McpKeyIssuer />
			</div>
		</main>
	)
}
