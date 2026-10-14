import type { ControllerControlDefinition } from './controller-definition'

type RangeControl = Extract<ControllerControlDefinition, { kind: 'range' }>
type ColorControl = Extract<ControllerControlDefinition, { kind: 'color' }>

/**
 * range 컨트롤을 찍는 함수를 만든다 — 런타임마다 단계·표시 기본값이 달라서(px 정수, 소수 둘째 자리 …)
 * 기본값은 런타임이 한 번 정하고, 호출은 다를 때만 덮는다.
 */
export function rangeControlFactory(defaults: Pick<RangeControl, 'step' | 'display'>) {
	return (
		id: string,
		label: string,
		defaultValue: number,
		min: number,
		max: number,
		step = defaults.step,
		display = defaults.display,
	): RangeControl => ({ id, kind: 'range', label, defaultValue, min, max, step, display })
}

export function colorControl(id: string, label: string, defaultValue: string): ColorControl {
	return { id, kind: 'color', label, defaultValue }
}
