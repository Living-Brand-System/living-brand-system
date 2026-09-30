import { defineGraphicRuntime } from '@/features/graphic-generation/graphic-runtimes/define-graphic-runtime'
import type {
	ControllerControlDefinition,
	ControllerPadValue,
} from '@/modules/studio-controller/controller-definition'

/**
 * px 단위 control은 모두 캔버스 짧은 변이 이 길이일 때를 기준으로 읽는다.
 * 실제 렌더는 `min(width, height) / 기준값`으로 환산하므로 미리보기와 export가 같은 구도를 만든다.
 */
export const FORWARD_STRAIGHT_REFERENCE_BASE = 1080

export const FORWARD_STRAIGHT_DEFAULT_INPUT = {
	backgroundColor: '#030402',
	lineColor: '#ffffff',
	lineLength: 30,
	columnGap: 40,
	rowGap: 32,
	margin: 30,
	weightNear: 1,
	weightFar: 1,
	weightFalloff: 1000,
	perspectiveGamma: 1,
	depthScaleMin: 1,
	origin: { x: 0.5, y: 0.5 },
}

export function toControllerPadValue(
	origin: (typeof FORWARD_STRAIGHT_DEFAULT_INPUT)['origin'],
): ControllerPadValue {
	return { x: origin.x * 2 - 1, y: origin.y * 2 - 1 }
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

function colorControl(id: string, label: string, defaultValue: string) {
	return { id, kind: 'color' as const, label, defaultValue }
}

export default defineGraphicRuntime({
	studio: 'graphic',
	id: 'forward-straight',
	version: 1,
	name: 'Forward Straight',
	type: 'p5',
	artifacts: { vector: {}, raster: {} },
	controller: {
		/**
		 * 창작자에게 보여줄 축 — 색, 모양, 속도, 위치처럼 직관적이고 변화폭이 큰 것만 남긴다.
		 *
		 * 🔑 `speed`가 마스터 시계다(`shader.ts`의 `iTime * uGodraySpeed`). 나머지 속도는 전부
		 *    그렇게 스케일된 `time`을 곱하므로, 이 하나가 모든 움직임을 함께 늘리고 줄인다.
		 * 🔴 나머지 컨트롤은 **선언에서 빼기만 한다.** 지우지 않는다 — 창작자에게 감추더라도
		 *    manager는 Payload에서 그 값을 조정할 수 있어야 한다.
		 */
		// 이 런타임의 큰 축은 색뿐이다 — 모양 축이 없다.
		left: ['lineColor', 'backgroundColor'],
		// 오른쪽은 공용 4축 — 정지 그래픽이라 속도가 없다. 선 길이·여백·원근은 admin으로 내렸다.
		right: ['columnGap', 'rowGap', 'weightNear', 'weightFar', 'origin'],
		groups: [
			{
				id: 'graphic',
				title: 'Graphic',
				controls: [
					colorControl('lineColor', '선 색상', FORWARD_STRAIGHT_DEFAULT_INPUT.lineColor),
					colorControl(
						'backgroundColor',
						'배경 색상',
						FORWARD_STRAIGHT_DEFAULT_INPUT.backgroundColor,
					),
				],
			},
			{
				id: 'grid',
				title: 'Grid',
				controls: [
					// 선 길이는 색이 아니라 격자 칸 안의 수치다 — Graphic에 두면 그룹이 좌우로 갈린다.
					rangeControl(
						'lineLength',
						'선 길이',
						FORWARD_STRAIGHT_DEFAULT_INPUT.lineLength,
						2,
						200,
					),
					rangeControl(
						'columnGap',
						'열 간격',
						FORWARD_STRAIGHT_DEFAULT_INPUT.columnGap,
						8,
						200,
					),
					rangeControl(
						'rowGap',
						'행 간격',
						FORWARD_STRAIGHT_DEFAULT_INPUT.rowGap,
						8,
						200,
					),
					rangeControl('margin', '여백', FORWARD_STRAIGHT_DEFAULT_INPUT.margin, 0, 200),
				],
			},
			{
				id: 'weight',
				title: 'Weight',
				controls: [
					rangeControl(
						'weightNear',
						'기준점 두께',
						FORWARD_STRAIGHT_DEFAULT_INPUT.weightNear,
						0.1,
						20,
						0.1,
						{ precision: 1, unit: 'px' },
					),
					rangeControl(
						'weightFar',
						'원경 두께',
						FORWARD_STRAIGHT_DEFAULT_INPUT.weightFar,
						0.1,
						20,
						0.1,
						{ precision: 1, unit: 'px' },
					),
					rangeControl(
						'weightFalloff',
						'두께 감쇠 거리',
						FORWARD_STRAIGHT_DEFAULT_INPUT.weightFalloff,
						100,
						3000,
						10,
					),
				],
			},
			{
				id: 'perspective',
				title: 'Perspective',
				controls: [
					rangeControl(
						'perspectiveGamma',
						'원근 압축',
						FORWARD_STRAIGHT_DEFAULT_INPUT.perspectiveGamma,
						1,
						6,
						0.1,
						{ precision: 1 },
					),
					rangeControl(
						'depthScaleMin',
						'원경 크기',
						FORWARD_STRAIGHT_DEFAULT_INPUT.depthScaleMin,
						0.05,
						1,
						0.01,
						{ precision: 2 },
					),
				],
			},
			{
				id: 'position',
				title: 'Position',
				controls: [
					{
						id: 'origin',
						kind: 'pad',
						label: '기준점',
						defaultValue: toControllerPadValue(FORWARD_STRAIGHT_DEFAULT_INPUT.origin),
					},
				],
			},
		],
	},
})
