import type * as React from 'react'
import { cn } from '@/lib/utils'

export type ContentFrameVariant = 'padded' | 'full' | 'heading'

type ContentFrameProps = React.ComponentProps<'div'> & {
	variant?: ContentFrameVariant
}

/** 여러 화면이 공유하는 콘텐츠의 최대 폭과 가로 여백을 소유한다. */
export function ContentFrame({ variant = 'padded', className, ...props }: ContentFrameProps) {
	return (
		<div
			data-slot="content-frame"
			data-variant={variant}
			className={cn(
				'w-full py-8',
				variant === 'padded' && 'mx-auto max-w-[1540px] px-4 md:px-8',
				variant === 'heading' && 'px-4 md:px-30',
				className,
			)}
			{...props}
		/>
	)
}
