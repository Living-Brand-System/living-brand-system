import type { ControllerCluster } from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlDefinition,
	ControllerGroupDefinition,
} from '@/modules/studio-controller/controller-definition'
import {
	findTemplateControl,
	findTemplateControlGroup,
	partitionTemplateSlots,
	type TemplateStudioConfig,
} from './template-studio-config'

type LayerComposition = { groups: ControllerGroupDefinition[]; clusters: ControllerCluster[] }

/**
 * 심볼 색을 묶음 멤버로 쓰려고 컨트롤로 승격한 id(docs/10 §3.7).
 * 🔑 값은 지금처럼 심볼 세션(`vectors.colors`)이 갖는다 — 발행 config에는 없는 컴포지션 전용 축이다.
 */
export const templateSymbolColorId = (slotId: string) => `${slotId}.color`

/**
 * 텍스트 레이어의 패널 컴포지션 매니페스트(Figma 529:19461) — 색 한 벌(palette)과 슬롯마다의 입력(content).
 * 컨트롤 정의는 발행 config의 것을 그대로 쓴다. 텍스트 슬롯이 없으면 `null`이다.
 */
export function deriveTemplateTextComposition(
	config: TemplateStudioConfig,
): LayerComposition | null {
	const slots = partitionTemplateSlots(config.template.slots).text.flatMap((slot) => {
		const definition = findTemplateControl(config, slot.controlId)
		return definition?.kind === 'text' ? [{ slot, definition }] : []
	})
	if (!slots.length) return null
	const group = findTemplateControlGroup(config, slots[0].slot.controlId)
	const textId = group?.id ?? 'text'
	const color = config.template.textColorControlId
		? findTemplateControl(config, config.template.textColorControlId)
		: undefined
	return {
		groups: [
			// 텍스트 입력은 슬롯마다의 묶음이 그린다 — 그룹은 제목·섹션을 갖는 자리다.
			{
				id: textId,
				title: group?.title ?? 'Text',
				role: 'content',
				controls: slots.map(({ definition }) => definition),
			},
			...(color?.kind === 'color'
				? [{ id: 'text-color', title: 'Color', controls: [color] }]
				: []),
		],
		clusters: [
			...(color?.kind === 'color'
				? [
						{
							id: 'text-color',
							title: '텍스트',
							role: 'palette' as const,
							widget: 'swatches' as const,
							members: { value: color.id },
						},
					]
				: []),
			...slots.map(({ slot }) => ({
				id: `text:${slot.id}`,
				title: slot.label,
				role: 'content' as const,
				widget: 'text-field' as const,
				group: textId,
				members: { value: slot.controlId },
			})),
		],
	}
}

/** 심볼 레이어의 패널 컴포지션 매니페스트(Figma 529:25611) — 슬롯마다 브랜드 색 하나(palette). */
export function deriveTemplateSymbolComposition(
	config: TemplateStudioConfig,
): LayerComposition | null {
	const slots = partitionTemplateSlots(config.template.slots).vector
	if (!slots.length) return null
	return {
		groups: [
			{
				id: 'symbol-color',
				title: 'Color',
				controls: slots.map(
					(slot): ControllerControlDefinition => ({
						id: templateSymbolColorId(slot.id),
						kind: 'color',
						label: slot.label,
						defaultValue: slot.color ?? null,
						...(slot.access === 'readonly'
							? { availability: 'readonly' as const }
							: {}),
					}),
				),
			},
		],
		clusters: slots.map((slot) => ({
			id: `symbol:${slot.id}`,
			title: slot.label,
			role: 'palette' as const,
			widget: 'swatches' as const,
			members: { value: templateSymbolColorId(slot.id) },
		})),
	}
}
