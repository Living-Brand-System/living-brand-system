import {
	type ControllerControlValue,
	type ControllerValues,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'
import {
	type GraphicRuntimeId,
	graphicRuntimeManifests,
} from '../graphic-runtimes/catalog/manifest.generated'
import { flutedGlassColors } from '../graphic-runtimes/fluted-glass/color-spectrum'
import { createGraphicPresetValues } from '../runtime/graphic-studio-runtime'

export function initialPlaygroundGraphics(): Record<string, ControllerValues> {
	return Object.fromEntries(
		graphicRuntimeManifests.map((manifest) => [
			manifest.id,
			createControllerValues(manifest.controller.groups),
		]),
	)
}

/** 두 색 UI와 각 런타임의 기존 입력 계약을 연결한다. 보간은 Shader만 사용한다. */
export function playgroundGraphicColors(
	id: GraphicRuntimeId,
	foreground: string,
	background: string,
): ControllerValues {
	if (id === 'fluted-glass') return flutedGlassColors(foreground, background)
	if (id === 'forward-straight') return { lineColor: foreground, backgroundColor: background }
	return { foregroundColor: foreground, backgroundColor: background }
}

export function updatePlaygroundGraphic(
	id: GraphicRuntimeId,
	current: ControllerValues,
	controlId: string,
	value: ControllerControlValue,
): ControllerValues {
	const manifest = graphicRuntimeManifests.find((item) => item.id === id)
	if (!manifest) return current
	const hasPreset = manifest.controller.groups.some((group) =>
		group.controls.some((control) => control.id === 'preset'),
	)
	if (!hasPreset && controlId === 'preset' && value === 'default') {
		return createControllerValues(manifest.controller.groups)
	}
	const next = { ...current, [controlId]: value }
	if (!hasPreset) next.preset = 'custom'
	if (hasPreset && controlId === 'preset') return createGraphicPresetValues(manifest, value)
	// 표시되는 최솟값과 실제 모델의 보정값을 일치시킨다.
	if (
		id === 'key-visual-pattern' &&
		typeof next.minWeight === 'number' &&
		typeof next.maxWeight === 'number'
	) {
		next.minWeight = Math.min(next.minWeight, next.maxWeight)
	}
	return next
}
