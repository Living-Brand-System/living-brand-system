import { ArrowLeft } from '@carbon/icons-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { TokenLimitsEditor } from '@/components/auth/token-limits-editor'
import { Typography } from '@/components/ui/typography'
import { isManager, isPayloadUser } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { loginHref, routes } from '@/lib/routes'
import { getTokenUsage } from '@/modules/ai-usage/services/token-limit.service'
import { resolveDefaultTokenLimits } from '@/modules/ai-usage/token-limit'

// 렌더링: 매 요청. 로그인 계정과 지금 사용량을 읽으므로 캐시하지 않는다(docs/05).
export const dynamic = 'force-dynamic'

/**
 * 계정별 AI 토큰 한도 — `/account`의 manager 전용 입구가 닿는 곳.
 *
 * 🔑 manager가 아니면 이 주소는 없다(404). 계정 목록은 사용자 권한으로 읽는다 — manager에게 admin
 *    행이 보이지 않는 계정 운영 규칙(docs/07)이 여기서도 그대로다.
 */
export default async function AccountTokenLimitsPage() {
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
	const usage = await getTokenUsage(users.docs.map((doc) => doc.id))

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
					defaults={resolveDefaultTokenLimits(defaults)}
					accounts={users.docs.map((doc) => ({
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
