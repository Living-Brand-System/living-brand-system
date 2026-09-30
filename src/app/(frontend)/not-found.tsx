import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { routes } from '@/lib/routes'

/**
 * 앱 안의 404 — `notFound()`를 부르는 모든 화면(스튜디오 딥링크·가이드라인 토픽·
 * worker가 친 `/admin`)이 여기로 떨어진다.
 *
 * 🔴 이 파일이 없으면 Next 기본 404가 뜬다. 헤더도 챗도 없이 나오므로 **앱 밖으로 튕긴 것처럼**
 *    보이고, 돌아올 길이 뒤로 가기밖에 없다(2026-09-29 QA D2).
 */
export default function NotFound() {
	// 앱 셸이 헤더를 본문 위에 겹치므로 그 높이만큼 비운다(account 화면과 같은 값).
	return (
		<main className="grid h-full place-items-center overflow-y-auto p-4 pt-[50px] md:p-6 xl:pt-(--global-header-height)">
			<Empty className="border-0">
				<EmptyHeader>
					<EmptyTitle>찾을 수 없는 주소예요</EmptyTitle>
					<EmptyDescription>
						주소가 바뀌었거나, 접근할 수 있는 화면이 아닙니다.
					</EmptyDescription>
				</EmptyHeader>
				<Button asChild variant="muted">
					<Link href={routes.home}>홈으로</Link>
				</Button>
			</Empty>
		</main>
	)
}
