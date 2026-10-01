'use client'

import type { ReactNode } from 'react'
import { ControllerCompound } from '@/components/shared/controller/compound'
import { ControllerPad } from '@/components/shared/controller/pad'
import { ControllerPreviewChips } from '@/components/shared/controller/preview-chips'
import { ControllerRenderer } from '@/components/shared/controller-renderer'
import {
	StudioColorCompound,
	type StudioCompound,
} from '@/components/studio/shared/compound-controls'
import { ControlPanel } from '@/components/studio/shared/control-panel'
import { GraphicPresetList } from '@/components/studio/shared/graphic-preset-list'
import type { GraphicRuntimeManifest } from '@/features/graphic-generation/domain/graphic-studio-config'
import manifest from '@/features/graphic-generation/graphic-runtimes/fluted-glass/definition'
import { toFlutedGlassInput } from '@/features/graphic-generation/graphic-runtimes/fluted-glass/model'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import type {
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerRuntimeBindings,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'
import {
	resolveControllerAvailability,
	visibleControllerGroups,
} from '@/modules/studio-controller/controller-definition'

type ControlsProps = {
	manifest?: GraphicRuntimeManifest
	bindings?: ControllerRuntimeBindings
	before?: ReactNode
	fixed?: ReactNode
	after?: ReactNode
	colorControl?: ReactNode
	values: ControllerValues
	onChange: (id: string, value: ControllerControlValue) => void
	empty: boolean
	color: Pick<StudioCompound, 'date' | 'colorMode' | 'swatch' | 'foreground' | 'background'>
	onColorChange: (patch: Partial<StudioCompound>) => void
}

/** Manifest의 값·선택지와 기존 컨트롤을 사용하고 Type·Position 표면만 교체한다. */
export function FlutedGlassControls({
	manifest: config = manifest,
	bindings = {},
	before,
	after,
	fixed,
	colorControl,
	values,
	onChange,
	empty,
	color,
	onColorChange,
}: ControlsProps) {
	const groups: readonly ControllerGroupDefinition[] = visibleControllerGroups(
		getGraphicStudioRuntimeGroups(config, values),
		config.controller.left,
		config.controller.right,
	)
	const shape = groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === 'shape')
	const preset = groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === 'preset')
	const visibleIds = new Set<string>(config.controller.right)
	const detailGroups = groups
		.map((group) => ({
			...group,
			controls: group.controls.filter(
				(control) =>
					visibleIds.has(control.id) && control.id !== 'shape' && control.id !== 'source',
			),
		}))
		.filter((group) => group.controls.length > 0)

	const source = groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === 'source')
	const hasPreset = values.shape === 'linear' || values.shape === 'vertical'
	return (
		<ControlPanel
			fixed={fixed}
			basicPresets={
				!empty && hasPreset && preset?.kind === 'select' && preset.options.length ? (
					<GraphicPresetList
						definition={preset}
						binding={bindings[preset.id]}
						value={values.preset}
						onChange={(value) => onChange('preset', value)}
						disabled={!hasPreset}
					/>
				) : undefined
			}
			basic={
				<div className="flex flex-col gap-1.5 p-4">
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
							{shape?.kind === 'select' && (
								<ControllerPreviewChips
									compound
									disabled={
										resolveControllerAvailability(
											shape.availability,
											bindings[shape.id]?.availability,
										) !== 'enabled'
									}
									label="Type"
									options={shape.options}
									value={String(values.shape)}
									onChange={(value) => onChange('shape', value)}
								/>
							)}
							<ControllerCompound label="Position" className="gap-0">
								<div className="px-3 pb-3">
									<ControllerPad
										disabled={
											!source ||
											resolveControllerAvailability(
												source.availability,
												bindings.source?.availability,
											) !== 'enabled'
										}
										contained
										aria-label="Position"
										value={toFlutedGlassInput(values).input.source}
										onChange={(value) => onChange('source', value)}
										className="h-53"
									/>
								</div>
							</ControllerCompound>
						</>
					)}
				</div>
			}
			adjustment={
				(!empty && detailGroups.length > 0) || after ? (
					<div className="flex flex-col gap-3 p-4">
						{!empty && (
							<ControllerRenderer
								groups={detailGroups}
								bindings={bindings}
								values={values}
								onChange={onChange}
							/>
						)}
						{after}
					</div>
				) : undefined
			}
		/>
	)
}
