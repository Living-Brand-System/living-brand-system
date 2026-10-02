'use client'

import type { KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import type { ControllerPadValue } from '@/modules/studio-controller/controller-definition'
import { clampControllerValue, useControllerPointerDrag } from './pointer-drag'

type ControllerPadProps = {
	/** 중심 기준 오프셋, -1(왼/위) ~ 1(오른/아래). */
	value: ControllerPadValue
	onChange: (value: ControllerPadValue) => void
	'aria-label': string
	disabled?: boolean
	/** 조작 대상의 종횡비(w/h) — Wide/Portrait/Square를 별도 variant 없이 표현한다. */
	aspectRatio?: number
	/** Position 컴파운드 내부의 테두리와 모서리. */
	contained?: boolean
	className?: string
}

/** Figma Controller API의 2축 Value Range — 포인터와 화살표 키로 조절한다. */
export function ControllerPad({
	value,
	onChange,
	'aria-label': ariaLabel,
	disabled,
	aspectRatio,
	contained = false,
	className,
}: ControllerPadProps) {
	// 위치를 직접 찍는 컨트롤이라 클릭을 따로 받지 않는다 — 누른 지점이 곧 값이다.
	const drag = useControllerPointerDrag({
		disabled,
		onDrag: (ratioX, ratioY) => onChange({ x: ratioX * 2 - 1, y: ratioY * 2 - 1 }),
	})

	function nudge(event: KeyboardEvent<HTMLDivElement>) {
		if (disabled) return
		const deltas: Record<string, [number, number]> = {
			ArrowLeft: [-0.05, 0],
			ArrowRight: [0.05, 0],
			ArrowUp: [0, -0.05],
			ArrowDown: [0, 0.05],
		}
		const delta = deltas[event.key]
		if (!delta) return
		event.preventDefault()
		onChange({
			x: clampControllerValue(value.x + delta[0], -1, 1),
			y: clampControllerValue(value.y + delta[1], -1, 1),
		})
	}

	return (
		<div
			data-slot="controller-pad"
			role="slider"
			aria-label={ariaLabel}
			aria-valuemin={-100}
			aria-valuemax={100}
			aria-valuenow={Math.round(value.x * 100)}
			aria-valuetext={`가로 ${Math.round(value.x * 100)}%, 세로 ${Math.round(value.y * 100)}%`}
			aria-disabled={disabled || undefined}
			tabIndex={disabled ? -1 : 0}
			onKeyDown={nudge}
			data-dragging={drag.dragging ? 'true' : 'false'}
			{...drag.handlers}
			className={cn(
				'group/pad relative shrink-0 touch-none bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
				contained
					? 'overflow-hidden rounded-controller-pad border border-border'
					: 'rounded-lg',
				!aspectRatio && 'h-36 w-full',
				disabled && 'pointer-events-none opacity-50',
				className,
			)}
			// 세로 상한 18rem(≈디자인 Portrait 283px) — 세로형은 너비를 줄여 대상 비율을 지킨다.
			style={
				aspectRatio
					? {
							aspectRatio,
							marginInline: 'auto',
							width: `min(100%, calc(18rem * ${aspectRatio}))`,
						}
					: undefined
			}
		>
			<div aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-border" />
			<div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
			<div
				aria-hidden
				// 잡고 있는 동안만 커진다 — 손가락 아래 가려진 점의 위치를 다시 알려준다.
				className="-translate-x-1/2 -translate-y-1/2 absolute size-3.5 rounded-full bg-foreground shadow-sm transition-transform duration-150 ease-out group-data-[dragging=true]/pad:scale-125 motion-reduce:transition-none"
				style={{
					left: `${((value.x + 1) / 2) * 100}%`,
					top: `${((value.y + 1) / 2) * 100}%`,
				}}
			/>
		</div>
	)
}
