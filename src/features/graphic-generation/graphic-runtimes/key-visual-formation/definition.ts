import { defineGraphicRuntime } from '@/features/graphic-generation/graphic-runtimes/define-graphic-runtime'
import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'

/**
 * px 단위 control은 모두 캔버스 짧은 변이 이 길이일 때를 기준으로 읽는다.
 * 실제 렌더는 `min(width, height) / 기준값`으로 환산하므로 미리보기와 export가 같은 구도를 만든다.
 */
export const KEY_VISUAL_FORMATION_REFERENCE_BASE = 1080

/**
 * 선이 이보다 얇아지지 않는다(기준 판 짧은 변 1080px 기준). 감쇠를 세게 걸면 끝쪽이 머리카락처럼
 * 남아 보기 불편해지고 인쇄에서는 아예 사라진다.
 */
export const KEY_VISUAL_FORMATION_MIN_LINE_WEIGHT = 2

/**
 * 색 단계. 숫자가 클수록 짙다 — 1·2·3이 p.67에서 실측한 초록 세 단계이고 0이 흰색이다.
 *
 * 🔴 **선은 면보다 언제나 밝다**(선 단계 < 면 단계). 뒤집히면 「선이 모여 면이 된다」가 반대로 읽힌다.
 *    그래서 면으로는 0(흰색)을 고를 수 없다 — 그보다 밝은 선이 없다.
 */
export const KEY_VISUAL_FORMATION_COLOR_LEVELS = [
	// 🔴 키 이름이 `id`가 아니다 — 카탈로그 생성기가 파일에서 **처음 만나는** `id:`를 런타임 id로 읽는다.
	{ key: 'white', label: '화이트', hex: '#FFFFFF' },
	{ key: 'heritage', label: '헤리티지', hex: '#00AF41' },
	{ key: 'prosperity', label: '프로스페리티', hex: '#007332' },
	{ key: 'deep', label: '딥', hex: '#00280A' },
] as const

export type KeyVisualFormationColorId = (typeof KEY_VISUAL_FORMATION_COLOR_LEVELS)[number]['key']

/** 단계 번호 = 배열 순서. 짙을수록 크다. */
export function keyVisualFormationColorLevel(id: string): number {
	return KEY_VISUAL_FORMATION_COLOR_LEVELS.findIndex((color) => color.key === id)
}

export function keyVisualFormationColorHex(id: string): string {
	return (
		KEY_VISUAL_FORMATION_COLOR_LEVELS.find((color) => color.key === id)?.hex ??
		KEY_VISUAL_FORMATION_COLOR_LEVELS[0].hex
	)
}

/** 면이 놓이는 반대편 — 선이 붙는 변. 선은 이 변에서 반대쪽으로 차오른다. */
export const KEY_VISUAL_FORMATION_ANCHORS = {
	top: { label: '위', axis: 'vertical' },
	bottom: { label: '아래', axis: 'vertical' },
	left: { label: '왼쪽', axis: 'horizontal' },
	right: { label: '오른쪽', axis: 'horizontal' },
} as const
export type KeyVisualFormationAnchorId = keyof typeof KEY_VISUAL_FORMATION_ANCHORS

/**
 * 가이드라인 B.8 TYPE C — FORMATION의 기본값.
 *
 * 면이 판 전체를 덮고 그 **위에** 선이 얹힌다. 면에는 이미지를 깔 수 있다.
 */
export const KEY_VISUAL_FORMATION_DEFAULT_INPUT = {
	planeColor: 'deep',
	lineColor: 'prosperity',
	planeImage: null,
	anchor: 'bottom',
	lineRatio: 0.3,
	planeRatio: 0,
	steps: 8,
	decay: 2,
} as const

type RangeControl = Extract<ControllerControlDefinition, { kind: 'range' }>

function rangeControl(
	id: string,
	label: string,
	defaultValue: number,
	min: number,
	max: number,
	step = 1,
	display: RangeControl['display'] = { precision: 0 },
): RangeControl {
	return { id, kind: 'range', label, defaultValue, min, max, step, display }
}

function colorOptions(levels: readonly (typeof KEY_VISUAL_FORMATION_COLOR_LEVELS)[number][]) {
	return levels.map((color) => ({
		value: color.key,
		label: color.label,
		colors: [color.hex],
	}))
}

// 🔴 면은 0(흰색)을 못 고른다 — 그보다 밝은 선이 없다.
const PLANE_LEVELS = KEY_VISUAL_FORMATION_COLOR_LEVELS.filter((_, level) => level > 0)
// 🔴 선의 기본 선택지는 **가장 넓은 경우**(면이 가장 짙을 때)다. 값에 따른 좁히기는 넓힐 수 없다.
const LINE_LEVELS = KEY_VISUAL_FORMATION_COLOR_LEVELS.filter(
	(_, level) => level < KEY_VISUAL_FORMATION_COLOR_LEVELS.length - 1,
)

export default defineGraphicRuntime({
	studio: 'graphic',
	id: 'key-visual-formation',
	version: 1,
	name: 'Key Visual Formation',
	type: 'p5',
	artifacts: { vector: {}, raster: {} },
	controller: {
		// 패널 컴포지션(docs/10 §3.7) — 무엇을 뜻하나만 선언한다. 자리는 그래픽 패널이 정한다.
		roles: {
			planeImage: 'source',
			lineRatio: 'tuning',
			planeRatio: 'tuning',
			steps: 'tuning',
			decay: 'tuning',
		},
		clusters: [
			// 면·선 색을 한 조합으로 고른다 — 선의 허용 범위가 면을 따른다(런타임 제한).
			{
				id: 'color',
				title: 'Color',
				role: 'palette',
				widget: 'color-pair',
				members: { background: 'planeColor', foreground: 'lineColor' },
			},
			{
				id: 'position',
				title: 'Position',
				role: 'placement',
				widget: 'position',
				members: { value: 'anchor' },
			},
		],
		groups: [
			{
				id: 'plane',
				title: 'Plane',
				controls: [
					{
						id: 'planeColor',
						kind: 'select' as const,
						label: '면 색상',
						variant: 'list' as const,
						defaultValue: KEY_VISUAL_FORMATION_DEFAULT_INPUT.planeColor,
						options: colorOptions(PLANE_LEVELS),
					},
					{
						id: 'planeImage',
						kind: 'asset' as const,
						label: '면 이미지',
						source: 'sample-images' as const,
						defaultValue: KEY_VISUAL_FORMATION_DEFAULT_INPUT.planeImage,
					},
				],
			},
			{
				id: 'line',
				title: 'Line',
				controls: [
					{
						id: 'lineColor',
						kind: 'select' as const,
						label: '선 색상',
						variant: 'list' as const,
						defaultValue: KEY_VISUAL_FORMATION_DEFAULT_INPUT.lineColor,
						options: colorOptions(LINE_LEVELS),
					},
					{
						id: 'anchor',
						kind: 'select' as const,
						label: '선의 자리',
						variant: 'segmented' as const,
						defaultValue: KEY_VISUAL_FORMATION_DEFAULT_INPUT.anchor,
						options: Object.entries(KEY_VISUAL_FORMATION_ANCHORS).map(
							([value, anchor]) => ({ value, label: anchor.label }),
						),
					},
				],
			},
			{
				id: 'formation',
				title: 'Formation',
				controls: [
					/**
					 * 판은 **[면] [선의 영역] [면]** 세 토막이고, 이 두 축이 앞의 둘을 정한다.
					 * 나머지가 반대쪽 면이다.
					 *
					 * 🔴 각각의 상한이 1/3인 것이 곧 가이드라인의 1:1 규정이다 — 둘을 합쳐도 2/3을
					 *    넘지 못하므로 반대쪽 면이 언제나 1/3 이상 남고, 그것이 선의 영역보다 좁을 수
					 *    없다. 검사기를 따로 두지 않아도 깨지지 않는다.
					 */
					rangeControl(
						'lineRatio',
						'선 영역 비율',
						KEY_VISUAL_FORMATION_DEFAULT_INPUT.lineRatio,
						0.05,
						0.33,
						0.01,
						{ precision: 2 },
					),
					rangeControl(
						'planeRatio',
						'면 영역 비율',
						KEY_VISUAL_FORMATION_DEFAULT_INPUT.planeRatio,
						0,
						0.33,
						0.01,
						{ precision: 2 },
					),
					// 하한 6 — 면에서 선으로 이어지는 단계는 6단계 이상이어야 한다.
					rangeControl('steps', '단계', KEY_VISUAL_FORMATION_DEFAULT_INPUT.steps, 6, 20),
					// 0보다 커야 한다 — 0이면 모든 선이 같은 두께라 「점진적으로 확장」이 사라진다.
					rangeControl(
						'decay',
						'가늘어지는 정도',
						KEY_VISUAL_FORMATION_DEFAULT_INPUT.decay,
						0.1,
						4,
						0.1,
						{ precision: 1 },
					),
				],
			},
		],
	},
})
