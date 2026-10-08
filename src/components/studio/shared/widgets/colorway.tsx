'use client'

import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { StudioColorCompound } from '@/components/studio/shared/compound-controls'
import { resolveControlAvailability } from '@/modules/studio-controller/controller-definition'
import { ColorRows } from './color-pair'

/** 배경·전경 두 색을 가진 선택지 하나(colorway)를 스와치로 고른다. */
export function ColorwayWidget(props: ControllerWidgetProps) {
	const { controls, values, bindings, onChange } = props
	const colorway = controls.value
	const swatches =
		colorway?.kind === 'select'
			? colorway.options.flatMap((option) =>
					option.colors?.length === 2
						? [
								{
									id: option.value,
									label: option.label,
									foreground: option.colors[1],
									background: option.colors[0],
								},
							]
						: [],
				)
			: []
	if (!colorway || !swatches.length) return <ColorRows {...props} />
	const current = swatches.find((swatch) => swatch.id === values[colorway.id])
	return (
		<StudioColorCompound
			allowCustom={false}
			swatches={swatches}
			disabled={resolveControlAvailability(colorway, bindings?.[colorway.id]) !== 'enabled'}
			value={{
				colorMode: 'swatch',
				swatch: current?.id ?? '',
				foreground: current?.foreground ?? '#000000',
				background: current?.background ?? '#ffffff',
			}}
			onChange={(patch) => {
				if (patch.swatch !== undefined) onChange(colorway.id, patch.swatch)
			}}
		/>
	)
}
