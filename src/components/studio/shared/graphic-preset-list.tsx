import { Controller } from '@/components/shared/controller'
import { Button } from '@/components/ui/button'
import {
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerRuntimeBinding,
	resolveControlAvailability,
} from '@/modules/studio-controller/controller-definition'

export function GraphicPresetList({
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
