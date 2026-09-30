'use client'

import { type KeyboardEvent, useRef } from 'react'
import { cn } from '@/lib/utils'
import type {
	ControllerPadPairValue,
	ControllerPadValue,
} from '@/modules/studio-controller/controller-definition'
import { clampControllerValue, useControllerPointerDrag } from './pointer-drag'

type ControllerPadPairProps = {
	/** 판 하나 위의 두 점. 각각 중심 기준 오프셋, -1(왼/위) ~ 1(오른/아래). */
	value: ControllerPadPairValue
	onChange: (value: ControllerPadPairValue) => void
	'aria-label': string
	disabled?: boolean
	/** 조작 대상의 종횡비(w/h) — Wide/Portrait/Square를 별도 variant 없이 표현한다. */
	aspectRatio?: number
	className?: string
}

type PointKey = keyof ControllerPadPairValue

/**
 * 기존 Pad에 점이 하나 더 붙은 것 — 판·십자선은 그대로고 점만 둘이다.
 *
 * 🔑 두 점은 **서로 구별되지 않는다.** 누르면 가까운 쪽이 잡히므로 창작자는 "어느 쪽이 a인가"를
 *    알 필요가 없다. 값의 a·b 순서는 런타임이 쓰는 것이고 화면에는 나타나지 않는다.
 */
export function ControllerPadPair({
	value,
	onChange,
	'aria-label': ariaLabel,
	disabled,
	aspectRatio,
	className,
}: ControllerPadPairProps) {
	// 어느 점을 잡았는지는 드래그가 끝날 때까지 유지된다 — 끌다가 다른 점을 지나쳐도 넘어가지 않는다.
	const activeRef = useRef<PointKey>('a')
	// 🔴 `drag.dragging`(state)으로 첫 이동을 가르지 않는다 — 같은 이벤트 안에서는 아직 갱신 전이라
	//    "처음인가"를 그 값으로 물으면 렌더 타이밍에 기댄 판정이 된다. 제스처 시작은 ref가 소유한다.
	const graspedRef = useRef(false)
	const drag = useControllerPointerDrag({
		disabled,
		onDrag: (ratioX, ratioY) => {
			const point = { x: ratioX * 2 - 1, y: ratioY * 2 - 1 }
			if (!graspedRef.current) {
				activeRef.current = nearestPoint(value, point)
				graspedRef.current = true
			}
			onChange({ ...value, [activeRef.current]: point })
		},
	})

	function nudge(event: KeyboardEvent<HTMLElement>) {
		if (disabled) return
		// 키보드로는 잡을 점을 가리킬 수 없으므로 Tab이 아니라 Space·Enter로 두 점을 오간다.
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault()
			activeRef.current = activeRef.current === 'a' ? 'b' : 'a'
			return
		}
		const deltas: Record<string, [number, number]> = {
			ArrowLeft: [-0.05, 0],
			ArrowRight: [0.05, 0],
			ArrowUp: [0, -0.05],
			ArrowDown: [0, 0.05],
		}
		const delta = deltas[event.key]
		if (!delta) return
		event.preventDefault()
		const active = value[activeRef.current]
		onChange({
			...value,
			[activeRef.current]: {
				x: clampControllerValue(active.x + delta[0], -1, 1),
				y: clampControllerValue(active.y + delta[1], -1, 1),
			},
		})
	}

	return (
		// 🔴 판을 fieldset **자신**으로 만들지 않는다 — fieldset은 절대 위치 자식의 컨테이닝 블록이
		//    되지 못해 `top: 80%`가 0으로 접힌다(실측: 점 두 개가 위쪽 모서리에 겹쳤다).
		//    묶음 의미는 fieldset이, 판의 레이아웃은 안쪽 div가 갖는다.
		<fieldset
			data-slot="controller-pad-pair"
			aria-label={ariaLabel}
			className="m-0 min-w-0 border-0 p-0"
		>
			<div
				// 판 위의 두 점을 직접 집는 위젯이라 대응하는 HTML 요소가 없다 — 키를 위젯이 직접 받는다.
				role="application"
				aria-label={`${ariaLabel} — 두 점. 스페이스로 점을 바꾸고 화살표로 움직입니다.`}
				aria-disabled={disabled || undefined}
				tabIndex={disabled ? -1 : 0}
				onKeyDown={nudge}
				data-dragging={drag.dragging ? 'true' : 'false'}
				{...drag.handlers}
				onPointerUp={(event) => {
					graspedRef.current = false
					drag.handlers.onPointerUp(event)
				}}
				onPointerCancel={() => {
					graspedRef.current = false
					drag.handlers.onPointerCancel()
				}}
				className={cn(
					'group/pad relative m-0 min-w-0 shrink-0 touch-none rounded-lg border-0 bg-muted p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
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
				{(['a', 'b'] as const).map((key) => (
					<div
						key={key}
						aria-hidden
						// 잡고 있는 동안만 커진다 — 손가락 아래 가려진 점의 위치를 다시 알려준다.
						className="-translate-x-1/2 -translate-y-1/2 absolute size-3.5 rounded-full bg-foreground shadow-sm transition-transform duration-150 ease-out group-data-[dragging=true]/pad:scale-125 motion-reduce:transition-none"
						style={{
							left: `${toPercent(value[key].x)}%`,
							top: `${toPercent(value[key].y)}%`,
						}}
					/>
				))}
			</div>
		</fieldset>
	)
}

function toPercent(axis: number) {
	return ((axis + 1) / 2) * 100
}

/** 누른 지점에서 더 가까운 점 — 두 점이 겹쳐 있으면 a가 잡힌다. */
export function nearestPoint(value: ControllerPadPairValue, point: ControllerPadValue): PointKey {
	const toA = Math.hypot(value.a.x - point.x, value.a.y - point.y)
	const toB = Math.hypot(value.b.x - point.x, value.b.y - point.y)
	return toB < toA ? 'b' : 'a'
}
