'use client'

import { ColorPalette, Image, Shapes, TextFont, View, ViewOff } from '@carbon/icons-react'
import type { ReactNode } from 'react'
import { Controller } from '@/components/shared/controller'
import { ControllerRoot } from '@/components/shared/controller/layout'
import {
	ControlPanel,
	type ControlPanelComposition,
	ControlPanelCompositionProvider,
} from '@/components/studio/shared/control-panel'
import { StudioPanelSlot } from '@/components/studio/shared/studio-panel-slot'
import { ImageSlotMode } from '@/components/studio/template/image-slot-input'
import { useTemplateBackgroundComposition } from '@/components/studio/template/template-background-composition'
import { TemplateLayerPanel } from '@/components/studio/template/template-layer-composition'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { cn } from '@/lib/utils'
import { TemplateGraphicControls, TemplateImageControls } from './template-media-controls'

export function TemplateControls() {
	const { config, layers, background } = useTemplateStudio()
	const backgroundComposition = useTemplateBackgroundComposition()
	const selectedKind = config.template.slots.find((slot) => slot.id === layers.selectedId)?.kind
	if (selectedKind === 'image')
		return (
			<Controller.Browser.Root className="min-h-0 h-full">
				<TemplateImageControls />
			</Controller.Browser.Root>
		)
	if (selectedKind === 'background')
		return (
			// 배경의 고정·색 자리는 패널 컴포지션이 채운다(docs/10 §3.7) — 방식별 화면은 자기 몫만 꽂는다.
			<ControlPanelCompositionProvider value={backgroundComposition}>
				<Controller.Browser.Root className="min-h-0 h-full">
					{background.state.type === 'graphic' ? (
						<TemplateGraphicControls key={background.state.graphicConfigId} />
					) : background.state.type === 'image' ? (
						<TemplateImageControls background />
					) : (
						<ControlPanel />
					)}
				</Controller.Browser.Root>
			</ControlPanelCompositionProvider>
		)

	return (
		<Controller.Browser.Root className="min-h-0 h-full">
			{selectedKind === 'text' || selectedKind === 'vector' ? (
				<TemplateLayerPanel key={selectedKind} kind={selectedKind} />
			) : (
				<ControlPanel />
			)}
		</Controller.Browser.Root>
	)
}

/**
 * 선택한 묶음의 방식과 편집 완료·취소를 한 카드에 배치한다(Figma 525:8777).
 * 값과 전환은 기존 슬롯 세션을 사용한다.
 */
export function TemplateSettings({ actions }: { actions: ReactNode }) {
	const { config, layers, images } = useTemplateStudio()
	const backgroundComposition = useTemplateBackgroundComposition()
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
				{background
					? backgroundComposition && (
							<BackgroundSettings composition={backgroundComposition} />
						)
					: slots.map((slot) => (
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
						))}
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

/** 배경 방식(source) 행 — 카드가 제목을 가지므로 그룹 제목 없이 행만 쌓는다(docs/10 §3.7). */
function BackgroundSettings({
	composition: { slots, ...render },
}: {
	composition: ControlPanelComposition
}) {
	return <StudioPanelSlot flat entries={slots.settings} {...render} />
}
