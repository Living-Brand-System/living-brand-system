'use client'

import { ColorPalette, Image, Shapes, TextFont, View, ViewOff } from '@carbon/icons-react'
import type { ReactNode } from 'react'
import { ControllerRoot } from '@/components/shared/controller'
import type { ControlPanelComposition } from '@/components/studio/panel/control-panel'
import { StudioPanelSlot } from '@/components/studio/panel/studio-panel-slot'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { cn } from '@/lib/utils'

/**
 * 선택한 묶음의 방식과 편집 완료·취소를 한 카드에 배치한다(Figma 525:8777).
 * 방식 행은 패널 모델(`useTemplatePanel`)의 settings 슬롯이다 — 오른쪽 패널과 같은 계산을 쓴다.
 */
export function TemplateSettings({
	settings,
	actions,
}: {
	settings: ControlPanelComposition | null
	actions: ReactNode
}) {
	const { config, layers } = useTemplateStudio()
	const selected = config.template.slots.find((slot) => slot.id === layers.selectedId)
	const selectedKind = selected?.kind
	return (
		<ControllerRoot className="shrink-0 px-4 pt-1 pb-4 lg:h-auto">
			<Typography
				as="h2"
				size="sm"
				weight="semibold"
				tone="muted"
				className="flex h-9 items-center"
			>
				{selectedKind === 'background' ? 'Background Setting' : 'Image Setting'}
			</Typography>
			<div className="flex flex-col gap-1 pt-1 pb-3">
				{settings &&
					(selectedKind === 'image' && selected ? (
						// 슬롯 방식은 그 슬롯의 묶음이다 — 슬롯 이름으로 묶어 읽힌다.
						<fieldset aria-label={selected.label}>
							<SettingsRows composition={settings} />
						</fieldset>
					) : (
						<SettingsRows composition={settings} />
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

/** 묶음 선택은 첫 슬롯 ID로 기존 세션에 연결하고, 표시 변경은 편집 권한과 무관하게 묶음 전체에 적용한다. */
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
									slots.length > 0 &&
									slots.every(
										(slot) => (layers.visibility[slot.id] ?? true) === visible,
									)
								}
								disabled={!slots.length}
								onClick={() => {
									for (const slot of slots) layers.setVisible(slot.id, visible)
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

/** 방식(source) 행 — 카드가 제목을 가지므로 그룹 제목 없이 행만 쌓는다(docs/10 §3.7). */
function SettingsRows({
	composition: { slots, ...render },
}: {
	composition: ControlPanelComposition
}) {
	return <StudioPanelSlot flat entries={slots.settings} {...render} />
}
