import { Slot } from 'radix-ui'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * 어드민 대시보드의 패널 어휘(정본: Figma 67:2468 · 89:1969).
 * 카드 구조(rounded-24 · 26px 제목 · 알약 칩)를 여기 한 자리가 소유하고,
 * 표면 톤(브랜드 틴트)은 소비자가 className으로 얹는다.
 *
 * 수치는 px로 고정한다: Payload admin은 root가 13px이라 rem 유틸리티가
 * 프런트(16px)와 다르게 그려진다.
 */

type PanelCardProps = React.ComponentProps<'section'> & {
	title: string
}

export function PanelCard({ title, className, children, ...props }: PanelCardProps) {
	return (
		<section
			data-slot="panel-card"
			className={cn(
				'flex flex-col justify-between gap-[16px] overflow-hidden rounded-[24px] bg-card p-[16px] text-card-foreground ring-1 ring-border',
				className,
			)}
			{...props}
		>
			<h2 className="font-medium text-[26px] leading-[32px]">{title}</h2>
			{children}
		</section>
	)
}

type PanelChipProps = React.ComponentProps<'span'> & {
	asChild?: boolean
}

/**
 * 패널 안의 알약 칩. 링크 하나면 `asChild`로 Link를 감싸고,
 * 어드민처럼 링크 여러 개를 담는 컨테이너면 그대로 span으로 쓴다.
 * hover·focus 같은 상호작용 표현은 칩이 무엇인지 아는 소비자가 얹는다.
 */
export function PanelChip({ asChild = false, className, ...props }: PanelChipProps) {
	const Comp = asChild ? Slot.Root : 'span'
	return (
		<Comp
			data-slot="panel-chip"
			className={cn(
				'flex h-[44px] items-center rounded-[24px] border border-border bg-muted px-[16px] font-medium text-[13px] leading-[16px]',
				className,
			)}
			{...props}
		/>
	)
}
