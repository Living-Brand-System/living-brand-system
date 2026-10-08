'use client'

import { useId } from 'react'
import {
	ControllerCompound,
	ControllerPad,
	ControllerPadPair,
	ControllerPreviewChips,
} from '@/components/shared/controller'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import type {
	ControllerWidgetProps,
	ControllerWidgetRegistry,
} from '@/components/studio/panel/studio-panel-slot'
import { StudioColorCompound } from '@/components/studio/shared/compound-controls'
import { GraphicPresetList } from '@/components/studio/shared/graphic-preset-list'
import { ColorPairWidget, ColorRows } from '@/components/studio/shared/widgets/color-pair'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { playgroundGraphicColors } from '@/features/graphic-generation/domain/playground-graphics'
import { getGraphicStudioRuntimeGroups } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import {
	type ControllerControlDefinition,
	isControllerPadPairValue,
	isControllerPadValue,
	resolveControlAvailability,
} from '@/modules/studio-controller/controller-definition'

/**
 * 그래픽 묶음 위젯 레지스트리(docs/10 §3.7) — 매니페스트가 적은 위젯 종류를 그래픽 표면으로 그린다.
 * 🔑 위젯은 모듈 수준 컴포넌트다 — 렌더마다 새로 만들면 React가 매번 새 종류로 보고 다시 마운트한다.
 *    런타임에 따라 달라지는 것(선택지 조합·색 펼침)은 컴포지션이 싣는 `scope`(그래픽 config)로 푼다.
 */
export type GraphicWidgetScope = { config: GraphicStudioConfig }

function graphicConfig(scope: unknown): GraphicStudioConfig {
	const config = (scope as GraphicWidgetScope | undefined)?.config
	if (!config) throw new Error('그래픽 위젯은 그래픽 컴포지션(scope.config) 안에서만 그린다.')
	return config
}

const enabled = (
	control: ControllerControlDefinition | undefined,
	bindings: ControllerWidgetProps['bindings'],
) =>
	control !== undefined &&
	resolveControlAvailability(control, bindings?.[control.id]) === 'enabled'

/** 그래픽 런타임이 아는 것(전경 펼침·면에 따른 선의 범위)만 공용 color-pair에 넘긴다. */
function GraphicColorPairWidget(props: ControllerWidgetProps) {
	const config = graphicConfig(props.scope)
	return (
		<ColorPairWidget
			{...props}
			identity={config.id}
			spread={(foreground, background) =>
				playgroundGraphicColors(
					config.id as Parameters<typeof playgroundGraphicColors>[0],
					foreground,
					background,
				)
			}
			resolveControls={(values) =>
				getGraphicStudioRuntimeGroups(config, values).flatMap((group) => group.controls)
			}
		/>
	)
}

/** 배경·전경 두 색을 가진 선택지 하나(colorway)를 스와치로 고른다. */
function ColorwayWidget(props: ControllerWidgetProps) {
	const { controls, values, bindings, onChange } = props
	const colorway = controls.value
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
	if (!colorway || !swatches.length) return <ColorRows {...props} />
	const current = swatches.find((swatch) => swatch.id === values[colorway.id])
	return (
		<StudioColorCompound
			allowCustom={false}
			swatches={swatches}
			disabled={!enabled(colorway, bindings)}
			value={{
				colorMode: 'swatch',
				swatch: current?.id ?? '',
				foreground: current?.foreground ?? '#000000',
				background: current?.background ?? '#ffffff',
			}}
			onChange={(patch) => {
				if (patch.swatch !== undefined) onChange(colorway.id, patch.swatch)
			}}
		/>
	)
}

/** 한 축을 판으로 고른다 — 네 방향 선택지는 대각선 영역, 점은 pad, 두 점은 pad-pair. */
function PositionWidget({ cluster, controls, values, bindings, onChange }: ControllerWidgetProps) {
	const control = controls.value
	if (!control) return null
	const value = values[control.id]
	const disabled = !enabled(control, bindings)
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

/** 멤버 하나가 형태 미리보기를 가진 선택지면 칩으로, 아니면 멤버 행을 한 표면에 모은다(Figma 345:17104). */
function CompoundWidget({ cluster, controls, values, bindings, onChange }: ControllerWidgetProps) {
	const members = Object.values(controls)
	const [only] = members
	if (
		members.length === 1 &&
		only.kind === 'select' &&
		only.options.some((option) => option.preview)
	)
		return (
			<ControllerPreviewChips
				compound
				disabled={!enabled(only, bindings)}
				label={cluster.title}
				options={only.options}
				value={String(values[only.id])}
				onChange={(next) => onChange(only.id, next)}
			/>
		)
	return (
		<ControllerCompound label={cluster.title}>
			<div className="flex flex-col gap-1 px-1.5 pb-1.5 [&_[data-slot=controller-row]]:bg-foreground/4">
				{members.map((control) => (
					<ControllerControlRenderer
						key={control.id}
						definition={control}
						binding={bindings?.[control.id]}
						value={values[control.id]}
						onChange={(next) => onChange(control.id, next)}
					/>
				))}
			</div>
		</ControllerCompound>
	)
}

function PresetListWidget({ controls, values, bindings, onChange }: ControllerWidgetProps) {
	const preset = controls.value
	if (!preset) return null
	return (
		<GraphicPresetList
			definition={preset}
			binding={bindings?.[preset.id]}
			value={values[preset.id]}
			onChange={(next) => onChange(preset.id, next)}
		/>
	)
}

export const GRAPHIC_WIDGETS: ControllerWidgetRegistry = {
	'color-pair': GraphicColorPairWidget,
	colorway: ColorwayWidget,
	position: PositionWidget,
	compound: CompoundWidget,
	'preset-list': PresetListWidget,
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
