import { ArrowUpRight } from '@carbon/icons-react'
import Link from 'next/link'
import { routes } from '@/lib/routes'

/**
 * Payload Admin 입구 — manager 이상에게만 선다(2026-09-28 결정).
 *
 * 🔴 worker에게는 이 링크도, `/admin` 주소도 존재하지 않는다 — `src/proxy.ts`가 404로 돌린다.
 *    그래서 세울지 말지는 **호출부가 역할로 판단하고**, 여기서 다시 검사하지 않는다.
 * 🔑 카드가 아니라 작은 링크다. 메뉴로 세우면 계정 설정들과 같은 무게가 되는데, 여기 있는
 *    다른 것들과 달리 이건 앱 밖으로 나가는 문이다.
 */
export function PayloadEntryLink() {
	return (
		<Link
			className="inline-flex w-fit items-center gap-1 px-2 py-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
			href={routes.admin}
		>
			Payload
			<ArrowUpRight aria-hidden size={16} />
		</Link>
	)
}
