import { CI_VARIANTS } from '@/features/template-core/domain/ci-variants'
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
 * CI 색 버전을 컨트롤로 세운 id(docs/10 §3.7).
 * 🔑 값은 CI 세션(`vectors.variants`)이 갖는다 — 발행 config에는 없는 컴포지션 전용 축이다.
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

/**
 * CI 레이어의 패널 컴포지션 매니페스트 — 슬롯마다 색 버전 하나(palette).
 * 선택지는 그 로고가 「로고」에 가진 색 버전뿐이다(CI_VARIANTS 순서). 버전이 없는 벡터는 세우지 않는다.
 */
export function deriveTemplateSymbolComposition(
	config: TemplateStudioConfig,
): LayerComposition | null {
	const slots = partitionTemplateSlots(config.template.slots).vector.filter(
		(slot) => slot.variants.length > 0,
	)
	if (!slots.length) return null
	return {
		groups: [
			{
				id: 'symbol-color',
				title: 'Color',
				role: 'palette',
				controls: slots.map(
					(slot): ControllerControlDefinition => ({
						id: templateSymbolColorId(slot.id),
						kind: 'select',
						label: slot.label,
						defaultValue: slot.variant ?? null,
						options: slot.variants.map(({ variant }) => ({
							value: variant,
							label:
								CI_VARIANTS.find(({ value }) => value === variant)?.label ??
								variant,
						})),
						...(slot.access === 'readonly'
							? { availability: 'readonly' as const }
							: {}),
					}),
				),
			},
		],
		clusters: [],
	}
}
