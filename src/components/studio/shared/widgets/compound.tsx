'use client'

import { ControllerCompound, ControllerPreviewChips } from '@/components/shared/controller'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { resolveControlAvailability } from '@/modules/studio-controller/controller-definition'

/** 멤버 하나가 형태 미리보기를 가진 선택지면 칩으로, 아니면 멤버 행을 한 표면에 모은다(Figma 345:17104). */
export function CompoundWidget({
	cluster,
	controls,
	values,
	bindings,
	onChange,
}: ControllerWidgetProps) {
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
				disabled={resolveControlAvailability(only, bindings?.[only.id]) !== 'enabled'}
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
