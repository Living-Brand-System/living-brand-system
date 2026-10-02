'use client'

import { ColorPalette, Image, Shapes, TextFont, View, ViewOff } from '@carbon/icons-react'
import { type ReactNode, useId, useState } from 'react'
import { Controller } from '@/components/shared/controller'
import { ControllerCompound } from '@/components/shared/controller/compound'
import { ControllerRoot } from '@/components/shared/controller/layout'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { ControlPanel } from '@/components/studio/shared/control-panel'
import { ImageSlotMode } from '@/components/studio/template/image-slot-input'
import { TemplateBackgroundPanel } from '@/components/studio/template/template-background-panel'
import { TemplateLayerControls } from '@/components/studio/template/template-layer-controls'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
	findTemplateControl,
	partitionTemplateSlots,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { cn } from '@/lib/utils'
import {
	TemplateDimmer,
	TemplateGraphicControls,
	TemplateImageControls,
} from './template-media-controls'

// Figma 350:9318의 Solid 팔레트. 중복된 Deep Green은 한 선택지로 합친다.
const SOLID_COLORS = [
	'#dcf5d2',
	'#00af41',
	'#007332',
	'#00280a',
	'#ffffff',
	'#0a0a0a',
	'#dfe4f4',
	'#003087',
	'#000a32',
]

export function TemplateControls({ grouped = true }: { grouped?: boolean }) {
	const { config, layers, background, focus } = useTemplateStudio()
	const selectedKind = config.template.slots.find((slot) => slot.id === layers.selectedId)?.kind
	if (selectedKind === 'image')
		return (
			<Controller.Browser.Root className="min-h-0 h-full">
				<TemplateImageControls />
			</Controller.Browser.Root>
		)
	if (selectedKind === 'background' && background.state.type === 'graphic')
		return (
			<Controller.Browser.Root className="min-h-0 h-full">
				<TemplateGraphicControls key={background.state.graphicConfigId} />
			</Controller.Browser.Root>
		)
	if (selectedKind === 'background' && background.state.type === 'image')
		return (
			<Controller.Browser.Root className="min-h-0 h-full">
				<TemplateImageControls background />
			</Controller.Browser.Root>
		)
	if (selectedKind === 'background') {
		const slot = partitionTemplateSlots(config.template.slots).background
		const definition = slot ? findTemplateControl(config, slot.colorControlId) : undefined
		return (
			<ControlPanel
				fixed={<TemplateDimmer />}
				basic={
					definition ? (
						<Controller.Group
							title="Background"
							active={focus.target?.kind === 'canvas'}
							onActivate={() =>
								focus.set({
									sectionId: 'section:background',
									kind: 'canvas',
								})
							}
						>
							<ControllerControlRenderer
								definition={definition}
								value={background.state.color}
								onChange={(value) => {
									if (typeof value === 'string' || value === null)
										background.setColor(value)
								}}
							/>
						</Controller.Group>
					) : undefined
				}
			/>
		)
	}

	return (
		<Controller.Browser.Root className="min-h-0 h-full">
			<ControlPanel
				fixed={selectedKind === 'text' && grouped ? <TemplateColor /> : null}
				basic={<TemplateLayerControls grouped={grouped} separateSettings={grouped} />}
			/>
		</Controller.Browser.Root>
	)
}

/**
 * 선택한 묶음의 방식과 편집 완료·취소를 한 카드에 배치한다(Figma 525:8777).
 * 값과 전환은 기존 슬롯 세션을 사용한다.
 */
export function TemplateSettings({ actions }: { actions: ReactNode }) {
	const { config, layers, images } = useTemplateStudio()
	const selectedKind = config.template.slots.find((slot) => slot.id === layers.selectedId)?.kind
	const background = selectedKind === 'background'
	const slots = config.template.slots.filter(
		(slot) =>
			slot.kind === 'image' &&
			slot.id === layers.selectedId &&
			slot.access === 'editable' &&
			images.states[slot.id],
	)
	return (
		<ControllerRoot className="shrink-0 px-4 pt-1 pb-4 lg:h-auto">
			<Typography
				as="h2"
				size="sm"
				weight="semibold"
				tone="muted"
				className="flex h-9 items-center"
			>
				{background ? 'Background Setting' : 'Image Setting'}
			</Typography>
			<div className="flex flex-col gap-1 pt-1 pb-3">
				{background ? (
					<TemplateBackgroundPanel content="settings" />
				) : (
					slots.map((slot) => (
						<fieldset key={slot.id} aria-label={slot.label}>
							{slots.length > 1 && (
								<Typography size="xs" tone="muted" className="mb-1">
									{slot.label}
								</Typography>
							)}
							<ImageSlotMode
								label="Mode"
								value={images.states[slot.id].imageMode}
								onChange={(imageMode) => images.update(slot.id, { imageMode })}
							/>
						</fieldset>
					))
				)}
			</div>
			{actions}
		</ControllerRoot>
	)
}

const TEMPLATE_LAYER_ROWS = [
	{ kind: 'text', label: 'Text', Icon: TextFont },
	{ kind: 'vector', label: 'Symbol', Icon: Shapes },
	{ kind: 'image', label: 'Image', Icon: Image },
	{ kind: 'background', label: 'Background', Icon: ColorPalette },
] as const

/** 묶음 선택은 첫 슬롯 ID로 기존 세션에 연결하고, 표시 변경은 허용된 슬롯에만 적용한다. */
export function TemplateLayerGroups() {
	const { config, layers, focus, editing } = useTemplateStudio()
	const selectedKind = config.template.slots.find((slot) => slot.id === layers.selectedId)?.kind
	return (
		<section aria-label="Layers" className="flex flex-col gap-1">
			<Typography
				as="h2"
				size="sm"
				weight="semibold"
				tone="muted"
				className="flex h-9 items-center"
			>
				Layers
			</Typography>
			{TEMPLATE_LAYER_ROWS.map(({ kind, label, Icon }) => {
				const slots = config.template.slots.filter((slot) => slot.kind === kind)
				const selected = selectedKind === kind
				const editable = slots.filter(
					(slot) =>
						slot.kind !== 'background' &&
						slot.access === 'editable' &&
						slot.visibility.allowToggle,
				)
				return (
					<div
						key={kind}
						data-slot="template-layer-group"
						className={cn(
							'group flex h-9 items-center gap-1 rounded-lg pr-1.5',
							// 호버·포커스 면은 행 전체가 갖는다 — 표시·숨김 버튼까지 한 덩어리로 읽힌다.
							slots.length > 0 &&
								'hover:bg-muted has-[button:focus-visible]:bg-muted dark:hover:bg-muted/50',
							selected && 'bg-muted',
						)}
					>
						<Button
							variant="ghost"
							className="h-full min-w-0 flex-1 justify-start gap-2 rounded-lg px-3 group-hover:text-foreground hover:bg-transparent focus-visible:bg-transparent dark:hover:bg-transparent dark:focus-visible:bg-transparent"
							disabled={!slots.length || Boolean(editing.targetId)}
							aria-pressed={selected}
							onClick={() => {
								layers.select(slots[0]?.id ?? null)
								if (slots[0]) editing.begin(slots[0].id)
								focus.set(
									kind === 'background'
										? { sectionId: 'section:background', kind: 'canvas' }
										: {
												sectionId: `section:${kind}`,
												kind: 'nodes',
												nodeIds: slots.map((slot) => slot.id),
											},
								)
							}}
						>
							<Icon aria-hidden="true" />
							<span>{label}</span>
						</Button>
						{[
							{ visible: true, label: '표시', Icon: View },
							{ visible: false, label: '숨김', Icon: ViewOff },
						].map(({ visible, label: action, Icon: Eye }) => (
							<Button
								key={action}
								variant="ghost"
								size="icon-xs"
								className="rounded-sm hover:bg-foreground/5 aria-pressed:bg-foreground/10 dark:hover:bg-foreground/5"
								aria-label={`${label} ${action}`}
								aria-pressed={
									editable.length > 0 &&
									editable.every(
										(slot) => (layers.visibility[slot.id] ?? true) === visible,
									)
								}
								disabled={!editable.length}
								onClick={() => {
									for (const slot of editable) layers.setVisible(slot.id, visible)
								}}
							>
								<Eye aria-hidden="true" />
							</Button>
						))}
					</div>
				)
			})}
		</section>
	)
}

function TemplateColor() {
	const { config, text } = useTemplateStudio()
	const [mode, setMode] = useState('solid')
	const name = useId()
	const definition = config.template.textColorControlId
		? findTemplateControl(config, config.template.textColorControlId)
		: undefined
	if (definition?.kind !== 'color')
		return (
			<Typography size="sm" tone="muted">
				이 템플릿은 원본 텍스트 색상을 사용합니다.
			</Typography>
		)
	const colors = definition.values ?? SOLID_COLORS
	const editable = (definition.availability ?? 'enabled') === 'enabled'
	return (
		<ControllerCompound
			label="Color"
			control={
				<Controller.Segmented
					compact
					aria-label="텍스트 색상 모드"
					options={[
						{ value: 'solid', label: 'Solid' },
						{ value: 'custom', label: 'Custom' },
					]}
					value={mode}
					onChange={setMode}
					disabled={!editable || Boolean(definition.values)}
				/>
			}
		>
			{mode === 'solid' ? (
				<div
					role="radiogroup"
					aria-label="텍스트 색상"
					className="grid grid-cols-5 gap-1.5 px-3 pt-2 pb-3"
				>
					{colors.map((hex) => (
						<input
							key={hex}
							type="radio"
							name={name}
							aria-label={`텍스트 색상 ${hex}`}
							checked={text.color?.toLowerCase() === hex}
							disabled={!editable}
							onChange={() => text.setColor(hex)}
							style={{ backgroundColor: hex }}
							className="aspect-square w-full cursor-pointer appearance-none rounded-full border border-foreground/15 outline-none checked:ring-2 checked:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed"
						/>
					))}
				</div>
			) : (
				<div className="p-1.5 [&_[data-slot=controller-row]]:bg-foreground/4">
					<ControllerControlRenderer
						definition={definition}
						value={text.color}
						onChange={(next) => {
							if (typeof next === 'string' || next === null) text.setColor(next)
						}}
					/>
				</div>
			)}
		</ControllerCompound>
	)
}
