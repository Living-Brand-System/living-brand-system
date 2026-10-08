import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const itemStatusVariants = cva('font-medium text-xs', {
	variants: {
		tone: {
			success: 'text-success',
			info: 'text-info',
			warning: 'text-warning',
			destructive: 'text-destructive',
			muted: 'text-muted-foreground',
		},
	},
	defaultVariants: { tone: 'muted' },
})

type ControllerItemProps = React.ComponentProps<'article'> &
	VariantProps<typeof itemStatusVariants> & {
		/** 상태 텍스트(디자인의 Pass·Review·Fail). 🔴 배지가 아니라 색 글자다 — 아래 주석 참조. */
		status?: React.ReactNode
		/** 상태 반대쪽의 보조 수치 — 디자인의 신뢰도 75%. */
		meta?: React.ReactNode
		heading: React.ReactNode
	}

/**
 * 펼친 판정 항목 — 기준 하나. 디자인 56:2087 "Review - Result Detail".
 *
 * 🔑 `Controller.Card`와 같은 내용을 다른 밀도로 보여주는 짝이다. 카드는 **채움**(`bg-muted`)으로
 *    접힌 덩어리임을 말하고, 이 항목은 **구분선**으로 이어지는 목록임을 말한다. 상태도 카드는 배지,
 *    여기는 색 글자다 — 항목이 여러 개 쌓이는 자리에서 배지를 반복하면 목록이 배지 벽이 된다.
 *    두 파츠의 시각을 통일하지 말 것. 그 차이가 "접힌 것"과 "펼친 것"을 가르는 단서다.
 *
 * 마지막 항목의 구분선은 `last:border-b-0`이 지운다 — 담는 쪽이 목록 끝을 알 필요가 없다.
 */
export function ControllerItem({
	status,
	meta,
	heading,
	tone = 'muted',
	className,
	children,
	...props
}: ControllerItemProps) {
	return (
		<article
			data-slot="controller-item"
			data-tone={tone}
			className={cn(
				'flex flex-col gap-1 border-border border-b pt-3 pb-4 last:border-b-0',
				className,
			)}
			{...props}
		>
			{(status || meta) && (
				<span className="flex items-baseline justify-between gap-2">
					{status && <span className={itemStatusVariants({ tone })}>{status}</span>}
					{meta && (
						<span className="shrink-0 font-mono text-muted-foreground text-xs">
							{meta}
						</span>
					)}
				</span>
			)}
			<span className="font-medium text-sm">{heading}</span>
			{/* 근거가 두 문단 이상인 항목이 있어(기준·관찰 / 이유) 본문은 쌓이는 열로 둔다. */}
			{children && (
				<span className="flex flex-col gap-1 text-muted-foreground text-xs">
					{children}
				</span>
			)}
		</article>
	)
}
