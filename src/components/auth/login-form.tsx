'use client'

import { WarningAlt } from '@carbon/icons-react'
import { Controller } from '@/components/shared/controller'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { useLoginForm } from '@/features/auth/hooks/use-login-form'
import { cn } from '@/lib/utils'

/**
 * 로그인 폼.
 *
 * 🔑 표면은 컨트롤러 킷이다 — MCP 카드와 같은 이유로 여기서 카드·필드 스타일을 새로 만들지 않는다.
 *    Carbon 로그인 패턴에서 가져온 것은 **모양이 아니라 규정**이다: 라벨은 입력 위, 제목은
 *    「로그인」, 버튼은 폼 맨 아래, 서버 실패는 버튼 바로 위의 알림, 실패하면 비밀번호를 비운다.
 * 🔴 가입·비밀번호 찾기 링크를 두지 않는다 — 공개 가입은 열지 않고(docs/07 #36), 재설정은
 *    1회성 토큰 요건이 통째로 딸려오는 별개 작업이다.
 */
export function LoginForm({ redirectTo }: { redirectTo: string }) {
	const { canSubmit, email, error, loading, password, setEmail, setPassword, submit } =
		useLoginForm(redirectTo)

	return (
		// Controller.Root는 div라 form이 될 수 없다 — 폼은 카드를 감싸고, 카드가 표면을 소유한다.
		<form
			onSubmit={(event) => {
				event.preventDefault()
				submit()
			}}
		>
			<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
				<header className="flex flex-col gap-1 px-2">
					<Typography as="h1" size="2xl" weight="medium">
						로그인
					</Typography>
					<Typography size="sm" tone="muted">
						발급받은 계정으로 로그인합니다.
					</Typography>
				</header>

				<div className="flex flex-col gap-1">
					<Controller.Field label="이메일">
						<Controller.Input
							autoComplete="email"
							className="text-left"
							disabled={loading || undefined}
							name="email"
							onChange={(event) => setEmail(event.target.value)}
							required
							type="email"
							value={email}
						/>
					</Controller.Field>
					<Controller.Field label="비밀번호">
						<Controller.Input
							autoComplete="current-password"
							className="text-left"
							disabled={loading || undefined}
							name="password"
							onChange={(event) => setPassword(event.target.value)}
							required
							type="password"
							value={password}
						/>
					</Controller.Field>
				</div>

				{/* 🔴 실패 알림은 버튼 바로 위다 — 누른 자리에서 결과를 읽게 한다(Carbon 알림 배치). */}
				{error && (
					<Alert variant="destructive">
						<WarningAlt aria-hidden />
						<AlertTitle>{error}</AlertTitle>
					</Alert>
				)}

				{/*
				 * 진행 중에는 highlight의 흐르는 그라디언트가 진행을 말한다(MCP 발급 버튼과 같은 계약).
				 * 🔴 그래서 disabled를 걸지 않는다 — highlight의 disabled는 그라디언트를 함께 끈다.
				 *    중복 제출은 훅의 canSubmit이 막는다.
				 */}
				<Button
					aria-busy={loading || undefined}
					aria-disabled={loading || undefined}
					className={cn('h-11 w-full rounded-lg', !loading && 'text-foreground')}
					// 짧은 폼이라 채워지기 전에는 잠근다(Carbon). 진행 중에는 잠그지 않는다 — 위 주석의 이유.
					disabled={!loading && !canSubmit}
					type="submit"
					variant={loading ? 'highlight' : 'muted'}
				>
					{loading ? (
						<>
							<Spinner aria-hidden />
							<span className="sr-only">로그인 중…</span>
						</>
					) : (
						'로그인'
					)}
				</Button>
			</Controller.Root>
		</form>
	)
}
