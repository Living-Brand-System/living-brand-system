'use client'

import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { rowFocusProps } from '@/components/studio/template/template-section-focus'
import { TextSlotInput } from '@/components/studio/template/text-slot-input'
import { TEMPLATE_TEXT_SECTION_ID } from '@/features/template-customization/contexts/template-studio-context'
import { partitionTemplateSlots } from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/** 텍스트 슬롯 하나 — 발행 정의에 슬롯의 입력 제약(형식·줄 수)을 얹은 행. 행을 만지면 그 상자를 집는다. */
export function TemplateTextFieldWidget({ controls, values, onChange }: ControllerWidgetProps) {
	const { config, focus } = useTemplateStudio()
	const definition = controls.value
	const slot = partitionTemplateSlots(config.template.slots).text.find(
		(item) => item.controlId === definition?.id,
	)
	if (definition?.kind !== 'text' || !slot) return null
	const value = values[definition.id]
	return (
		<div
			data-text-slot={slot.id}
			className="flex flex-col gap-1"
			{...rowFocusProps(focus, {
				sectionId: TEMPLATE_TEXT_SECTION_ID,
				kind: 'nodes',
				nodeIds: [slot.id],
			})}
		>
			<TextSlotInput
				definition={definition}
				input={slot.input}
				value={typeof value === 'string' ? value : (definition.defaultValue ?? '')}
				onChange={(next) => onChange(definition.id, next)}
			/>
		</div>
	)
}
