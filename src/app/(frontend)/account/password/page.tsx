import { ArrowLeft } from '@carbon/icons-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PasswordCard } from '@/components/auth/password-card'
import { Typography } from '@/components/ui/typography'
import { isPayloadUser } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { loginHref, routes } from '@/lib/routes'

// 렌더링: 매 요청. 로그인 계정을 읽으므로 캐시하지 않는다(docs/05).
export const dynamic = 'force-dynamic'

/**
 * 비밀번호 변경 — `/account`의 「비밀번호 → 변경」이 닿는 곳.
 *
 * 🔑 계정 화면에서 떼어낸 이유는 빈도다. 입력 세 칸을 항상 펼쳐 두면 자주 하는 일처럼 보이는데,
 *    실제로는 계정을 받은 직후 한 번과 가끔이다.
 */
export default async function AccountPasswordPage() {
	const { user } = await requireUser(routes.accountPassword)
	// MCP API 키 세션으로는 열 수 없다 — 자격 증명은 사람 계정의 것이므로 로그인으로 돌려보낸다.
	if (!isPayloadUser(user)) redirect(loginHref(routes.accountPassword))

	// 앱 셸이 헤더를 본문 위에 겹치므로 그 높이만큼 비운다(계정 화면과 같은 값).
	return (
		<main className="grid h-full justify-items-center overflow-y-auto p-4 pt-[50px] md:p-6 xl:pt-(--global-header-height)">
			<div className="flex w-full max-w-md flex-col gap-3 py-6">
				<Link
					className="inline-flex w-fit items-center gap-1 px-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
					href={routes.account}
				>
					<ArrowLeft aria-hidden size={16} />
					<Typography as="span" size="sm">
						내 계정
					</Typography>
				</Link>
				<PasswordCard />
			</div>
		</main>
	)
}
