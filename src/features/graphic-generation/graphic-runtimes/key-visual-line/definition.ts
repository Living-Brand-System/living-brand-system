import { defineGraphicRuntime } from '@/features/graphic-generation/graphic-runtimes/define-graphic-runtime'
import type {
	ControllerControlDefinition,
	ControllerPadPairValue,
	ControllerPadValue,
} from '@/modules/studio-controller/controller-definition'

/**
 * px 단위 control은 모두 캔버스 짧은 변이 이 길이일 때를 기준으로 읽는다.
 * 실제 렌더는 `min(width, height) / 기준값`으로 환산하므로 미리보기와 export가 같은 구도를 만든다.
 */
export const KEY_VISUAL_LINE_REFERENCE_BASE = 1080

/**
 * 가이드라인 B.8 TYPE A p.62 COLOR COMBINATION ⑤의 네 조합.
 * 🔴 임의 색이 아니다 — 조합은 그 페이지가, hex는 `brand-colors` 정본이 갖는다.
 */
export const KEY_VISUAL_LINE_COLORWAYS = {
	darkGreenGreen: { label: '다크그린 · 그린', background: '#00280A', line: '#00AF41' },
	navyBlue: { label: '네이비 · 블루', background: '#000A32', line: '#003087' },
	greenLightGreen: { label: '그린 · 연그린', background: '#00AF41', line: '#DCF5D2' },
	lightGreenGreen: { label: '연그린 · 그린', background: '#DCF5D2', line: '#00AF41' },
} as const
export type KeyVisualLineColorwayId = keyof typeof KEY_VISUAL_LINE_COLORWAYS

/**
 * 가이드라인 B.8 TYPE A — 2D LINE의 기본값.
 *
 * Start Line과 End Line 두 선분을 세우고 그 사이를 **양 끝점끼리** 블렌딩한다.
 * 두께는 두꺼움→얇음, 길이는 짧음→긺으로 간다.
 */
export const KEY_VISUAL_LINE_DEFAULT_INPUT = {
	colorway: 'darkGreenGreen',
	lineCount: 7,
	angleStart: 75,
	angleSpread: 15,
	lengthStart: 70,
	lengthEnd: 180,
	weightThin: 2,
	weightRatio: 6,
	path: { a: { x: 0.2, y: 0.8 }, b: { x: 0.8, y: 0.25 } },
} as const

function toControllerPadValue(point: { x: number; y: number }): ControllerPadValue {
	return { x: point.x * 2 - 1, y: point.y * 2 - 1 }
}

export function toControllerPadPairValue(path: {
	a: { x: number; y: number }
	b: { x: number; y: number }
}): ControllerPadPairValue {
	return { a: toControllerPadValue(path.a), b: toControllerPadValue(path.b) }
}

type RangeControl = Extract<ControllerControlDefinition, { kind: 'range' }>

function rangeControl(
	id: string,
	label: string,
	defaultValue: number,
	min: number,
	max: number,
	step = 1,
	display: RangeControl['display'] = { precision: 0, unit: 'px' },
): RangeControl {
	return { id, kind: 'range', label, defaultValue, min, max, step, display }
}

export default defineGraphicRuntime({
	studio: 'graphic',
	id: 'key-visual-line',
	version: 1,
	name: 'Key Visual 2D Line',
	type: 'p5',
	artifacts: { vector: {}, raster: {} },
	controller: {
		left: ['colorway'],
		// 정지 그래픽이라 속도가 없다. 경로 두 끝점이 위치 축을 대신한다.
		right: [
			'lineCount',
			'lengthStart',
			'lengthEnd',
			'angleStart',
			'angleSpread',
			'weightRatio',
			'weightThin',
			'path',
		],
		groups: [
			{
				id: 'graphic',
				title: 'Graphic',
				controls: [
					{
						id: 'colorway',
						kind: 'select' as const,
						label: '컬러',
						variant: 'list' as const,
						defaultValue: KEY_VISUAL_LINE_DEFAULT_INPUT.colorway,
						// 고르는 것이 색 하나가 아니라 배경·선 쌍이라 선택지가 색 자체를 내놓는다.
						options: Object.entries(KEY_VISUAL_LINE_COLORWAYS).map(
							([value, colorway]) => ({
								value,
								label: colorway.label,
								colors: [colorway.background, colorway.line],
							}),
						),
					},
				],
			},
			{
				id: 'lines',
				title: 'Lines',
				controls: [
					// 하한 4 — 가이드라인이 3개 이하를 금지한다.
					rangeControl(
						'lineCount',
						'선 개수',
						KEY_VISUAL_LINE_DEFAULT_INPUT.lineCount,
						4,
						24,
						1,
						{ precision: 0 },
					),
					rangeControl(
						'lengthStart',
						'시작 길이',
						KEY_VISUAL_LINE_DEFAULT_INPUT.lengthStart,
						60,
						600,
					),
					rangeControl(
						'lengthEnd',
						'끝 길이',
						KEY_VISUAL_LINE_DEFAULT_INPUT.lengthEnd,
						4,
						600,
					),
				],
			},
			{
				id: 'angle',
				title: 'Angle',
				controls: [
					rangeControl(
						'angleStart',
						'시작 각도',
						KEY_VISUAL_LINE_DEFAULT_INPUT.angleStart,
						0,
						180,
						1,
						{ precision: 0, unit: '°' },
					),
					// 폭 90° — 가이드라인이 Start/End Line 사이를 90° 이내로 묶는다. 부호는 부채가
					// 열리는 방향이라 양쪽 다 연다.
					rangeControl(
						'angleSpread',
						'각도 변화',
						KEY_VISUAL_LINE_DEFAULT_INPUT.angleSpread,
						-90,
						90,
						1,
						{ precision: 0, unit: '°' },
					),
				],
			},
			{
				id: 'weight',
				title: 'Weight',
				controls: [
					// 2~6의 정수만 — 상한 6은 "가장 두꺼운 선은 가장 얇은 선의 6배 이내"이고,
					// 하한 2는 두께 차가 없는 라인(오남용 2번)을 애초에 못 만들게 한다.
					rangeControl(
						'weightRatio',
						'두께 배율',
						KEY_VISUAL_LINE_DEFAULT_INPUT.weightRatio,
						2,
						6,
						1,
						{ precision: 0, unit: '×' },
					),
					// 배율만 있으면 "6배가 몇 px인가"를 알 수 없다 — 끝 두께가 그 기준을 말한다.
					rangeControl(
						'weightThin',
						'끝 두께',
						KEY_VISUAL_LINE_DEFAULT_INPUT.weightThin,
						1,
						6,
						0.5,
						{ precision: 1, unit: 'px' },
					),
				],
			},
			{
				id: 'position',
				title: 'Position',
				controls: [
					{
						id: 'path',
						kind: 'pad-pair',
						label: '경로',
						defaultValue: toControllerPadPairValue(KEY_VISUAL_LINE_DEFAULT_INPUT.path),
					},
				],
			},
		],
	},
})
