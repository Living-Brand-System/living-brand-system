'use client'

import { ChevronLeft, ChevronRight } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ControllerPaginationProps = {
	/** 1부터 세는 현재 위치. 아무것도 고르지 않았으면 0. */
	index: number
	total: number
	/** -1 또는 +1. 범위 밖은 이 파츠가 먼저 막으므로 호출되지 않는다. */
	onStep: (delta: -1 | 1) => void
	/** 무엇을 넘기는지 — 화살표 버튼 이름과 위치 안내에 들어간다("이전 파일"). */
	label: string
	className?: string
}

/**
 * 바 안의 위치 이동 — `‹ n | N ›`. 디자인 56:2471 "Pagenation".
 *
 * 🔴 컨트롤 표면은 모두 `bg-muted`다. 떠 있는 흰 바(`Controller.Bar`) 위에서 투명한 컨트롤은
 *    경계가 사라진다(디자인 59:3039).
 *
 * 🔴 숫자 두 개는 `aria-hidden`이고 위치는 sr-only 한 문장이 말한다 — "2"와 "6"이 따로 읽히면
 *    무슨 수인지 알 수 없다.
 */
export function ControllerPagination({
	index,
	total,
	onStep,
	label,
	className,
}: ControllerPaginationProps) {
	return (
		<span
			data-slot="controller-pagination"
			className={cn('flex items-center gap-2', className)}
		>
			<Button
				type="button"
				variant="muted"
				className="h-9 w-10"
				aria-label={`이전 ${label}`}
				disabled={index <= 1}
				onClick={() => onStep(-1)}
			>
				<ChevronLeft aria-hidden />
			</Button>
			<span className="flex h-9 items-center rounded-md bg-muted">
				<span className="sr-only">
					{total}개 중 {index}번째 {label}
				</span>
				<span aria-hidden className="px-3 text-sm">
					{index}
				</span>
				<span aria-hidden className="h-5 w-px bg-border" />
				<span aria-hidden className="px-3 text-muted-foreground text-sm">
					{total}
				</span>
			</span>
			<Button
				type="button"
				variant="muted"
				className="h-9 w-10"
				aria-label={`다음 ${label}`}
				disabled={index < 1 || index >= total}
				onClick={() => onStep(1)}
			>
				<ChevronRight aria-hidden />
			</Button>
		</span>
	)
}
