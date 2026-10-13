import { ArrowLeft } from '@carbon/icons-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { TokenLimitsEditor } from '@/components/auth/token-limits-editor'
import { Typography } from '@/components/ui/typography'
import { isManager, isPayloadUser, type Role } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { loginHref, routes } from '@/lib/routes'
import { fillAiUsageDays, foldAiUsage } from '@/modules/ai-usage/ai-usage-fold'
import { getAiUsageBreakdown } from '@/modules/ai-usage/services/get-ai-usage-breakdown.service'
import { getTokenUsage } from '@/modules/ai-usage/services/token-limit.service'
import { resolveDefaultTokenLimits } from '@/modules/ai-usage/token-limit'
import type { User } from '@/payload-types'

/** 계정을 고르면 펼치는 일별 막대의 일수. */
const DAILY_DAYS = 30

// 렌더링: 매 요청. 로그인 계정과 지금 사용량을 읽으므로 캐시하지 않는다(docs/05).
export const dynamic = 'force-dynamic'

/**
 * 계정별 AI 토큰 한도 — `/account`의 manager 전용 입구가 닿는 곳.
 *
 * 🔑 manager가 아니면 이 주소는 없다(404). 계정 목록은 사용자 권한으로 읽는다 — manager에게 admin
 *    행이 보이지 않는 계정 운영 규칙(docs/07)이 여기서도 그대로다.
 * 🔑 `?role=`로 고른 역할(기본 worker)의 계정만 표와 막대에 선다.
 * 🔑 표 위 일별 막대는 하나뿐이다 — 아무도 안 고르면 그 역할 계정 전체, `?user=<id>`로 고르면 그 계정이다.
 *    상태는 URL뿐이다.
 */
export default async function AccountTokenLimitsPage({
	searchParams,
}: {
	searchParams: Promise<{ role?: string; user?: string }>
}) {
	const { payload, user } = await requireUser(routes.accountTokenLimits)
	if (!isPayloadUser(user)) redirect(loginHref(routes.accountTokenLimits))
	if (!isManager(user)) notFound()

	const [defaults, users] = await Promise.all([
		payload.findGlobal({ slug: 'ai-token-limits', depth: 0, overrideAccess: false, user }),
		payload.find({
			collection: 'users',
			depth: 0,
			limit: 500,
			sort: 'email',
			overrideAccess: false,
			user,
			select: { email: true, role: true, tokenLimits: true },
		}),
	])
	const params = await searchParams
	const role: Role = params.role === 'manager' || params.role === 'admin' ? params.role : 'worker'
	const accounts = users.docs.filter((doc) => doc.role === role)
	const usage = await getTokenUsage(accounts.map((doc) => doc.id))

	// 🔴 막대는 위 목록(사용자 권한으로 읽은 것)의 계정만 센다 — 사용량 repository는 manager에게
	//    admin 행까지 돌려주므로, 합계나 URL로 목록에 없는 계정을 엿보지 못하게 여기서 막는다.
	const visibleIds = new Set(accounts.map((doc) => doc.id))
	const requestedId = Number(params.user)
	const selectedUserId = visibleIds.has(requestedId) ? requestedId : undefined
	const daily = await loadDaily(user, visibleIds, selectedUserId)

	return (
		<main className="grid h-full justify-items-center overflow-y-auto p-4 pt-[50px] md:p-6 xl:pt-(--global-header-height)">
			<div className="flex w-full max-w-7xl flex-col gap-3 py-6">
				<Link
					className="inline-flex w-fit items-center gap-1 px-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
					href={routes.account}
				>
					<ArrowLeft aria-hidden size={16} />
					<Typography as="span" size="sm">
						내 계정
					</Typography>
				</Link>
				<TokenLimitsEditor
					daily={daily}
					role={role}
					selectedUserId={selectedUserId}
					defaults={resolveDefaultTokenLimits(defaults)}
					accounts={accounts.map((doc) => ({
						id: doc.id,
						email: doc.email,
						role: doc.role,
						limits: {
							unlimited: doc.tokenLimits?.unlimited ?? false,
							daily: doc.tokenLimits?.daily ?? null,
							monthly: doc.tokenLimits?.monthly ?? null,
						},
						usage: usage.get(doc.id) ?? { daily: 0, monthly: 0 },
					}))}
				/>
			</div>
		</main>
	)
}

async function loadDaily(user: User, visibleIds: Set<number>, selectedUserId?: number) {
	const { rows, todayKey } = await getAiUsageBreakdown(user)
	const fold = foldAiUsage(
		rows.filter((row) => row.userId != null && visibleIds.has(row.userId)),
		{
			axis: 'user',
			days: DAILY_DAYS,
			filters: selectedUserId === undefined ? {} : { user: String(selectedUserId) },
			todayKey,
		},
	)
	return fillAiUsageDays(fold.daily, todayKey, DAILY_DAYS)
}
