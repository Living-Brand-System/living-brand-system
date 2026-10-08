'use client'

import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ControllerRow } from './row'

export type ControllerStackItem = {
	id: string
	label: string
	icon: ReactElement
	children: ReactNode
	disabled?: boolean
	readonly?: boolean
	/** 칸 안 오류 문구의 id — `ControllerRow`의 `errorId`로 넘어가 입력에 연결된다. */
	errorId?: string
}

type ControllerStackProps = Omit<ComponentProps<'div'>, 'children'> & {
	items: readonly ControllerStackItem[]
	labelDisplay?: 'text' | 'icon'
}

/** 1~3개 행을 같은 너비로 배치한다. 3개일 때 시각 라벨만 아이콘으로 바꾼다. */
export function ControllerStack({
	items,
	labelDisplay = 'text',
	className,
	...props
}: ControllerStackProps) {
	if (items.length < 1 || items.length > 3) {
		throw new Error('ControllerStack은 컨트롤 1~3개를 받습니다.')
	}
	const iconOnly = items.length === 3 || labelDisplay === 'icon'
	return (
		<div
			data-slot="controller-stack"
			data-count={items.length}
			className={cn('grid min-w-0 auto-cols-fr grid-flow-col gap-1', className)}
			{...props}
		>
			{items.map(({ id, label, icon, children, disabled, readonly, errorId }) => (
				<Tooltip key={id}>
					<TooltipTrigger asChild>
						<ControllerRow
							data-slot="controller-row"
							disabled={disabled}
							readonly={readonly}
							errorId={errorId}
							className={cn(
								'min-w-0 gap-2',
								items.length === 3 && 'px-2.5 [--controller-row-px:0.625rem]',
							)}
							label={
								iconOnly ? (
									<>
										<span
											aria-hidden="true"
											className="flex size-4 items-center justify-center [&>svg]:size-4"
										>
											{icon}
										</span>
										<span className="sr-only">{label}</span>
									</>
								) : (
									label
								)
							}
						>
							{children}
						</ControllerRow>
					</TooltipTrigger>
					<TooltipContent>{label}</TooltipContent>
				</Tooltip>
			))}
		</div>
	)
}
