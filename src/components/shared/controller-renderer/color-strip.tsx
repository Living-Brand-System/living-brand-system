'use client'

import { Controller } from '@/components/shared/controller'
import {
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerRuntimeBindings,
	type ControllerValues,
	resolveControlAvailability,
	resolveControlValue,
} from '@/modules/studio-controller/controller-definition'
import { ReadonlyRow } from './control'

type ColorControl = Extract<ControllerControlDefinition, { kind: 'color' }>
type SelectControl = Extract<ControllerControlDefinition, { kind: 'select' }>

/** 색 조합 그룹을 「팔레트 칩 + 한 띠」로 투영한다. 되돌리기는 조합을 한 번에 비운다. */
export function ColorStripGroup({
	palette,
	colors,
	title,
	values,
	bindings,
	onChange,
}: {
	palette: SelectControl | null
	colors: readonly ColorControl[]
	title: string
	values: ControllerValues
	bindings?: ControllerRuntimeBindings
	onChange: (controlId: string, value: ControllerControlValue) => void
}) {
	const resolved = colors.map((control) => {
		const value = resolveControlValue(control, values)
		return {
			control,
			availability: resolveControlAvailability(control, bindings?.[control.id]),
			color: typeof value === 'string' ? value : null,
		}
	})
	// 한 칸이라도 잠기면 띠를 통째로 잠근다 — 칸마다 다른 잠금은 띠 안에서 읽히지 않는다.
	const disabled = resolved.some(({ availability }) => availability === 'disabled')
	const readonly = resolved.some(({ availability }) => availability === 'readonly')
	const selected = palette && typeof values[palette.id] === 'string' ? values[palette.id] : null
	const selectedPalette =
		palette && (selected ?? palette.defaultValue) !== null
			? ((selected ?? palette.defaultValue) as string)
			: undefined
	if (!disabled && readonly) {
		return (
			<>
				{palette && (
					<ReadonlyRow
						label={palette.label}
						value={
							palette.options.find((option) => option.value === selectedPalette)
								?.label ?? '—'
						}
					/>
				)}
				{resolved.map(({ control, color }) => (
					<ReadonlyRow key={control.id} label={control.label} value={color ?? '—'} />
				))}
			</>
		)
	}

	return (
		<>
			{palette && (
				<Controller.ColorChips
					label={palette.label}
					options={palette.options}
					value={selectedPalette}
					disabled={disabled}
					onChange={(value) => {
						onChange(palette.id, value)
						// 고른 조합이 칸을 순서대로 채운다 — 띠가 화면의 색과 어긋나지 않는다.
						const option = palette.options.find(
							(candidate) => candidate.value === value,
						)
						for (const [index, hex] of (option?.colors ?? []).entries()) {
							const control = colors[index]
							if (control) onChange(control.id, hex)
						}
					}}
				/>
			)}
			<Controller.ColorStrip
				label={title}
				disabled={disabled}
				swatches={resolved.map(({ control, color }) => ({
					id: control.id,
					label: control.label,
					value: color ?? '#000000',
					isEmpty: color === null,
				}))}
				onChange={(id, hex) => onChange(id, hex)}
				onReset={() => {
					// 조합이 한 단위이므로 고른 조합까지 함께 되돌린다.
					// 🔴 칸을 비우지 않고 **원래 색으로 채운다.** null은 「미설정」이라 띠가 흐린 검정이
					//    되는데 화면에는 기본색이 그려져 띠가 거짓말을 한다. 되돌릴 색은 팔레트가 있으면
					//    기본 조합이고, 없으면 각 칸이 선언한 기본값이다(팔레트 없는 런타임도 같아야 한다).
					if (palette) onChange(palette.id, null)
					const fallback = palette?.options.find(
						(option) => option.value === palette.defaultValue,
					)?.colors
					for (const [index, { control }] of resolved.entries()) {
						onChange(control.id, fallback?.[index] ?? control.defaultValue)
					}
				}}
			/>
		</>
	)
}
