'use client'

import { type ReactNode, useState } from 'react'
import { ControllerCompound } from '@/components/shared/controller/compound'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { GraphicControls } from '@/components/studio/graphic/graphic-controls'
import { StudioColorCompound } from '@/components/studio/shared/compound-controls'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { playgroundGraphicColors } from '@/features/graphic-generation/domain/playground-graphics'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'
import {
	type ControllerControlValue,
	type ControllerRuntimeBindings,
	controllerValuesEqual,
	createControllerValues,
	resolveControllerAvailability,
	visibleControllerGroups,
} from '@/modules/studio-controller/controller-definition'
/** 배경 그래픽도 독립 Graphic과 같은 상·하단 컨트롤을 쓴다. 상태는 Template이 소유한다. */
export function GraphicEditingControls({
	config,
	storedValues,
	bindings,
	onChange,
	fixed,
}: {
	config: GraphicStudioConfig
	storedValues: ControllerValues
	bindings: ControllerRuntimeBindings
	onChange: (id: string, value: ControllerControlValue) => void
	fixed?: ReactNode
}) {
	const [palette, setPalette] = useState<{
		colorMode: 'swatch' | 'custom'
		swatch: string
		foreground?: string
	}>({
		colorMode: 'swatch',
		swatch: '',
	})
	const defaults = createControllerValues(config.controller.groups)
	const hasPreset = 'preset' in defaults
	const values = hasPreset
		? storedValues
		: {
				...storedValues,
				preset: Object.entries(defaults).every(([id, value]) =>
					controllerValuesEqual(storedValues[id], value),
				)
					? 'default'
					: 'custom',
			}
	const controls = visibleControllerGroups(
		getGraphicStudioRuntimeGroups(config, values),
		config.controller.left,
		config.controller.right,
	).flatMap((group) => group.controls)
	const colors = controls.filter((control) => control.kind === 'color')
	const colorway = controls.find(
		(control) =>
			control.kind === 'select' &&
			control.options.some((option) => option.colors?.length === 2),
	)
	const swatches =
		colorway?.kind === 'select'
			? colorway.options.flatMap((option) =>
					option.colors?.length === 2
						? [
								{
									id: option.value,
									label: option.label,
									foreground: option.colors[1],
									background: option.colors[0],
								},
							]
						: [],
				)
			: []
	const currentSwatch = swatches.find((item) => item.id === values[colorway?.id ?? ''])
	const restrictedColors = controls.filter(
		(control) =>
			control.kind === 'color' ||
			(control.kind === 'select' && control.options.some((option) => option.colors?.length)),
	)
	const freeColors =
		colors.length > 0 &&
		colors.every(
			(control) =>
				!control.values &&
				resolveControllerAvailability(
					control.availability,
					bindings[control.id]?.availability,
				) === 'enabled',
		)
	const foregroundId =
		config.id === 'fluted-glass'
			? 'rayColor3'
			: config.id === 'forward-straight'
				? 'lineColor'
				: 'foregroundColor'
	const backgroundId = config.id === 'fluted-glass' ? 'rayBackgroundColor' : 'backgroundColor'
	const foreground =
		(config.id === 'fluted-glass' ? palette.foreground : undefined) ??
		String(values[foregroundId] ?? '#000000')
	const back = String(values[backgroundId] ?? '#ffffff')
	return (
		<GraphicControls
			manifest={config}
			values={values}
			bindings={bindings}
			empty={false}
			fixed={fixed}
			color={{ date: '', ...palette, foreground, background: back }}
			colorControl={
				freeColors ? undefined : !restrictedColors.length ? null : colorway &&
					swatches.length ? (
					<StudioColorCompound
						showDate={false}
						allowCustom={false}
						swatches={swatches}
						disabled={
							resolveControllerAvailability(
								colorway.availability,
								bindings[colorway.id]?.availability,
							) !== 'enabled'
						}
						value={{
							date: '',
							colorMode: 'swatch',
							swatch: currentSwatch?.id ?? '',
							foreground: currentSwatch?.foreground ?? foreground,
							background: currentSwatch?.background ?? back,
						}}
						onChange={(patch) => {
							if (patch.swatch !== undefined) onChange(colorway.id, patch.swatch)
						}}
					/>
				) : (
					<ControllerCompound label="Color">
						<div className="flex flex-col gap-1 p-1.5">
							{restrictedColors.map((control) => (
								<ControllerControlRenderer
									key={control.id}
									definition={control}
									value={values[control.id]}
									binding={bindings[control.id]}
									onChange={(next) => onChange(control.id, next)}
								/>
							))}
						</div>
					</ControllerCompound>
				)
			}
			onColorChange={(patch) => {
				setPalette((current) => ({
					colorMode: patch.colorMode ?? current.colorMode,
					swatch: patch.swatch ?? current.swatch,
					foreground: patch.foreground ?? current.foreground,
				}))
				if (patch.foreground === undefined && patch.background === undefined) return
				for (const [id, next] of Object.entries(
					playgroundGraphicColors(
						config.id as Parameters<typeof playgroundGraphicColors>[0],
						patch.foreground ?? foreground,
						patch.background ?? back,
					),
				))
					onChange(id, next)
			}}
			onChange={(id, next) => {
				if (!hasPreset && id === 'preset') {
					if (next === 'default')
						for (const [controlId, value] of Object.entries(defaults))
							onChange(controlId, value)
					return
				}
				onChange(id, next)
			}}
		/>
	)
}
