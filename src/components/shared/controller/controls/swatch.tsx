import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

const swatchVariants = cva(
	'shrink-0 cursor-pointer appearance-none border outline-none checked:ring-2 checked:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed',
	{
		variants: {
			shape: {
				/** 행 안 팔레트·Custom 빠른 선택 칩. */
				square: 'rounded-sm border-foreground/15',
				/** 조합 칩 그리드(라벨 아래 3열). */
				chip: 'rounded-md border-border',
				/** CMS 정본 스와치 그리드. */
				round: 'rounded-full border-foreground/15',
			},
		},
		defaultVariants: { shape: 'square' },
	},
)

/**
 * 색(또는 색 조합) 하나를 고르는 네이티브 라디오. 같은 `name` 묶음의 방향키 이동을 브라우저가 준다 —
 * 묶음(`role="radiogroup"`·이름)과 크기·배치는 부르는 쪽이 갖고, 여기는 선택·포커스 표시만 소유한다.
 * 색은 데이터라 `style`로 받는다(docs/09 §4 예외).
 */
export function ControllerSwatch({
	shape,
	className,
	...props
}: Omit<React.ComponentProps<'input'>, 'type'> & VariantProps<typeof swatchVariants>) {
	return (
		<input
			type="radio"
			data-slot="controller-swatch"
			className={cn(swatchVariants({ shape }), className)}
			{...props}
		/>
	)
}
