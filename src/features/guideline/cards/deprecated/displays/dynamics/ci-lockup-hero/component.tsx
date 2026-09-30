import { findCiLockupColors } from '@/features/guideline/repositories/ci-lockup-colors.payload.repository'
import type { CiLockupHeroWidget as CiLockupHeroWidgetRow } from '@/payload-types'
import { type CiLockupHeroSource, CiLockupHeroView } from './view'

// 위젯(서버): 색만 컬렉션에서 꺼내 뷰에 넘긴다 — `ci-lockup`과 같은 조회를 재사용한다.
export async function CiLockupHeroWidget({
	source,
	h,
}: {
	source?: string | null
	h?: number | null
}) {
	return (
		<CiLockupHeroView
			colors={await findCiLockupColors()}
			source={source === 'branch' ? 'branch' : ('subsidiary' satisfies CiLockupHeroSource)}
			h={h ?? 160}
		/>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function CiLockupHeroDisplay({ display }: { display: CiLockupHeroWidgetRow }) {
	return <CiLockupHeroWidget source={display.source} h={display.h} />
}
