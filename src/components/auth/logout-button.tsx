'use client'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Typography } from '@/components/ui/typography'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { cn } from '@/lib/utils'

/** 로그아웃 — 앱에서 세션을 끝내는 유일한 자리다. */
export function LogoutButton() {
	const { error, loading, logout } = useLogout()

	return (
		<div data-slot="logout-button" className="flex flex-col gap-2">
			<Button
				aria-busy={loading || undefined}
				aria-disabled={loading || undefined}
				className={cn('h-11 w-full rounded-lg', !loading && 'text-foreground')}
				onClick={logout}
				type="button"
				variant={loading ? 'highlight' : 'muted'}
			>
				{loading ? (
					<>
						<Spinner aria-hidden />
						<span className="sr-only">로그아웃 중…</span>
					</>
				) : (
					'로그아웃'
				)}
			</Button>
			{error && (
				<Typography role="alert" size="sm" tone="destructive">
					{error}
				</Typography>
			)}
		</div>
	)
}
