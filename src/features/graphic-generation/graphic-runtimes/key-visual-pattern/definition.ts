import { defineGraphicRuntime } from '@/features/graphic-generation/graphic-runtimes/define-graphic-runtime'
import type {
	ControllerControlDefinition,
	ControllerPadValue,
} from '@/modules/studio-controller/controller-definition'

/**
 * px 단위 control은 모두 캔버스 한 변이 이 길이일 때를 기준으로 읽는다.
 * 브랜드팀 원본이 720px 캔버스에서 간격·여백·라인 길이를 정했으므로 그 기준을 그대로 옮긴다
 * (Forward Straight의 1080과 다른 값인 이유 — 두 그래픽은 서로 다른 원본을 갖는다).
 */
export const KEY_VISUAL_PATTERN_REFERENCE_BASE = 720

/** 라인이 향할 방향. `diagonal`만 기준점을 향하고 나머지는 고정 각도다. */
export const KEY_VISUAL_PATTERN_DIRECTIONS = [
	{ value: 'vertical', label: '수직형' },
	{ value: 'horizontal', label: '수평형' },
	{ value: 'diagonal', label: '사선형' },
] as const

export const KEY_VISUAL_PATTERN_VIEWPOINTS = [
	{ value: 'perspective', label: '입체' },
	{ value: 'flat', label: '평면' },
] as const

/**
 * 배경·선 색은 자유 색이 아니라 정본이 세트로 제시하는 6조합이다. 조합의 정본은 여기 한 곳이고
 * model은 선택된 키로 조회만 한다.
 *
 * 🔴 브랜드팀 원본 두 값을 brand_colors 정본으로 스냅했다 — 색은 브랜드 정본이 이긴다.
 *   - lightGreenGreen 배경: `#D4F5CF` → `#DCF5D2` (HD LIGHT GREEN). 원본 값은 정본 어디에도 없다.
 *   - navyBlue 선: `#002F87` → `#003087` (HD DISCOVERY BLUE). 같은 충돌을 `scripts/seed-hd-brand-colors.ts`가
 *     이미 기록해 두고 오버뷰 페이지 값을 정본으로 채택했다. 원본 값은 그 문서의 배경 예시 페이지 값이다.
 */
export const KEY_VISUAL_PATTERN_COLORWAYS = {
	whiteLightGreen: { label: '화이트 · 연그린', background: '#FFFFFF', line: '#DCF5D2' },
	whiteLightBlue: { label: '화이트 · 연블루', background: '#FFFFFF', line: '#DCF0F5' },
	lightGreenGreen: { label: '연그린 · 그린', background: '#DCF5D2', line: '#00AF41' },
	greenLightGreen: { label: '그린 · 연그린', background: '#00AF41', line: '#73D75A' },
	darkGreenGreen: { label: '다크그린 · 그린', background: '#00280A', line: '#007332' },
	navyBlue: { label: '네이비 · 블루', background: '#000A32', line: '#003087' },
} as const

export type KeyVisualPatternColorwayId = keyof typeof KEY_VISUAL_PATTERN_COLORWAYS

/**
 * 창작자가 고르는 우측 축 묶음. 컬러와 같은 위계로 여기 한 곳이 정본이고, 고르면 **우측 컨트롤의
 * 기본값**이 그 묶음으로 바뀐다(model의 `getRestrictions`). 값 자체는 model이 읽지 않는다.
 *
 * 🔴 담지 않는 축은 **색 하나**다 — 창작자가 고른 색이 프리셋 하나에 사라지면 안 된다.
 *    방향·시점은 담는다(왼쪽 축이지만 프리셋이 정하는 것이 곧 그 조합이다).
 *    「입체 × 사선형」은 둘뿐이고 나머지는 방향·시점을 섞는다 — 테스트가 지킨다.
 * 🔴 식별자가 `id`가 아니라 `key`인 이유: 카탈로그 생성기가 **파일의 첫 `id:`** 를 런타임 id로
 *    읽는다. 여기에 `id:`를 쓰면 런타임 등록이 조용히 깨진다.
 * 🔴 `base`의 값은 `KEY_VISUAL_PATTERN_DEFAULT_INPUT`과 같아야 한다 — 시작 화면에서 보이는
 *    프리셋과 실제 값이 어긋나지 않게 하는 유일한 장치다.
 */
export const KEY_VISUAL_PATTERN_PRESETS = [
	{
		key: 'base',
		values: {
			direction: 'diagonal',
			viewpoint: 'perspective',
			columnGap: 30,
			rowGap: 30,
			variableWeight: true,
			minWeight: 1,
			maxWeight: 10,
			origin: { x: 0.5, y: 0.5 },
		},
	},
	{
		key: 'cornerVanishing',
		values: {
			direction: 'diagonal',
			viewpoint: 'perspective',
			columnGap: 30,
			rowGap: 30,
			variableWeight: true,
			minWeight: 1,
			maxWeight: 14,
			origin: { x: 1, y: 1 },
		},
	},
	{
		key: 'flatDiagonal',
		values: {
			direction: 'diagonal',
			viewpoint: 'flat',
			columnGap: 12,
			rowGap: 12,
			variableWeight: true,
			minWeight: 1,
			maxWeight: 4,
			origin: { x: 0.42, y: 0.62 },
		},
	},
	{
		key: 'verticalEdgeThird',
		values: {
			direction: 'vertical',
			viewpoint: 'perspective',
			columnGap: 16,
			rowGap: 28,
			variableWeight: true,
			minWeight: 2,
			maxWeight: 12,
			origin: { x: 0, y: 0.33 },
		},
	},
	{
		key: 'horizontalFlat',
		values: {
			direction: 'horizontal',
			viewpoint: 'flat',
			columnGap: 20,
			rowGap: 20,
			variableWeight: false,
			minWeight: 5,
			maxWeight: 10,
			origin: { x: 0.68, y: 1 },
		},
	},
	{
		key: 'verticalDrift',
		values: {
			direction: 'vertical',
			viewpoint: 'flat',
			columnGap: 14,
			rowGap: 14,
			variableWeight: true,
			minWeight: 1,
			maxWeight: 15,
			origin: { x: 0.28, y: 0.44 },
		},
	},
] as const

export type KeyVisualPatternPresetId = (typeof KEY_VISUAL_PATTERN_PRESETS)[number]['key']

export const KEY_VISUAL_PATTERN_DEFAULT_PRESET: KeyVisualPatternPresetId = 'base'

/**
 * 컨트롤이 있는 값과 없는 값을 함께 둔다. 뒤쪽 5개는 브랜드팀이 UI에서 뺀 값이라 사용자가 못 바꾸지만,
 * 계산에는 그대로 쓰이므로 입력의 일부다.
 *
 * `depthGamma`·`depthScaleMin`은 원본이 감춘 원근 강도 3단(약함/보통/강함) 중 「보통」이다.
 */
export const KEY_VISUAL_PATTERN_DEFAULT_INPUT = {
	direction: 'diagonal',
	viewpoint: 'perspective',
	colorway: 'darkGreenGreen',
	columnGap: 30,
	rowGap: 30,
	variableWeight: true,
	minWeight: 1,
	maxWeight: 10,
	origin: { x: 0.5, y: 0.5 },
	lineLength: 35,
	minCellGap: 8,
	lengthFillRatio: 0.6,
	depthGamma: 2.5,
	depthScaleMin: 0.25,
} as const

/** 0~1 기준점을 Controller pad 값(-1~1)으로 바꾼다. model이 반대 방향 환산을 갖는다. */
export function toControllerPadValue(origin: { x: number; y: number }): ControllerPadValue {
	return { x: origin.x * 2 - 1, y: origin.y * 2 - 1 }
}

type RangeControl = Extract<ControllerControlDefinition, { kind: 'range' }>

function rangeControl(
	id: string,
	label: string,
	defaultValue: number,
	min: number,
	max: number,
): RangeControl {
	return {
		id,
		kind: 'range',
		label,
		defaultValue,
		min,
		max,
		step: 1,
		display: { precision: 0, unit: 'px' },
	}
}

export default defineGraphicRuntime({
	studio: 'graphic',
	id: 'key-visual-pattern',
	version: 1,
	name: 'Key Visual Pattern',
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
		// 왼쪽은 색 조합과 형태 — 방향과 시점이 그림을 통째로 바꾼다.
		left: ['preset', 'direction', 'viewpoint', 'colorway'],
		// 오른쪽은 공용 4축 — 이 런타임은 정지 그래픽이라 속도가 없다.
		right: ['columnGap', 'rowGap', 'variableWeight', 'minWeight', 'maxWeight', 'origin'],
		groups: [
			{
				id: 'preset',
				title: 'Preset',
				controls: [
					{
						id: 'preset',
						kind: 'select' as const,
						label: '프리셋',
						variant: 'segmented' as const,
						defaultValue: KEY_VISUAL_PATTERN_DEFAULT_PRESET,
						// 🔴 색도 썸네일도 주지 않는다 — 프리셋은 색을 담지 않으므로 색 칩은 거짓이 되고,
						//    형태 썸네일은 우측 축을 그려야 해서 번호로 둔다.
						options: KEY_VISUAL_PATTERN_PRESETS.map((preset, index) => ({
							value: preset.key,
							label: String(index + 1),
						})),
					},
				],
			},
			{
				id: 'direction',
				title: 'Direction',
				controls: [
					{
						id: 'direction',
						kind: 'select' as const,
						label: '방향',
						variant: 'segmented' as const,
						defaultValue: KEY_VISUAL_PATTERN_DEFAULT_INPUT.direction,
						options: KEY_VISUAL_PATTERN_DIRECTIONS,
					},
				],
			},
			{
				id: 'perspective',
				title: 'Perspective',
				controls: [
					{
						id: 'viewpoint',
						kind: 'select' as const,
						label: '시점',
						variant: 'segmented' as const,
						defaultValue: KEY_VISUAL_PATTERN_DEFAULT_INPUT.viewpoint,
						options: KEY_VISUAL_PATTERN_VIEWPOINTS,
					},
				],
			},
			{
				id: 'graphic',
				title: 'Graphic',
				controls: [
					{
						id: 'colorway',
						kind: 'select' as const,
						label: '컬러',
						variant: 'list' as const,
						defaultValue: KEY_VISUAL_PATTERN_DEFAULT_INPUT.colorway,
						// 고르는 것이 색 하나가 아니라 배경·선 쌍이라 선택지가 색 자체를 내놓는다.
						options: Object.entries(KEY_VISUAL_PATTERN_COLORWAYS).map(
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
				id: 'grid',
				title: 'Grid',
				controls: [
					rangeControl(
						'columnGap',
						'열 간격',
						KEY_VISUAL_PATTERN_DEFAULT_INPUT.columnGap,
						10,
						30,
					),
					rangeControl(
						'rowGap',
						'행 간격',
						KEY_VISUAL_PATTERN_DEFAULT_INPUT.rowGap,
						10,
						30,
					),
				],
			},
			{
				id: 'weight',
				title: 'Weight',
				controls: [
					{
						id: 'variableWeight',
						kind: 'toggle' as const,
						label: '가변 두께',
						defaultValue: KEY_VISUAL_PATTERN_DEFAULT_INPUT.variableWeight,
					},
					rangeControl(
						'minWeight',
						'가장 얇은 라인',
						KEY_VISUAL_PATTERN_DEFAULT_INPUT.minWeight,
						1,
						10,
					),
					rangeControl(
						'maxWeight',
						'가장 두꺼운 라인',
						KEY_VISUAL_PATTERN_DEFAULT_INPUT.maxWeight,
						1,
						15,
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
						defaultValue: toControllerPadValue(KEY_VISUAL_PATTERN_DEFAULT_INPUT.origin),
					},
				],
			},
		],
	},
})
