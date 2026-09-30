import type React from 'react'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

/**
 * 자산 카드와 미리보기 갱신 오류를 한 덩어리로 묶는 사이드바 헤더 슬롯.
 * 카드 자체는 고정 높이 한 줄이라 오류 문구를 안에 넣으면 배치가 무너진다 — 아래에 붙인다.
 */
export function PreviewRefreshSlot({
	error,
	messageClassName,
	children,
}: {
	error: string | null
	/**
	 * 오류 문구의 여백. 🔴 카드가 상자를 꽉 채우는 패널에서는 상자가 패딩을 갖지 않으므로
	 * 이 문구가 테두리에 붙는다 — 그 자리에서만 여백을 준다.
	 */
	messageClassName?: string
	children: React.ReactNode
}) {
	return (
		<div data-slot="preview-refresh-slot" className="flex flex-col gap-2">
			{children}
			{error && (
				<Typography
					role="alert"
					size="sm"
					className={cn('text-destructive', messageClassName)}
				>
					{error}
				</Typography>
			)}
		</div>
	)
}
