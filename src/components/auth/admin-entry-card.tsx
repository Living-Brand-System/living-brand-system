import Link from 'next/link'
import { Controller } from '@/components/shared/controller'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { routes } from '@/lib/routes'

/**
 * Payload Admin 입구 — manager 이상에게만 선다(2026-09-28 결정).
 *
 * 🔴 worker에게는 이 링크도, `/admin` 주소도 존재하지 않는다 — `src/proxy.ts`가 404로 돌린다.
 *    그래서 세울지 말지는 **호출부가 역할로 판단하고**, 여기서 다시 검사하지 않는다.
 * 🔑 앱이 Payload로 가는 유일한 링크다. PR #335가 헤더·푸터의 Payload 링크를 전부 걷어냈고,
 *    되살리지 않는다 — 그 자리들은 역할을 모르는 정적 표면이라 worker에게도 보인다.
 */
export function AdminEntryCard() {
	return (
		<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
			<header className="flex flex-col gap-1 px-2">
				<Typography as="h2" size="2xl" weight="medium">
					관리 화면
				</Typography>
				<Typography size="sm" tone="muted">
					가이드라인·템플릿·계정을 고치는 곳입니다.
				</Typography>
			</header>

			<Button asChild className="h-11 w-full rounded-lg text-foreground" variant="muted">
				<Link href={routes.admin}>관리 화면 열기</Link>
			</Button>
		</Controller.Root>
	)
}
