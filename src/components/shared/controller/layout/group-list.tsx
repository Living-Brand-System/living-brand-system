import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { ControllerPresence } from './presence'

/**
 * 세로 그룹 목록. 패널의 바깥 패딩·표면·스크롤은 소유하지 않는다.
 * 그룹이 새로 생기거나 빠지면 높이로 펼치고 접는다(`ControllerPresence`). 그룹 사이 12px은 각 상자의 위 여백이고,
 * 목록을 8px 끌어올려 시작 4px을 지킨다 — 첫 그룹이 빠져도 여백이 튀지 않는다.
 */
export function ControllerGroupList({ className, children, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="controller-group-list"
			className={cn('-mt-2 flex min-w-0 shrink-0 flex-col empty:hidden', className)}
			{...props}
		>
			<ControllerPresence itemClassName="pt-3">{children}</ControllerPresence>
		</div>
	)
}
