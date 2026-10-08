'use client'

import { Controller } from '@/components/shared/controller'
import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { Button } from '@/components/ui/button'
import {
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerRuntimeBinding,
	resolveControlAvailability,
} from '@/modules/studio-controller/controller-definition'

/** 프리셋 select 하나를 카드 목록으로 그린다(`preset-list` 묶음 — 결정 2026-10-02). */
export function PresetListWidget({ controls, values, bindings, onChange }: ControllerWidgetProps) {
	const preset = controls.value
	if (!preset) return null
	return (
		<PresetList
			definition={preset}
			binding={bindings?.[preset.id]}
			value={values[preset.id]}
			onChange={(next) => onChange(preset.id, next)}
		/>
	)
}

function PresetList({
	definition,
	binding,
	value,
	onChange,
	disabled = false,
}: {
	definition?: ControllerControlDefinition
	binding?: ControllerRuntimeBinding
	value: ControllerControlValue
	onChange: (value: string) => void
	disabled?: boolean
}) {
	if (definition?.kind !== 'select' || !definition.options.length) return null
	return (
		<Controller.Group title="Presets">
			<div className="grid grid-cols-2 gap-2">
				{definition.options.map((option) => (
					<Button
						key={option.value}
						variant="muted"
						className="h-auto min-h-16 whitespace-normal aria-pressed:ring-2 aria-pressed:ring-ring"
						disabled={
							disabled ||
							resolveControlAvailability(definition, binding) !== 'enabled'
						}
						aria-pressed={value === option.value}
						onClick={() => onChange(option.value)}
					>
						{option.label}
					</Button>
				))}
			</div>
		</Controller.Group>
	)
}
