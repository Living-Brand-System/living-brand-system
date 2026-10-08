'use client'

import {
	animate,
	domAnimation,
	LazyMotion,
	useMotionValue,
	useReducedMotion,
	useTransform,
} from 'motion/react'
import * as m from 'motion/react-m'
import { type KeyboardEvent, useEffect, useRef } from 'react'
import { MOTION } from '@/lib/motion'
import { cn } from '@/lib/utils'
import {
	clampControllerValue,
	snapControllerValue,
	useControllerPointerDrag,
} from '../internal/pointer-drag'

type ControllerRangeProps = {
	label: string
	value: number
	min: number
	max: number
	step: number
	format?: (value: number) => string
	onChange: (value: number) => void
	disabled?: boolean
	className?: string
}

/** Figma Controller API의 단일 Value Range — 채움 폭과 화살표 키로 값을 표현한다. */
export function ControllerRange({
	label,
	value,
	min,
	max,
	step,
	format = String,
	onChange,
	disabled,
	className,
}: ControllerRangeProps) {
	const span = max - min
	const ratio = span > 0 ? clampControllerValue((value - min) / span, 0, 1) : 0
	const resolvedDisabled = disabled || span <= 0 || step <= 0
	const reducedMotion = useReducedMotion()

	/**
	 * 채움과 핸들의 위치는 prop이 아니라 이 값이 소유한다 — 드래그는 손을 즉시 따라가야 하고(jump)
	 * 클릭은 먼 목표까지 미끄러져야 해서(animate), 같은 위치가 상황에 따라 다르게 움직여야 한다.
	 */
	const fill = useMotionValue(ratio)
	// 핸들(3px)이 트랙 양끝에서 반만 보이지 않도록 안쪽에 가둔다.
	const handleLeft = useTransform(
		fill,
		(current) => `clamp(4px, calc(${current * 100}% - 1.5px), calc(100% - 7px))`,
	)
	const slideRef = useRef<ReturnType<typeof animate> | null>(null)

	const snap = (raw: number) => snapControllerValue(raw, min, max, step)
	const ratioOf = (next: number) =>
		span > 0 ? clampControllerValue((next - min) / span, 0, 1) : 0

	const drag = useControllerPointerDrag({
		disabled: resolvedDisabled,
		onDrag: (ratioX) => {
			slideRef.current?.stop()
			slideRef.current = null
			const next = snap(min + ratioX * span)
			fill.jump(ratioOf(next))
			onChange(next)
		},
		onClick: (ratioX) => {
			const next = snap(min + ratioX * span)
			slideRef.current?.stop()
			slideRef.current = reducedMotion
				? null
				: animate(fill, ratioOf(next), {
						...MOTION.control,
						onComplete: () => {
							slideRef.current = null
						},
					})
			if (reducedMotion) fill.jump(ratioOf(next))
			onChange(next)
		},
	})

	// 밖에서 값이 바뀌면(키보드·프리셋·리셋) 채움을 맞춘다. 진행 중인 스프링·드래그는 자기 위치를 갖는다.
	useEffect(() => {
		if (!drag.dragging && !slideRef.current) fill.jump(ratio)
	}, [ratio, drag.dragging, fill])

	function nudge(event: KeyboardEvent<HTMLDivElement>) {
		if (resolvedDisabled) return
		const direction =
			event.key === 'ArrowRight' || event.key === 'ArrowUp'
				? 1
				: event.key === 'ArrowLeft' || event.key === 'ArrowDown'
					? -1
					: 0
		if (!direction) return
		event.preventDefault()
		// 드래그·클릭과 같은 격자에 얹는다 — 화살표만 다른 경로를 타면 눌러서 만든 값과 밀어서 만든 값이 갈린다.
		onChange(snap(value + direction * step))
	}

	return (
		<div
			data-slot="controller-range"
			data-dragging={drag.dragging ? 'true' : 'false'}
			role="slider"
			aria-label={label}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-valuenow={value}
			aria-valuetext={format(value)}
			aria-disabled={resolvedDisabled || undefined}
			tabIndex={resolvedDisabled ? -1 : 0}
			onKeyDown={nudge}
			{...drag.handlers}
			className={cn(
				'group/range relative h-9 w-full shrink-0 cursor-ew-resize touch-none select-none overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
				resolvedDisabled && 'pointer-events-none opacity-50',
				className,
			)}
		>
			<LazyMotion features={domAnimation}>
				{/* 폭이 아니라 scaleX로 늘린다 — 레이아웃을 다시 재지 않으므로 드래그가 프레임을 떨어뜨리지 않는다. */}
				<m.div
					aria-hidden
					className="absolute inset-y-0 left-0 w-full origin-left bg-foreground/10"
					style={{ scaleX: fill }}
				/>
				{/*
				 * 핸들은 조작 중에만 값의 정확한 지점을 가리킨다 — 쉬는 동안에는 채움 경계로 충분하다.
				 * 등장·강조는 CSS 전환이고(포인터가 아니라 상태에 따르므로), 위치만 위 motion 값이 움직인다.
				 */}
				<m.div
					aria-hidden
					data-slot="controller-range-handle"
					className="-translate-y-1/2 absolute top-1/2 h-5 w-[3px] scale-x-25 rounded-full bg-foreground opacity-0 transition-[opacity,scale] duration-(--motion-feedback) ease-out group-focus-visible/range:scale-x-100 group-focus-visible/range:opacity-50 group-hover/range:scale-x-100 group-hover/range:opacity-50 group-data-[dragging=true]/range:scale-x-100 group-data-[dragging=true]/range:opacity-90 motion-reduce:transition-none"
					style={{ left: handleLeft }}
				/>
			</LazyMotion>
			<div className="relative flex h-full items-center justify-between px-3">
				<span className="text-sm text-muted-foreground">{label}</span>
				<span className="font-mono text-sm text-muted-foreground">{format(value)}</span>
			</div>
		</div>
	)
}
