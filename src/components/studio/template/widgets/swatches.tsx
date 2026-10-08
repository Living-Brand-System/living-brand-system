'use client'

import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { StudioColorSwatches } from '@/components/studio/shared/color-swatches'
import { rowFocusProps } from '@/components/studio/template/template-section-focus'
import { usePublishedBrandColorValues } from '@/features/template-core/hooks/use-published-brand-color-values'
import { templateSymbolColorId } from '@/features/template-customization/domain/template-layer-composition'
import { partitionTemplateSlots } from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { resolveControlAvailability } from '@/modules/studio-controller/controller-definition'

/** 브랜드 색 하나를 스와치로 고른다 — 정본 밖 색은 열지 않는다(Custom 잠금). 제목은 접근성 이름의 대상이다. */
export function TemplateSwatchesWidget({
	cluster,
	controls,
	values,
	bindings,
	onChange,
}: ControllerWidgetProps) {
	const { config, focus } = useTemplateStudio()
	// 색의 정본은 CMS의 brand-colors다 — 텍스트·심볼이 같은 목록을 본다.
	const { values: brandColorValues } = usePublishedBrandColorValues()
	const control = controls.value
	if (control?.kind !== 'color') return null
	const colors = control.values ?? brandColorValues
	const symbol = partitionTemplateSlots(config.template.slots).vector.find(
		(slot) => templateSymbolColorId(slot.id) === control.id,
	)
	const value = values[control.id]
	return (
		<div
			{...(symbol
				? rowFocusProps(focus, {
						sectionId: symbol.id,
						kind: 'nodes',
						nodeIds: [symbol.id],
					})
				: {})}
		>
			<StudioColorSwatches
				subject={cluster.title}
				colors={colors}
				value={typeof value === 'string' ? value : null}
				onChange={(hex) => onChange(control.id, hex)}
				disabled={
					resolveControlAvailability(control, bindings?.[control.id]) !== 'enabled' ||
					colors.length === 0
				}
			/>
		</div>
	)
}
