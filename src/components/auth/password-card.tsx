'use client'

import { CheckmarkOutline, WarningAlt } from '@carbon/icons-react'
import { Controller } from '@/components/shared/controller'
import { PageCard } from '@/components/shared/page-card'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PASSWORD_MIN_LENGTH, usePasswordChange } from '@/features/auth/hooks/use-password-change'
import { cn } from '@/lib/utils'

/**
 * 비밀번호 변경.
 *
 * 🔑 앱에 이 자리가 없으면 자격 증명을 바꿀 길이 Payload Admin뿐이다 — CMS를 감추기로 한 이상
 *    앱이 이 기능을 가져야 한다.
 * 🔴 확인란을 서버로 보내지 않는다. 서로 다른지는 화면에서 거르고, 서버는 현재 비밀번호와
 *    새 비밀번호만 본다.
 */
export function PasswordCard() {
	const {
		canSubmit,
		confirmPassword,
		currentPassword,
		done,
		error,
		loading,
		nextPassword,
		setConfirmPassword,
		setCurrentPassword,
		setNextPassword,
		submit,
	} = usePasswordChange()

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault()
				submit()
			}}
		>
			<PageCard.Root>
				<PageCard.Header
					title="비밀번호"
					description={`${PASSWORD_MIN_LENGTH}자 이상으로 바꿀 수 있습니다.`}
				/>

				<div className="flex flex-col gap-1">
					<Controller.Field label="현재 비밀번호">
						<Controller.Input
							autoComplete="current-password"
							className="text-left"
							disabled={loading || undefined}
							onChange={(event) => setCurrentPassword(event.target.value)}
							type="password"
							value={currentPassword}
						/>
					</Controller.Field>
					<Controller.Field label="새 비밀번호">
						<Controller.Input
							autoComplete="new-password"
							className="text-left"
							disabled={loading || undefined}
							minLength={PASSWORD_MIN_LENGTH}
							onChange={(event) => setNextPassword(event.target.value)}
							type="password"
							value={nextPassword}
						/>
					</Controller.Field>
					<Controller.Field label="새 비밀번호 확인">
						<Controller.Input
							autoComplete="new-password"
							className="text-left"
							disabled={loading || undefined}
							onChange={(event) => setConfirmPassword(event.target.value)}
							type="password"
							value={confirmPassword}
						/>
					</Controller.Field>
				</div>

				{error && (
					<Alert variant="destructive">
						<WarningAlt aria-hidden />
						<AlertTitle>{error}</AlertTitle>
					</Alert>
				)}
				{done && (
					<Alert>
						<CheckmarkOutline aria-hidden />
						<AlertTitle>{done}</AlertTitle>
					</Alert>
				)}

				<Button
					aria-busy={loading || undefined}
					aria-disabled={loading || undefined}
					className={cn('h-11 w-full rounded-lg', !loading && 'text-foreground')}
					disabled={!loading && !canSubmit}
					type="submit"
					variant={loading ? 'highlight' : 'muted'}
				>
					{loading ? (
						<>
							<Spinner aria-hidden />
							<span className="sr-only">바꾸는 중…</span>
						</>
					) : (
						'비밀번호 바꾸기'
					)}
				</Button>
			</PageCard.Root>
		</form>
	)
}
