import { redirect } from 'next/navigation'
import { AccountCard } from '@/components/auth/account-card'
import { PayloadEntryLink } from '@/components/auth/payload-entry-link'
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
			 * 🔑 두 열로 갈린다 — 왼쪽은 설정, 오른쪽은 기록(사용량)이다. 성격이 다르므로 섞지 않는다.
			 * 🔑 설정 열은 고정 폭이다 — 담는 것이 짧은 행과 입력이라 넓어져도 얻는 게 없다.
			 *    남는 폭은 전부 사용량이 가져간다(표 6열·막대 30개가 폭을 먹는 쪽이다).
			 * 🔴 채우는 트랙은 `1fr`이 아니라 `minmax(0,1fr)`다 — 그냥 `1fr`이면 표가 트랙을
			 *    밀어내 그리드가 컨테이너 밖으로 넘친다.
			 * 🔴 `items-start`: 두 열의 높이가 다르므로 각자 위에서 시작하게 둔다. 안 주면 짧은
			 *    쪽이 긴 쪽에 맞춰 늘어나 빈 면이 생긴다.
			 */}
			<div className="grid w-full max-w-7xl items-start gap-4 py-6 lg:grid-cols-[28rem_minmax(0,1fr)]">
				<div className="flex flex-col gap-4">
					<AccountCard createdAt={user.createdAt} email={user.email} role={user.role} />
					{/* MCP 키는 계정당 하나다 — 스튜디오 도구가 아니라 이 계정의 설정이라 여기 선다. */}
					<McpKeyIssuer />
					{/* 앱에서 Payload Admin으로 가는 유일한 입구 — worker에게는 그 주소가 404다. */}
					{isManager(user) && <PayloadEntryLink />}
				</div>
				{/* 사용량은 계정에 매달린 **기록**이다 — 설정과 성격이 달라 자기 열을 갖는다. */}
				<AiUsageCard
					canSeeEveryone={isManager(user)}
					query={query}
					rows={rows}
					todayKey={todayKey}
				/>
			</div>
		</main>
	)
}
