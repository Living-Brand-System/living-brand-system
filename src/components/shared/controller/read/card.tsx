'use client'

import type * as React from 'react'
import { cn } from '@/lib/utils'

type ControllerCardProps = React.HTMLAttributes<HTMLElement> & {
	/** 카드 머리의 상태 배지(디자인의 Pass·Review·Fail pill). */
	badge?: React.ReactNode
	/** 배지 반대쪽의 보조 수치 — 디자인의 신뢰도 75%. */
	meta?: React.ReactNode
	heading: React.ReactNode
	/** 열려 있음(펼친 대상)을 드러낸다 — 근거 패널을 이 카드가 열었다는 표시. */
	open?: boolean
	selected?: boolean
}

/**
 * 요약 카드 — 접힌 판정 하나. 디자인 56:3 "Review - Result"의 Summary 카드.
 *
 * `Controller.Field`와 면(`bg-muted`)은 같지만 안에 컨트롤이 아니라 **읽을 것**이 들어간다.
 * 그래서 라벨 연결(`RowControlProvider`)을 하지 않는다.
 *
 * 🔴 `Controller.Item`과 짝이다. 카드는 룰 단위로 접은 것, Item은 그 안을 기준 단위로 편 것이라
 *    같은 내용을 다른 밀도로 보여준다 — 시각을 통일하지 말 것. 채움(카드)과 구분선(Item)의 차이가
 *    "접힌 것"과 "펼친 것"을 구별하는 유일한 단서다.
 */
export function ControllerCard({
	badge,
	meta,
	heading,
	open = false,
	selected = false,
	className,
	children,
	onClick,
	...props
}: ControllerCardProps) {
	const interactive = Boolean(onClick)
	const Comp: React.ElementType = interactive ? 'button' : 'div'

	return (
		<Comp
			data-slot="controller-card"
			data-open={open || undefined}
			data-selected={selected || undefined}
			{...(interactive ? { type: 'button', onClick, 'aria-expanded': open } : {})}
			className={cn(
				'flex w-full flex-col gap-2 rounded-lg bg-muted p-3 text-left',
				interactive &&
					'transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none',
				'data-[open]:ring-2 data-[open]:ring-foreground/20',
				className,
			)}
			{...props}
		>
			{(badge || meta) && (
				<span className="flex items-start justify-between gap-2">
					{badge}
					{meta && (
						<span className="shrink-0 font-mono text-muted-foreground text-xs">
							{meta}
						</span>
					)}
				</span>
			)}
			<span className="font-medium text-sm">{heading}</span>
			{children && <span className="text-muted-foreground text-xs">{children}</span>}
		</Comp>
	)
}
