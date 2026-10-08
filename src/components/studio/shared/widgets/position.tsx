'use client'

import { useId } from 'react'
import {
	ControllerCompound,
	ControllerPad,
	ControllerPadPair,
} from '@/components/shared/controller'
import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import {
	isControllerPadPairValue,
	isControllerPadValue,
	resolveControlAvailability,
} from '@/modules/studio-controller/controller-definition'

/** 한 축을 판으로 고른다 — 네 방향 선택지는 대각선 영역, 점은 pad, 두 점은 pad-pair. */
export function PositionWidget({
	cluster,
	controls,
	values,
	bindings,
	onChange,
}: ControllerWidgetProps) {
	const control = controls.value
	if (!control) return null
	const value = values[control.id]
	const disabled = resolveControlAvailability(control, bindings?.[control.id]) !== 'enabled'
	return (
		<ControllerCompound label={cluster.title} className="gap-0">
			<div className="px-3 pb-3">
				{control.kind === 'select' && (
					<QuadrantPosition
						disabled={disabled}
						value={String(value)}
						onChange={(next) => onChange(control.id, next)}
					/>
				)}
				{control.kind === 'pad' && isControllerPadValue(value) && (
					<ControllerPad
						disabled={disabled}
						contained
						aria-label={cluster.title}
						value={value}
						onChange={(next) => onChange(control.id, next)}
						className="h-53"
					/>
				)}
				{control.kind === 'pad-pair' && isControllerPadPairValue(value) && (
					<ControllerPadPair
						disabled={disabled}
						aria-label={cluster.title}
						value={value}
						onChange={(next) => onChange(control.id, next)}
						className="h-53 overflow-hidden rounded-controller-pad border border-border"
					/>
				)}
			</div>
		</ControllerCompound>
	)
}

const DIRECTIONS = [
	{ value: 'top', label: '위', polygon: '0,0 100,0 50,50', clip: 'polygon(0 0,100% 0,50% 50%)' },
	{
		value: 'right',
		label: '오른쪽',
		polygon: '100,0 100,100 50,50',
		clip: 'polygon(100% 0,100% 100%,50% 50%)',
	},
	{
		value: 'bottom',
		label: '아래',
		polygon: '100,100 0,100 50,50',
		clip: 'polygon(100% 100%,0 100%,50% 50%)',
	},
	{
		value: 'left',
		label: '왼쪽',
		polygon: '0,100 0,0 50,50',
		clip: 'polygon(0 100%,0 0,50% 50%)',
	},
] as const

/** Figma의 대각선 네 영역은 연속 좌표가 아니라 네 방향 선택이다. */
function QuadrantPosition({
	disabled,
	value,
	onChange,
}: {
	disabled?: boolean
	value: string
	onChange: (value: string) => void
}) {
	const name = useId()
	return (
		<div
			data-slot="formation-position"
			role="radiogroup"
			aria-label="Position"
			className="relative h-53 overflow-hidden rounded-controller-pad border border-border bg-muted has-focus-visible:ring-2 has-focus-visible:ring-ring/30"
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				className="pointer-events-none absolute inset-0 size-full"
			>
				{DIRECTIONS.map((direction) => (
					<polygon
						key={direction.value}
						points={direction.polygon}
						className={
							value === direction.value ? 'fill-foreground/10' : 'fill-transparent'
						}
					/>
				))}
				<path
					d="M0 0L100 100M100 0L0 100"
					className="stroke-border"
					strokeWidth="1"
					strokeDasharray="2 2"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			{DIRECTIONS.map((direction) => (
				<label
					key={direction.value}
					className="absolute inset-0 cursor-pointer hover:bg-foreground/5 has-focus-visible:bg-foreground/10"
					style={{ clipPath: direction.clip }}
				>
					<input
						type="radio"
						disabled={disabled}
						name={name}
						value={direction.value}
						checked={value === direction.value}
						onChange={() => onChange(direction.value)}
						aria-label={direction.label}
						className="sr-only"
					/>
				</label>
			))}
		</div>
	)
}
