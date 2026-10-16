import type * as React from 'react'
import { Typography } from '@/components/ui/typography'

/**
 * 패널 제목 — 스튜디오 패널의 제목은 섹션 제목(Layers·Output·Setting)이든 그룹 제목이든 전부 이것 하나로 선다(사용자 2026-10-16).
 * 기준은 오래전부터 있던 Layers·Output 제목이다: 36px 행·sm·semibold·muted. 🔴 상태(활성 섹션 등)로 색을 바꾸지 않는다 —
 * className·style을 받지 않아 덮을 길이 없다.
 * 접기 트리거처럼 버튼 안에 들 때는 `as="span"`이다 — 버튼 안에는 제목 요소(h2)를 둘 수 없다.
 */
export function ControllerTitle({
	as = 'h2',
	...props
}: Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'style'> & { as?: 'h2' | 'h3' | 'span' }) {
	return (
		<Typography
			as={as}
			size="sm"
			weight="semibold"
			tone="muted"
			data-slot="controller-title"
			className="flex h-9 items-center"
			{...props}
		/>
	)
}
