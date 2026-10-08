import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * 행·섹션 끝에 앉는 상태 타일 — `Controller.Action`과 같은 자리를 쓰지만 **버튼이 아니다**.
 * 누를 수 없는 정적 표시라는 것이 계약이다(docs/10 §3.6).
 *
 * 🔴 `label`이 필수인 이유: 안에 들어가는 것은 아이콘 하나뿐이라, 라벨이 없으면 스크린리더에
 *    아무것도 남지 않는다. 색만으로 상태를 전달하지 않는다는 docs/09 §4 규칙의 짝이기도 하다.
 */
const statusVariants = cva(
	"inline-flex shrink-0 items-center justify-center rounded-lg [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			tone: {
				success: 'bg-success/15 text-success',
				info: 'bg-info/15 text-info',
				warning: 'bg-warning/15 text-warning',
				destructive: 'bg-destructive/15 text-destructive',
				/*
				 * 🔴 muted만 겹침이다. 이 타일이 앉는 Row/Field가 이미 `bg-muted`라 같은 토큰을 쓰면
				 *    타일이 보이지 않는다 — `ROW_ACTION`이 hover에서 쓰는 것과 같은 해법이다.
				 */
				muted: 'bg-foreground/5 text-muted-foreground',
			},
		},
		defaultVariants: { tone: 'muted' },
	},
)

type ControllerStatusProps = React.ComponentProps<'span'> &
	VariantProps<typeof statusVariants> & {
		/** 아이콘을 대신해 읽히는 이름 — 상태를 색·글리프로만 전달하지 않게 한다. */
		label: string
	}

export function ControllerStatus({
	label,
	tone = 'muted',
	className,
	children,
	...props
}: ControllerStatusProps) {
	return (
		<span
			data-slot="controller-status"
			data-tone={tone}
			className={cn(statusVariants({ tone }), 'size-9', className)}
			{...props}
		>
			{children}
			<span className="sr-only">{label}</span>
		</span>
	)
}

export { statusVariants }
