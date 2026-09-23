import { LogoutButton } from '@/components/auth/logout-button'
import { Controller } from '@/components/shared/controller'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Typography } from '@/components/ui/typography'

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
 * 🔴 역할(admin·manager·worker)을 적지 않는다 — 사용자에게 보여줄 정본 라벨이 리포에 없고
 *    (docs/07은 없는 역할 `Creator`를 쓴다), 역할을 적는 순간 「나는 왜 이 역할인가」라는
 *    팀 결정 대기 항목을 이 편의 화면이 열게 된다.
 */
export function AccountCard({ email, createdAt }: { email: string; createdAt?: string }) {
	const joinedAt = createdAt ? JOINED_AT_FORMAT.format(new Date(createdAt)) : null

	return (
		<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
			<header className="flex flex-col gap-1 px-2">
				<Typography as="h1" size="2xl" weight="medium">
					내 계정
				</Typography>
				<Typography size="sm" tone="muted">
					로그인한 계정 정보입니다.
				</Typography>
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
				{/* 🔑 `ThemeToggle`은 이미 만들어져 있었는데 소비처가 0건이었다 — 설정 화면이 그 자리다. */}
				<Controller.Row className="h-auto py-1.5" readonly label="테마">
					<ThemeToggle />
				</Controller.Row>
			</div>

			<LogoutButton />
		</Controller.Root>
	)
}
