import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** 세로 그룹 목록. 패널의 바깥 패딩·표면·스크롤은 소유하지 않는다. */
export function ControllerGroupList({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot="controller-group-list"
			className={cn('flex min-w-0 shrink-0 flex-col gap-3 pt-1 empty:hidden', className)}
			{...props}
		/>
	)
}
