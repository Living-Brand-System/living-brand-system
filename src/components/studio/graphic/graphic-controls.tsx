'use client'

import { type ReactNode, useId } from 'react'
import { ControllerCompound } from '@/components/shared/controller/compound'
import { ControllerPad } from '@/components/shared/controller/pad'
import { ControllerPadPair } from '@/components/shared/controller/pad-pair'
import {
	ControllerControlRenderer,
	ControllerRenderer,
} from '@/components/shared/controller-renderer'
import { FlutedGlassControls } from '@/components/studio/graphic/fluted-glass-controls'
import {
	StudioColorCompound,
	type StudioCompound,
} from '@/components/studio/shared/compound-controls'
import { ControlPanel } from '@/components/studio/shared/control-panel'
import { GraphicPresetList } from '@/components/studio/shared/graphic-preset-list'
import type { GraphicRuntimeManifest } from '@/features/graphic-generation/domain/graphic-studio-config'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import {
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerRuntimeBindings,
	type ControllerValues,
	isControllerPadPairValue,
	isControllerPadValue,
	resolveControllerAvailability,
	visibleControllerGroups,
} from '@/modules/studio-controller/controller-definition'

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

/** Figma의 대각선 네 영역은 연속 좌표가 아니라 기존 anchor 선택이다. */
function FormationPosition({
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

export function GraphicControls({
	manifest,
	values,
	onChange,
	empty,
	color,
	onColorChange,
	bindings = {},
	before,
	after,
	fixed,
	colorControl,
}: {
	bindings?: ControllerRuntimeBindings
	before?: ReactNode
	fixed?: ReactNode
	after?: ReactNode
	colorControl?: ReactNode
	manifest: GraphicRuntimeManifest
	values: ControllerValues
	onChange: (id: string, value: ControllerControlValue) => void
	empty: boolean
	color: Pick<StudioCompound, 'date' | 'colorMode' | 'swatch' | 'foreground' | 'background'>
	onColorChange: (patch: Partial<StudioCompound>) => void
}) {
	if (manifest.id === 'fluted-glass')
		return (
			<FlutedGlassControls
				manifest={manifest}
				bindings={bindings}
				before={before}
				after={after}
				fixed={fixed}
				colorControl={colorControl}
				values={values}
				onChange={onChange}
				empty={empty}
				color={color}
				onColorChange={onColorChange}
			/>
		)
	const groups = visibleControllerGroups(
		getGraphicStudioRuntimeGroups(manifest, values),
		manifest.controller.left,
		manifest.controller.right,
	)
	const controls = groups.flatMap((group) => group.controls)
	if (
		!manifest.controller.left ||
		![
			'forward-straight',
			'key-visual-line',
			'key-visual-formation',
			'key-visual-pattern',
		].includes(manifest.id)
	)
		return (
			<ControlPanel
				fixed={fixed}
				basic={
					<ControllerRenderer
						groups={groups}
						values={values}
						bindings={bindings}
						onChange={onChange}
					/>
				}
			/>
		)

	const preset = controls.find((control) => control.id === 'preset')
	const position = controls.find((control) => ['anchor', 'path', 'origin'].includes(control.id))
	const visible = new Set(manifest.controller.right)
	const details = groups
		.map((group) => ({
			...group,
			controls: group.controls.filter(
				(control) => visible.has(control.id) && control.id !== position?.id,
			),
		}))
		.filter((group) => group.controls.length > 0)
	const left = new Set(manifest.controller.left)
	const direction = groups.filter(
		(group) =>
			['direction', 'perspective'].includes(group.id) &&
			group.controls.some((control) => left.has(control.id)),
	)
	const extra = groups
		.map((group) => ({
			...group,
			controls: group.controls.filter(
				(control) =>
					left.has(control.id) &&
					control.id !== preset?.id &&
					control.id !== position?.id &&
					control.kind !== 'color' &&
					!(
						control.kind === 'select' &&
						control.options.some((option) => option.colors?.length)
					) &&
					!direction.some((group) => group.controls.includes(control)),
			),
		}))
		.filter((group) => group.controls.length)

	return (
		<ControlPanel
			fixed={fixed}
			basicPresets={
				!empty && preset?.kind === 'select' && preset.options.length ? (
					<GraphicPresetList
						definition={preset}
						binding={bindings[preset.id]}
						value={values.preset}
						onChange={(value) => onChange('preset', value)}
					/>
				) : undefined
			}
			basic={
				<div className="flex flex-col gap-1.5">
					{before}
					{!empty && (
						<>
							{colorControl !== undefined ? (
								colorControl
							) : (
								<StudioColorCompound
									value={color}
									onChange={onColorChange}
									showDate={false}
								/>
							)}
							{position && (
								<GraphicPosition
									position={position}
									disabled={
										resolveControllerAvailability(
											position.availability,
											bindings[position.id]?.availability,
										) !== 'enabled'
									}
									positionValue={values[position.id]}
									onChange={onChange}
								/>
							)}
							{direction.length > 0 && (
								<ControllerCompound label="Direction">
									<div className="flex flex-col gap-1 px-1.5 pb-1.5 [&_[data-slot=controller-row]]:bg-foreground/4">
										{direction
											.flatMap((group) => group.controls)
											.map((control) => (
												<ControllerControlRenderer
													key={control.id}
													definition={control}
													binding={bindings[control.id]}
													value={values[control.id]}
													onChange={(value) =>
														onChange(control.id, value)
													}
												/>
											))}
									</div>
								</ControllerCompound>
							)}
							<ControllerRenderer
								groups={extra}
								values={values}
								bindings={bindings}
								onChange={onChange}
							/>
						</>
					)}
				</div>
			}
			adjustment={
				(!empty && details.length > 0) || after ? (
					<div className="flex flex-col gap-3">
						{!empty && (
							<ControllerRenderer
								groups={details}
								values={values}
								onChange={onChange}
								bindings={{
									...bindings,
									...(manifest.id === 'key-visual-pattern' &&
									values.variableWeight === false
										? {
												maxWeight: {
													...bindings.maxWeight,
													availability: 'disabled' as const,
												},
											}
										: {}),
								}}
							/>
						)}
						{after}
					</div>
				) : undefined
			}
		/>
	)
}

function GraphicPosition({
	disabled,
	position,
	positionValue,
	onChange,
}: {
	disabled?: boolean
	position: ControllerControlDefinition
	positionValue: ControllerControlValue
	onChange: (id: string, value: ControllerControlValue) => void
}) {
	return (
		<ControllerCompound label="Position" className="gap-0">
			<div className="px-3 pb-3">
				{position.id === 'anchor' && (
					<FormationPosition
						disabled={disabled}
						value={String(positionValue)}
						onChange={(value) => onChange('anchor', value)}
					/>
				)}
				{position.kind === 'pad' && isControllerPadValue(positionValue) && (
					<ControllerPad
						disabled={disabled}
						contained
						aria-label="Position"
						value={positionValue}
						onChange={(value) => onChange(position.id, value)}
						className="h-53"
					/>
				)}
				{position.kind === 'pad-pair' && isControllerPadPairValue(positionValue) && (
					<ControllerPadPair
						disabled={disabled}
						aria-label="Position"
						value={positionValue}
						onChange={(value) => onChange(position.id, value)}
						className="h-53 overflow-hidden rounded-controller-pad border border-border"
					/>
				)}
			</div>
		</ControllerCompound>
	)
}
