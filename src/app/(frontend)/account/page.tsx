import { redirect } from 'next/navigation'
import { AccountCard } from '@/components/auth/account-card'
import { PasswordCard } from '@/components/auth/password-card'
import { McpKeyIssuer } from '@/components/studio/mcp/mcp-key-issuer'
import { AiUsageCard } from '@/components/studio/usage/ai-usage-card'
import { isManager, isPayloadUser } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { loginHref, routes } from '@/lib/routes'
import { parseAiUsageQuery } from '@/modules/ai-usage/ai-usage-query'
import { getAiUsageBreakdown } from '@/modules/ai-usage/services/get-ai-usage-breakdown.service'

// 렌더링: 매 요청. 로그인 계정을 읽으므로 캐시하지 않는다(docs/05).
export const dynamic = 'force-dynamic'

/**
 * 내 계정 — 헤더의 「Account」가 닿는 곳이자 앱에서 로그아웃할 수 있는 유일한 자리.
 *
 * 🔑 비로그인이면 `requireUser`가 로그인으로 보내고 돌아온다. 그래서 헤더는 로그인 여부를 몰라도
 *    되고, `/`와 `/guideline`의 정적 렌더가 깨지지 않는다.
 */
export default async function AccountPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
	const { user } = await requireUser(routes.account)
	// MCP API 키 세션으로는 열 수 없다 — 계정 화면은 사람 계정의 것이므로 로그인으로 돌려보낸다.
	if (!isPayloadUser(user)) redirect(loginHref(routes.account))

	// 범위 제한은 repository가 소유한다 — manager가 아니면 쿼리 자체가 본인 행으로 좁혀진다.
	const query = parseAiUsageQuery(await searchParams)
	const { rows, todayKey } = await getAiUsageBreakdown(user)

	// 앱 셸이 헤더를 본문 위에 겹치므로 그 높이만큼 비운다(section-layout과 같은 값).
	return (
		<main className="grid h-full justify-items-center overflow-y-auto p-4 pt-[50px] md:p-6 xl:pt-(--global-header-height)">
			{/*
			 * 폭은 화면 조합이 소유한다(docs/10 §4).
			 * 🔑 설정 카드 셋은 짧아서 두 열로 나란히 서고, 사용량은 표·스트립이 넓어야 읽히므로
			 *    두 열을 가로지른다. 한 줄로 세우면 넓은 화면이 통째로 빈다.
			 */}
			<div className="grid w-full max-w-7xl gap-4 py-6 lg:grid-cols-2">
				{/* 🔴 셋을 그리드 칸에 그냥 흘리면 빈 칸이 생긴다 — 짧은 둘을 한 열에 쌓는다. */}
				<div className="flex flex-col gap-4">
					<AccountCard createdAt={user.createdAt} email={user.email} />
					{/* 🔴 앱에 이 자리가 없으면 비밀번호를 바꿀 길이 Payload Admin뿐이다. */}
					<PasswordCard />
				</div>
				{/* MCP 키는 계정당 하나다 — 스튜디오 도구가 아니라 이 계정의 설정이라 여기 선다. */}
				<McpKeyIssuer />
				{/* 사용량도 계정에 매달린 기록이다 — 스튜디오 도구가 아니라 이 계정의 것이다. */}
				<div className="lg:col-span-2">
					<AiUsageCard
						canSeeEveryone={isManager(user)}
						query={query}
						rows={rows}
						todayKey={todayKey}
					/>
				</div>
			</div>
		</main>
	)
}
