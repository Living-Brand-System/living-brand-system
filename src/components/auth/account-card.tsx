import { ArrowRight } from '@carbon/icons-react'
import Link from 'next/link'
import { AccountRoleBadge } from '@/components/auth/account-role-badge'
import { LogoutButton } from '@/components/auth/logout-button'
import { Controller } from '@/components/shared/controller'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Typography } from '@/components/ui/typography'
import { routes } from '@/lib/routes'
import type { User } from '@/payload-types'

/** 가입일 표시. 🔴 존을 못 박는다 — 빼면 서버 TZ(대개 UTC)를 따라가 하루 밀린다. */
const JOINED_AT_FORMAT = new Intl.DateTimeFormat('ko-KR', {
	dateStyle: 'long',
	timeZone: 'Asia/Seoul',
})

/**
 * 내 계정 — 편의 화면이다. 값은 읽기만 하고 고치지 않는다.
 *
 * 🔑 표면은 MCP 카드와 같은 컨트롤러 킷이다. 값만 읽는 줄은 `readonly` Row로, 흐리지 않는다
 *    (docs/10 §3.6 — 읽기 전용은 비활성이 아니다).
 * 🔴 역할 뱃지는 manager·admin에게만 선다 — worker에게는 아무것도 안 붙인다([[AccountRoleBadge]]).
 * 🔑 테마는 헤더 오른쪽에 앉는다. 값을 읽는 줄이 아니라 이 패널 전체의 표시 설정이라
 *    Row 목록에 섞이면 계정 정보와 같은 무게로 읽힌다.
 */
export function AccountCard({
	email,
	createdAt,
	role,
	canManageTokenLimits = false,
}: {
	email: string
	createdAt?: string
	role: User['role']
	/** manager 이상이면 토큰 한도 화면 입구를 세운다 — 판단은 호출부가 역할로 한다. */
	canManageTokenLimits?: boolean
}) {
	const joinedAt = createdAt ? JOINED_AT_FORMAT.format(new Date(createdAt)) : null

	return (
		<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
			<header className="flex items-start justify-between gap-3 px-2">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<Typography as="h1" size="2xl" weight="medium">
							내 계정
						</Typography>
						<AccountRoleBadge role={role} />
					</div>
					<Typography size="sm" tone="muted">
						로그인한 계정 정보입니다.
					</Typography>
				</div>
				{/* 🔴 패널 면이 `bg-background`라 토글의 기본 트랙(같은 값)이 사라진다 — 이 면 위에서는
				    Row와 같은 `bg-muted` 채움으로 바꾼다(docs/09 §5, 면을 깔면 전경도 같이 정한다). */}
				<ThemeToggle className="shrink-0 border-transparent bg-muted" />
			</header>

			<div className="flex flex-col gap-1">
				<Controller.Row readonly label="이메일">
					<span className="truncate text-muted-foreground text-sm">{email}</span>
				</Controller.Row>
				{joinedAt && (
					<Controller.Row readonly label="가입일">
						<span className="text-muted-foreground text-sm">{joinedAt}</span>
					</Controller.Row>
				)}
				{/* 🔑 비밀번호는 입력 세 칸을 항상 펼쳐 둘 만큼 자주 쓰는 일이 아니다 — 자기 페이지로 보낸다. */}
				<Controller.Row readonly label="비밀번호">
					<Link
						className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
						href={routes.accountPassword}
					>
						변경
						<ArrowRight aria-hidden size={16} />
					</Link>
				</Controller.Row>
				{/* 🔑 토큰 한도는 계정 운영이라 manager 이상에게만 선다. */}
				{canManageTokenLimits && (
					<Controller.Row readonly label="AI 토큰 한도">
						<Link
							className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
							href={routes.accountTokenLimits}
						>
							설정
							<ArrowRight aria-hidden size={16} />
						</Link>
					</Controller.Row>
				)}
			</div>

			<LogoutButton />
		</Controller.Root>
	)
}
