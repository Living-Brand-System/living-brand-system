import type { GraphicModelAdapter } from '@/features/graphic-generation/runtime/graphic-plugin'
import type { VectorPrimitive, VectorScene } from '@/modules/studio-artifact/studio-artifact'
import type {
	ControllerValues,
	StudioControllerRestrictions,
} from '@/modules/studio-controller/controller-definition'
import {
	type ChartAxes,
	INFOGRAPHIC_AXES,
	INFOGRAPHIC_AXIS_NEUTRAL,
	INFOGRAPHIC_AXIS_RANGE,
	type InfographicAxis,
} from './chart-axes'
import {
	type ChartData,
	EMPTY_CHART_DATA,
	firstColumn,
	INFOGRAPHIC_SAMPLE_DATA,
	parseChartData,
} from './chart-data'
import type { InfographicChartGroup, InfographicChartSource } from './chart-groups'
import { type Box, fitFontSize, label, round, sharedFontSize, textEms } from './chart-primitives'
import {
	HD_INFOGRAPHIC_COLORS,
	type InfographicPaletteId,
	pickSeriesColors,
	pickStrokeColors,
	readableTextColor,
} from './palette'
import { plotFrame } from './plot-frame'

/**
 * 쓸 수 있는 표현 전부. 값은 URL·프로파일에 남으므로 이름을 바꾸지 않는다.
 *
 * 🔑 `group`이 화면에서 어디에 서는지를 정한다 — 가르는 것은 표현의 복잡도뿐이다(`chart-groups.ts`).
 * 🔴 `source`가 정본과 확장을 가른다. 새 표현을 정본이라고 적지 말 것 — 근거는 `chart-groups.ts`.
 */
export const INFOGRAPHIC_CHART_TYPES = [
	{
		id: 'pie',
		label: '파이',
		group: 'basic',
		source: 'canon',
		usesNameLabels: false,
		axes: ['spacing'],
	},
	{
		id: 'donut',
		label: '도넛',
		group: 'basic',
		source: 'canon',
		usesNameLabels: false,
		axes: ['thickness', 'spacing'],
	},
	{
		id: 'stacked-column',
		// 전체 **하나**를 가른다. 범주마다 100%인 것은 `stacked-bar-normalized`다.
		label: '전체 100% 세로',
		group: 'basic',
		source: 'canon',
		usesNameLabels: false,
		axes: ['thickness'],
	},
	{
		id: 'stacked-bar',
		label: '전체 100% 가로',
		group: 'basic',
		source: 'canon',
		usesNameLabels: true,
		axes: ['thickness'],
	},
	{
		id: 'bar',
		label: '막대',
		group: 'basic',
		source: 'canon',
		usesNameLabels: false,
		// 🔴 정본 도판의 막대는 사이가 없다 — 자리를 꽉 채우므로 다듬을 축이 없다.
		axes: [],
	},
	{
		id: 'bar-horizontal',
		label: '가로 막대',
		group: 'basic',
		source: 'extended',
		usesNameLabels: true,
		axes: [],
	},
	{
		id: 'bubble-cluster',
		label: '버블 클러스터',
		// 자리가 다섯뿐이다(CLUSTER_MAX_CIRCLES).
		group: 'basic',
		source: 'canon',
		usesNameLabels: true,
		// 원끼리 맞닿아 사이가 없다 — 남는 자유는 무리를 어느 쪽으로 돌려 세우는가뿐이다.
		axes: ['rotation'],
	},
	{
		id: 'proportional-circle',
		label: '비례 원',
		// 둘의 크기를 견주는 표현이라 셋째 값을 그릴 자리가 없다.
		group: 'basic',
		source: 'canon',
		usesNameLabels: false,
		axes: ['rotation'],
	},
	{
		id: 'nested-square',
		label: '겹친 사각형',
		// 자리가 셋뿐이다(OVERLAP_SLOTS).
		group: 'basic',
		source: 'canon',
		usesNameLabels: false,
		axes: ['spacing'],
	},
	{
		id: 'bar-track',
		label: '막대 · 트랙',
		group: 'basic',
		source: 'canon',
		usesNameLabels: true,
		// 트랙이 자리를 말해 주므로 막대가 그 안에서 좁아질 수 있다 — 폭과 사이 둘 다 갖는다.
		axes: ['thickness', 'spacing'],
	},
	{
		id: 'bar-track-horizontal',
		label: '가로 막대 · 트랙',
		group: 'basic',
		source: 'extended',
		usesNameLabels: true,
		axes: ['thickness', 'spacing'],
	},
	{
		id: 'nested-circle',
		label: '겹친 원',
		group: 'basic',
		source: 'canon',
		usesNameLabels: true,
		axes: ['thickness'],
	},
	{
		id: 'concentric-circle',
		label: '동심원',
		group: 'basic',
		source: 'extended',
		usesNameLabels: true,
		axes: ['thickness'],
	},
	{
		id: 'line',
		label: '다계열 선',
		group: 'basic',
		source: 'canon',
		usesNameLabels: false,
		axes: ['thickness', 'curvature'],
	},
	{
		id: 'heatmap',
		label: '히트맵',
		group: 'complex',
		source: 'extended',
		usesNameLabels: true,
		axes: ['spacing'],
	},
	{
		id: 'calendar-heatmap',
		label: '캘린더 히트맵',
		group: 'complex',
		source: 'extended',
		usesNameLabels: true,
		axes: ['spacing'],
	},
	{
		id: 'stacked-area',
		label: '누적 영역',
		group: 'complex',
		source: 'extended',
		usesNameLabels: true,
		axes: ['curvature'],
	},
	{
		id: 'stacked-bar-normalized',
		label: '100% 누적 막대',
		group: 'complex',
		source: 'extended',
		usesNameLabels: true,
		axes: ['thickness', 'spacing'],
	},
	{
		id: 'grouped-bar',
		label: '다계열 막대',
		group: 'complex',
		source: 'extended',
		usesNameLabels: true,
		axes: ['thickness', 'spacing'],
	},
	{
		id: 'area',
		// 🔴 계열을 **겹쳐** 그린다. 쌓는 것은 `stacked-area`다 — 목록에서 갈려 보여야 한다.
		label: '겹친 영역',
		group: 'basic',
		source: 'canon',
		usesNameLabels: true,
		axes: ['curvature'],
	},
] as const satisfies readonly {
	id: string
	label: string
	group: InfographicChartGroup
	source: InfographicChartSource
	/** 이 표현이 쓰는 형태 축. 여기 없는 축은 창작자 화면에서 잠긴다. */
	axes: ChartAxes
	/**
	 * 항목 이름을 그리는가. 🔴 「이름 표시」 옵션은 이름을 쓰는 표현에서만 살아 있다 —
	 * 파이는 조각에 수치만 적으므로 그 표현에서 이름을 끄고 켜는 스위치는 아무것도 하지 않는다.
	 */
	usesNameLabels: boolean
}[]

export type InfographicChartType = (typeof INFOGRAPHIC_CHART_TYPES)[number]['id']

const CHART_TYPE_IDS = INFOGRAPHIC_CHART_TYPES.map(({ id }) => id)

export type InfographicInput = {
	chartType: InfographicChartType
	palette: InfographicPaletteId
	/** 항목 이름을 그리는가. 이름을 쓰지 않는 표현에서는 아무 영향이 없다. */
	showNameLabels: boolean
	showValueLabels: boolean
	/** 글자 크기 배율. 표현이 정한 기준 크기에 곱한다. */
	textScale: number
	/** 형태 축 — 값은 0~1이고 무엇으로 읽을지는 표현이 정한다(`chart-axes.ts`). */
	thickness: number
	spacing: number
	curvature: number
	rotation: number
	data: ChartData
}

export const INFOGRAPHIC_DEFAULT_CHART_TYPE: InfographicChartType = 'pie'
export const INFOGRAPHIC_DEFAULT_PALETTE: InfographicPaletteId = 'greenNavy'
export const INFOGRAPHIC_DEFAULT_SHOW_VALUE_LABELS = true
export const INFOGRAPHIC_DEFAULT_SHOW_NAME_LABELS = true
export const INFOGRAPHIC_DEFAULT_TEXT_SCALE = 1
export const INFOGRAPHIC_TEXT_SCALE_RANGE = { min: 0.5, max: 1.6, step: 0.05 } as const

export function toInfographicInput(values: ControllerValues): InfographicInput {
	const chartType = pick(values.chartType, CHART_TYPE_IDS, INFOGRAPHIC_DEFAULT_CHART_TYPE)
	return {
		chartType,
		palette: pick(values.palette, ['green', 'greenNavy', 'navy'], INFOGRAPHIC_DEFAULT_PALETTE),
		showNameLabels: boolish(values.showNameLabels, INFOGRAPHIC_DEFAULT_SHOW_NAME_LABELS),
		showValueLabels: boolish(values.showValueLabels, INFOGRAPHIC_DEFAULT_SHOW_VALUE_LABELS),
		textScale:
			typeof values.textScale === 'number' && Number.isFinite(values.textScale)
				? Math.min(
						INFOGRAPHIC_TEXT_SCALE_RANGE.max,
						Math.max(INFOGRAPHIC_TEXT_SCALE_RANGE.min, values.textScale),
					)
				: INFOGRAPHIC_DEFAULT_TEXT_SCALE,
		thickness: axis(values.thickness, chartType, 'thickness'),
		spacing: axis(values.spacing, chartType, 'spacing'),
		curvature: axis(values.curvature, chartType, 'curvature'),
		rotation: axis(values.rotation, chartType, 'rotation'),
		// 값이 아직 없을 때만 그 표현의 샘플로 떨어진다. 비운 것은 비운 대로 둔다 — 빈 판이
		// 「데이터가 없다」를 말해 주는데 샘플을 되살리면 지운 것이 되살아난 것처럼 보인다.
		data: parseChartData(
			typeof values.data === 'string' ? values.data : INFOGRAPHIC_SAMPLE_DATA[chartType],
		),
	}
}

/**
 * 형태 축 값. 🔴 그 표현이 쓰지 않는 축은 **언제나 중립**이다 — 잠긴 축의 값이 기하에 새어
 * 들어가면 화면이 왜 그렇게 그려졌는지 설명할 수 없게 된다.
 */
function axis(raw: unknown, chartType: InfographicChartType, name: InfographicAxis): number {
	const declared = INFOGRAPHIC_CHART_TYPES.find((chart) => chart.id === chartType)?.axes as
		| ChartAxes
		| undefined
	const uses = declared?.includes(name)
	if (!uses) return INFOGRAPHIC_AXIS_NEUTRAL
	if (typeof raw !== 'number' || !Number.isFinite(raw)) return INFOGRAPHIC_AXIS_NEUTRAL
	return Math.min(INFOGRAPHIC_AXIS_RANGE.max, Math.max(INFOGRAPHIC_AXIS_RANGE.min, raw))
}

function boolish(raw: unknown, fallback: boolean): boolean {
	return typeof raw === 'boolean' ? raw : fallback
}

function pick<Value extends string>(
	raw: unknown,
	allowed: readonly Value[],
	fallback: Value,
): Value {
	return allowed.includes(raw as Value) ? (raw as Value) : fallback
}

/**
 * 판 전체가 아니라 여백을 뺀 상자 안에 그린다. 정본 도판이 칸마다 같은 여백을 두고 있고,
 * 상자를 한 번 정해 두면 12종이 서로 다른 좌표계를 발명하지 않는다.
 */
function contentBox(width: number, height: number): Box {
	const margin = Math.min(width, height) * 0.12
	return { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 }
}

/** 인포그래픽 한 장의 모든 기하를 만든다. 순수 함수라 미리보기와 내보내기가 같은 것을 본다. */
export function createInfographicScene(
	input: InfographicInput,
	viewport: { width: number; height: number },
): VectorScene {
	const box = contentBox(viewport.width, viewport.height)
	return {
		width: viewport.width,
		height: viewport.height,
		background: HD_INFOGRAPHIC_COLORS.white,
		// 데이터가 없으면 빈 판이다 — 입력하는 중에는 정상 상태라 오류로 다루지 않는다.
		primitives: input.data.rows.length === 0 ? [] : CHART_BUILDERS[input.chartType](box, input),
	}
}

type ChartBuilder = (box: Box, input: InfographicInput) => VectorPrimitive[]

const CHART_BUILDERS: Record<InfographicChartType, ChartBuilder> = {
	pie: (box, input) => buildRadialSlices(box, input, 0),
	// 두께가 클수록 링이 두껍다 — 창작자가 읽는 방향과 값의 방향이 같아야 한다.
	donut: (box, input) => buildRadialSlices(box, input, 0.72 - input.thickness * 0.55),
	'proportional-circle': buildProportionalCircle,
	'bubble-cluster': buildBubbleCluster,
	bar: (box, input) => buildBars(box, input, false),
	'bar-horizontal': (box, input) => buildHorizontalBars(box, input, false),
	'bar-track': (box, input) => buildBars(box, input, true),
	'bar-track-horizontal': (box, input) => buildHorizontalBars(box, input, true),
	'stacked-column': buildStackedColumn,
	'stacked-bar': buildStackedBar,
	line: buildLine,
	area: buildArea,
	'nested-circle': buildNestedCircle,
	'concentric-circle': buildNestedCircle,
	'nested-square': buildNestedSquare,
	heatmap: buildHeatmap,
	'calendar-heatmap': buildCalendarHeatmap,
	'stacked-area': buildStackedArea,
	'stacked-bar-normalized': buildNormalizedStack,
	'grouped-bar': buildGroupedBars,
}

// ── 공통 유틸 ────────────────────────────────────────────────────────────────

/**
 * 조각에 얹는 글자. 🔑 무엇을 적을지는 표현이 정한다 — 정본 도판이 구성비에는 수치를,
 * 묶음에는 이름을 적는다. 데이터는 둘 다 갖고 있고 표현이 골라 쓴다.
 */
function valueText(value: number): string {
	return `${Math.round(value * 10) / 10}%`
}

/**
 * 수치의 크기.
 *
 * 🔴 **한 판의 글자 크기는 둘뿐이다** — 수치 하나, 이름 하나. 조각마다 칸에 맞춰 줄이면 같은
 *    층위의 것이 크기로 갈려 순서가 있는 것처럼 읽힌다. 정본 도판도 한 크기로 적는다.
 * 🔑 그래서 이름과 같은 규칙이다 — 가장 빡빡한 칸이 전체 크기를 정한다(`sharedFontSize`).
 */
function valueFontSizes(
	entries: readonly { text: string; width: number; height?: number }[],
	max: number,
): number[] {
	// 어느 것도 자기 칸을 넘지 않는 크기를 구하고, 그중 가장 작은 것으로 전부 맞춘다.
	const fitted = entries.map((entry) =>
		Math.min(fitFontSize(entry.text, entry.width, max), entry.height ?? max),
	)
	if (fitted.length === 0) return fitted
	const smallest = Math.min(...fitted)
	return fitted.map(() => smallest)
}

/**
 * 회전 축이 만드는 각(라디안). 🔑 축이 각을 정하는 것이 아니라 **정본으로부터의 회전**을 정한다 —
 * 중립이 도판 그대로이고, 양 끝이 정본 ±180°다.
 */
function rotationAngle(rotation: number, canonDegrees: number): number {
	return ((canonDegrees + (rotation - INFOGRAPHIC_AXIS_NEUTRAL) * 360) * Math.PI) / 180
}

/**
 * 점들을 잇는다 — 곡률 0이면 꺾은선, 크면 Catmull-Rom을 3차 베지어로 옮겨 부드럽게 잇는다.
 * 🔑 선과 영역이 같은 함수를 쓴다. 마디를 보일지 말지는 표현이 아니라 **축**이 정한다.
 */
function curvePath(points: readonly { x: number; y: number }[], curvature: number): string {
	if (points.length < 3 || curvature <= 0) return polylinePath(points, false)
	const tension = curvature / 6
	let path = `M${round(points[0].x)} ${round(points[0].y)}`
	for (let index = 0; index < points.length - 1; index += 1) {
		const previous = points[Math.max(0, index - 1)]
		const current = points[index]
		const next = points[index + 1]
		const after = points[Math.min(points.length - 1, index + 2)]
		const control1 = {
			x: current.x + (next.x - previous.x) * tension,
			y: current.y + (next.y - previous.y) * tension,
		}
		const control2 = {
			x: next.x - (after.x - current.x) * tension,
			y: next.y - (after.y - current.y) * tension,
		}
		path += `C${round(control1.x)} ${round(control1.y)},${round(control2.x)} ${round(control2.y)},${round(next.x)} ${round(next.y)}`
	}
	return path
}

function polylinePath(points: readonly { x: number; y: number }[], close: boolean): string {
	const [first, ...rest] = points
	const body = rest.map(({ x, y }) => `L${round(x)} ${round(y)}`).join('')
	return `M${round(first.x)} ${round(first.y)}${body}${close ? 'Z' : ''}`
}

/** 부채꼴(innerRatio 0) 또는 도넛 섹터의 path d. 각도는 12시에서 시작해 시계 방향이다. */
function sectorPath(
	cx: number,
	cy: number,
	radius: number,
	innerRatio: number,
	startTurn: number,
	endTurn: number,
): string {
	const inner = radius * innerRatio
	const large = endTurn - startTurn > 0.5 ? 1 : 0
	const outerStart = onCircle(cx, cy, radius, startTurn)
	const outerEnd = onCircle(cx, cy, radius, endTurn)
	if (inner === 0) {
		return `M${round(cx)} ${round(cy)}L${round(outerStart.x)} ${round(outerStart.y)}A${round(radius)} ${round(radius)} 0 ${large} 1 ${round(outerEnd.x)} ${round(outerEnd.y)}Z`
	}
	const innerEnd = onCircle(cx, cy, inner, endTurn)
	const innerStart = onCircle(cx, cy, inner, startTurn)
	return `M${round(outerStart.x)} ${round(outerStart.y)}A${round(radius)} ${round(radius)} 0 ${large} 1 ${round(outerEnd.x)} ${round(outerEnd.y)}L${round(innerEnd.x)} ${round(innerEnd.y)}A${round(inner)} ${round(inner)} 0 ${large} 0 ${round(innerStart.x)} ${round(innerStart.y)}Z`
}

function onCircle(cx: number, cy: number, radius: number, turn: number) {
	const angle = turn * Math.PI * 2 - Math.PI / 2
	return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
}

// ── ① 파이 · ② 도넛 ──────────────────────────────────────────────────────────

function buildRadialSlices(
	box: Box,
	input: InfographicInput,
	innerRatio: number,
): VectorPrimitive[] {
	const values = firstColumn(input.data)
	const sum = values.reduce((total, value) => total + value, 0)
	if (sum <= 0) return []
	// 🔴 판을 꽉 채우지 않는다 — 정본 도판의 원은 칸의 절반 남짓이고, 그래서 조각 라벨이
	//    도형에 눌리지 않고 읽힌다. 판을 채우면 같은 라벨 크기라도 훨씬 크게 보인다.
	const radius = (Math.min(box.width, box.height) / 2) * 0.72
	const cx = box.x + box.width / 2
	const cy = box.y + box.height / 2
	const colors = pickSeriesColors(input.palette, values.length)
	const fontSize = radius * 0.14 * input.textScale
	const labelRadius = radius * (innerRatio === 0 ? 0.66 : (1 + innerRatio) / 2)
	// 조각이 좁을수록 글자가 설 호가 짧다 — 그 호가 이 조각의 칸 너비다.
	const valueSizes = valueFontSizes(
		values.map((value) => ({
			text: valueText(value),
			width: Math.PI * 2 * labelRadius * (value / sum) * 0.9,
			height: radius * (innerRatio === 0 ? 0.45 : (1 - innerRatio) * 0.7),
		})),
		fontSize,
	)
	// 조각 사이를 벌린다. 정본 도판은 맞붙어 있으므로 **중립까지는 0**이고, 그 위로 갈라진다.
	const pad = Math.max(0, input.spacing - INFOGRAPHIC_AXIS_NEUTRAL) * 0.024
	const primitives: VectorPrimitive[] = []
	let cursor = 0
	values.forEach((value, index) => {
		const span = value / sum
		primitives.push({
			kind: 'path',
			d: sectorPath(
				cx,
				cy,
				radius,
				innerRatio,
				cursor + pad / 2,
				Math.max(cursor + pad / 2, cursor + span - pad / 2),
			),
			fill: colors[index],
		})
		if (input.showValueLabels) {
			const at = onCircle(cx, cy, labelRadius, cursor + span / 2)
			primitives.push(
				label(
					valueText(value),
					at.x,
					at.y,
					valueSizes[index],
					readableTextColor(colors[index]),
				),
			)
		}
		cursor += span
	})
	return primitives
}

/**
 * 원들을 판에 꽉 맞춘다 — 자리와 크기의 **비는 그대로 두고** 전체만 키우거나 줄여 가운데 세운다.
 *
 * 🔑 배치를 판 크기로 직접 계산하면 값 분포에 따라 판이 비거나 넘친다. 단위 좌표로 관계만
 *    정해 두고 마지막에 한 번 맞추면, 어떤 데이터가 와도 판을 꽉 쓴다.
 */
function fitCircles(
	circles: readonly { x: number; y: number; r: number }[],
	box: Box,
): { x: number; y: number; r: number }[] {
	if (circles.length === 0) return []
	const left = Math.min(...circles.map((circle) => circle.x - circle.r))
	const right = Math.max(...circles.map((circle) => circle.x + circle.r))
	const top = Math.min(...circles.map((circle) => circle.y - circle.r))
	const bottom = Math.max(...circles.map((circle) => circle.y + circle.r))
	const width = right - left
	const height = bottom - top
	const scale = Math.min(box.width / (width || 1), box.height / (height || 1))
	const offsetX = box.x + (box.width - width * scale) / 2 - left * scale
	const offsetY = box.y + (box.height - height * scale) / 2 - top * scale
	return circles.map((circle) => ({
		x: circle.x * scale + offsetX,
		y: circle.y * scale + offsetY,
		r: circle.r * scale,
	}))
}

// ── ③ 비례 원 ────────────────────────────────────────────────────────────────

function buildProportionalCircle(box: Box, input: InfographicInput): VectorPrimitive[] {
	const values = firstColumn(input.data).slice(0, 2)
	const [big, small] = values.length === 2 ? values : [values[0], values[0]]
	if (big <= 0) return []
	const colors = pickSeriesColors(input.palette, 2)
	// 값은 넓이에 비례한다 — 반지름을 값에 비례시키면 큰 쪽이 규정보다 훨씬 커 보인다.
	const smallRatio = Math.sqrt(Math.max(small, 0) / big)
	// 🔴 두 원은 **맞닿는다** — 떼어 놓으면 두 덩어리가 따로 읽힌다.
	// 🔑 기준점이 없는 표현이라 작은 원이 어느 쪽에 붙을지는 회전 축이 정한다.
	//    중립이 정본(왼쪽 아래)이다.
	const angle = rotationAngle(input.rotation, 152)
	const distance = 1 + smallRatio
	const [bigCircle, smallCircle] = fitCircles(
		[
			{ x: 0, y: 0, r: 1 },
			{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, r: smallRatio },
		],
		box,
	)
	const valueSizes = valueFontSizes(
		[
			{ text: valueText(big), width: bigCircle.r * 1.4 },
			{ text: valueText(small), width: smallCircle.r * 1.4 },
		],
		bigCircle.r * 0.26 * input.textScale,
	)
	const primitives: VectorPrimitive[] = [
		{ kind: 'circle', cx: bigCircle.x, cy: bigCircle.y, radius: bigCircle.r, fill: colors[0] },
		{
			kind: 'circle',
			cx: smallCircle.x,
			cy: smallCircle.y,
			radius: smallCircle.r,
			fill: colors[1],
		},
	]
	if (!input.showValueLabels) return primitives
	return [
		...primitives,
		label(
			valueText(big),
			bigCircle.x,
			bigCircle.y,
			valueSizes[0],
			readableTextColor(colors[0]),
		),
		label(
			valueText(small),
			smallCircle.x,
			smallCircle.y,
			valueSizes[1],
			readableTextColor(colors[1]),
		),
	]
}

// ── ④ 버블 클러스터 ──────────────────────────────────────────────────────────

/**
 * 🔴 원은 **모두 맞닿는다**(정본 도판) — 가장 큰 것이 가운데에 서고 나머지가 그 둘레를 두른다.
 *    이웃끼리도 닿는 사이각을 코사인법칙으로 구하므로, 값이 어떻든 사이가 벌어지지 않는다.
 * 🔑 물리 시뮬레이션으로 풀지 않는다 — 같은 입력에 같은 결과여야 미리보기와 내보내기가 갈리지 않는다.
 */
const CLUSTER_MAX_CIRCLES = 5

/** 정본은 위성이 가운데 원의 **아래쪽**을 두른다 — 띠의 한가운데가 여기(화면 아래)에 선다. */
const CLUSTER_CANON_DEGREES = 90

/** 반지름 1인 가운데 원에 둘 다 닿는 두 위성이 서로도 닿을 때, 가운데에서 본 사이각. */
function tangentAngle(a: number, b: number): number {
	const da = 1 + a
	const db = 1 + b
	const cosine = (da * da + db * db - (a + b) ** 2) / (2 * da * db)
	return Math.acos(Math.min(1, Math.max(-1, cosine)))
}

function buildBubbleCluster(box: Box, input: InfographicInput): VectorPrimitive[] {
	// 둘레에 설 자리가 다섯을 넘으면 서로 닿은 채로는 한 바퀴에 못 담는다.
	const rows = input.data.rows.slice(0, CLUSTER_MAX_CIRCLES)
	const max = Math.max(...rows.map((row) => row.values[0] ?? 0))
	if (max <= 0) return []
	const colors = pickSeriesColors(input.palette, rows.length)
	// 값은 넓이에 비례한다 — 반지름을 값에 비례시키면 큰 쪽이 규정보다 훨씬 커 보인다.
	// 가장 큰 것이 반지름 1이고, 그것이 가운데에 선다.
	const ratios = rows.map((row) => Math.sqrt(Math.max(row.values[0] ?? 0, 0) / max))
	const hub = ratios.indexOf(Math.max(...ratios))
	const orbit = ratios.map((_, index) => index).filter((index) => index !== hub)
	const steps = orbit.map((index, order) =>
		order === 0 ? 0 : tangentAngle(ratios[orbit[order - 1]], ratios[index]),
	)
	const span = steps.reduce((total, step) => total + step, 0)
	// ponytail: 한 바퀴를 넘을 때만 고르게 눌러 겹침을 막는다 — 그때는 이웃 사이가 조금 벌어진다.
	const squeeze = span > Math.PI * 2 ? (Math.PI * 2) / span : 1
	let angle = rotationAngle(input.rotation, CLUSTER_CANON_DEGREES) - (span * squeeze) / 2
	const spots = ratios.map((ratio) => ({ x: 0, y: 0, r: ratio }))
	orbit.forEach((index, order) => {
		angle += steps[order] * squeeze
		const distance = ratios[hub] + ratios[index]
		spots[index] = {
			x: Math.cos(angle) * distance,
			y: Math.sin(angle) * distance,
			r: ratios[index],
		}
	})
	const circles = fitCircles(spots, box)
	const nameSize = sharedFontSize(
		rows.map((row, index) => ({ text: row.label, width: circles[index].r * 1.5 })),
		Math.max(...circles.map((circle) => circle.r)) * 0.44 * input.textScale,
	)
	const primitives: VectorPrimitive[] = []
	rows.forEach((row, index) => {
		const circle = circles[index]
		primitives.push({
			kind: 'circle',
			cx: circle.x,
			cy: circle.y,
			radius: circle.r,
			fill: colors[index],
		})
		// 원 안에 드는 폭은 지름보다 좁다 — 가장자리로 갈수록 세로 여유가 없다.
		if (input.showNameLabels && row.label) {
			primitives.push(
				label(row.label, circle.x, circle.y, nameSize, readableTextColor(colors[index])),
			)
		}
	})
	return primitives
}

// ── ⑤ 막대 · ⑥ 막대 트랙 ────────────────────────────────────────────────────

function buildBars(box: Box, input: InfographicInput, withTrack: boolean): VectorPrimitive[] {
	const rows = input.data.rows
	// 트랙형은 팔레트의 가장 연한 색이 트랙 자리를 가져간다 — 채움은 그 다음 색부터 뽑아야
	// 첫 막대가 트랙과 같은 색이 되어 사라지지 않는다.
	const colors = pickSeriesColors(input.palette, rows.length + 1).slice(withTrack ? 1 : 0)
	/**
	 * 🔴 그냥 막대는 **사이를 두지 않는다**(정본 도판) — 자리를 꽉 채워 한 덩어리로 읽힌다.
	 *    트랙형만 폭과 사이를 갖는다: 트랙이 자리를 말해 주므로 막대가 그 안에서 좁아질 수 있다.
	 * 🔑 두 축은 서로를 잠그지 않는다 — 합이 판을 넘으면 통째로 줄여 맞추므로 둘 다 언제나 산다.
	 */
	const unit = box.width / rows.length
	const rawGap = withTrack ? unit * input.spacing * 0.32 : 0
	const rawBar = withTrack ? unit * (0.3 + input.thickness * 1.1) : unit
	const span = rawBar * rows.length + rawGap * Math.max(0, rows.length - 1)
	const fit = Math.min(1, box.width / (span || 1))
	const barWidth = rawBar * fit
	const gap = rawGap * fit
	const originX = box.x + (box.width - span * fit) / 2
	// 트랙형은 100%가 판의 높이다. 그냥 막대는 최댓값이 판의 높이다.
	const scaleMax = withTrack ? 100 : Math.max(...rows.map((row) => row.values[0] ?? 0))
	if (scaleMax <= 0) return []
	const fontSize = barWidth * 0.3 * input.textScale
	// 칸 너비는 같지만 막대 높이가 달라, 낮은 막대에서는 글자가 막대를 넘는다.
	const valueSizes = valueFontSizes(
		rows.map((row) => {
			const value = row.values[0] ?? 0
			return {
				text: valueText(value),
				width: barWidth * 0.9,
				height: Math.max(0, Math.min(value / scaleMax, 1)) * box.height * 0.7,
			}
		}),
		fontSize,
	)
	// 이름은 길이가 달라 가장 긴 것이 크기를 정한다.
	// 🔴 상한을 기준 크기의 0.3배로 박아 두면 폭이 남아도 글자가 안 커져 읽히지 않는다 —
	//    상한은 「수치보다 작다」만 뜻하고, 실제 크기는 칸 너비가 정하게 둔다.
	const nameSize = sharedFontSize(
		rows.map((row) => ({ text: row.label, width: barWidth * 0.86 })),
		fontSize * 0.62,
	)
	const primitives: VectorPrimitive[] = []
	rows.forEach((row, index) => {
		const value = row.values[0] ?? 0
		const x = originX + (barWidth + gap) * index
		const filled = Math.max(0, Math.min(value / scaleMax, 1)) * box.height
		if (withTrack) {
			primitives.push({
				kind: 'rect',
				x,
				y: box.y,
				width: barWidth,
				height: box.height,
				fill: HD_INFOGRAPHIC_COLORS.lightGreen,
			})
		}
		primitives.push({
			kind: 'rect',
			x,
			y: box.y + box.height - filled,
			width: barWidth,
			height: filled,
			fill: colors[index],
		})
		/**
		 * 🔴 글자 색은 **글자가 실제로 앉는 면**이 정한다. 채움 기준으로만 두면 채움이 낮을 때
		 *    라벨이 채움 밖으로 올라서면서 흰 글자가 연한 트랙에 얹혀 사라진다 — 어두운 계열의
		 *    짧은 막대에서 수치가 통째로 안 보였다.
		 */
		const behind = withTrack ? HD_INFOGRAPHIC_COLORS.lightGreen : HD_INFOGRAPHIC_COLORS.white
		const fillTop = box.y + box.height - filled
		// 글자 덩어리가 어디 있느냐로 가른다 — 윗변으로 가르면 경계에 걸친 이름이 채움 위에
		// 그려지면서 트랙 기준 색을 쓴다(반대로 사라진다).
		const textColorAt = (center: number) =>
			readableTextColor(center >= fillTop ? colors[index] : behind)
		if (!input.showValueLabels) return
		// 🔴 값은 막대 **바닥**에 앉는다(정본 도판) — 위에 얹으면 막대가 낮을 때 판 위로 뜬다.
		//    트랙형은 이름이 바닥을 쓰므로 그 위에 선다.
		const valueY =
			box.y +
			box.height -
			(withTrack ? nameSize * 2.1 : valueSizes[index] * 0.9) -
			valueSizes[index] * 0.5
		primitives.push(
			label(
				valueText(value),
				x + barWidth / 2,
				valueY,
				valueSizes[index],
				textColorAt(valueY),
			),
		)
		// 트랙형에만 이름을 적는다 — 채운 자리와 트랙이 갈려 이름이 설 바닥이 생긴다.
		if (withTrack && input.showNameLabels && row.label) {
			const nameY = box.y + box.height - nameSize * 0.9
			primitives.push(label(row.label, x + barWidth / 2, nameY, nameSize, textColorAt(nameY)))
		}
	})
	return primitives
}

/**
 * 가로 막대 — 정본 밖(확장)이다. 세로 막대와 **같은 데이터, 같은 말**이고 지면만 다르다:
 * 항목 이름이 길거나 항목 수가 많을 때 세로 막대는 이름이 설 자리를 잃는다.
 */
function buildHorizontalBars(
	box: Box,
	input: InfographicInput,
	withTrack: boolean,
): VectorPrimitive[] {
	const rows = input.data.rows
	const colors = pickSeriesColors(input.palette, rows.length + 1).slice(withTrack ? 1 : 0)
	// 세로 막대와 같은 규칙이다 — 그냥 막대는 사이가 없고, 트랙형만 폭과 사이를 갖는다.
	const unit = box.height / rows.length
	const rawGap = withTrack ? unit * input.spacing * 0.32 : 0
	const rawBar = withTrack ? unit * (0.3 + input.thickness * 1.1) : unit
	const span = rawBar * rows.length + rawGap * Math.max(0, rows.length - 1)
	const fit = Math.min(1, box.height / (span || 1))
	const barHeight = rawBar * fit
	const gap = rawGap * fit
	const originY = box.y + (box.height - span * fit) / 2
	const scaleMax = withTrack ? 100 : Math.max(...rows.map((row) => row.values[0] ?? 0))
	if (scaleMax <= 0) return []
	const fontSize = barHeight * 0.4 * input.textScale
	const padding = fontSize * 0.5

	// 막대마다 길이가 달라 글자가 쓸 수 있는 폭도 다르다 — 크기를 맞추려면 먼저 다 재야 한다.
	const bars = rows.map((row, index) => {
		const value = row.values[0] ?? 0
		return {
			row,
			valueLabel: valueText(value),
			y: originY + (barHeight + gap) * index,
			filled: Math.max(0, Math.min(value / scaleMax, 1)) * box.width,
			color: colors[index],
		}
	})
	const valueSizes = valueFontSizes(
		bars.map((bar) => ({ text: bar.valueLabel, width: bar.filled - padding * 2 })),
		fontSize,
	)
	const valueSizeOf = (bar: (typeof bars)[number]) => valueSizes[bars.indexOf(bar)]
	// 🔴 값이 쓰고 남은 폭만 이름이 갖는다. 겹쳐서 둘 다 못 읽게 되느니 하나만 읽히는 쪽이 낫다.
	const nameWidthOf = (bar: (typeof bars)[number]) =>
		bar.filled - textEms(bar.valueLabel) * valueSizeOf(bar) - padding * 3
	const nameSize = sharedFontSize(
		bars
			.filter((bar) => nameWidthOf(bar) > fontSize * 0.6)
			.map((bar) => ({ text: bar.row.label, width: nameWidthOf(bar) })),
		fontSize,
	)

	const primitives: VectorPrimitive[] = []
	for (const bar of bars) {
		if (withTrack) {
			primitives.push({
				kind: 'rect',
				x: box.x,
				y: bar.y,
				width: box.width,
				height: barHeight,
				fill: HD_INFOGRAPHIC_COLORS.lightGreen,
			})
		}
		primitives.push({
			kind: 'rect',
			x: box.x,
			y: bar.y,
			width: bar.filled,
			height: barHeight,
			fill: bar.color,
		})
		const textColor = readableTextColor(bar.color)
		if (input.showValueLabels) {
			primitives.push(
				label(
					bar.valueLabel,
					box.x + bar.filled - padding,
					bar.y + barHeight / 2,
					valueSizeOf(bar),
					textColor,
					'end',
				),
			)
		}
		// 이름은 막대 머리에, 값은 막대 끝에 — 가로 막대를 쓰는 이유가 이름이라 이름을 먼저 읽는다.
		// 🔴 막대가 짧으면 이름이 설 자리가 없다. 트랙형은 트랙이 판 끝까지 있으므로 채운 자리
		//    **밖**에 적을 수 있다 — 이름을 통째로 잃는 것보다 낫다.
		if (input.showNameLabels && bar.row.label) {
			const insideName = nameWidthOf(bar) > fontSize * 0.6
			if (insideName || withTrack) {
				primitives.push(
					label(
						bar.row.label,
						box.x + (insideName ? padding : bar.filled + padding),
						bar.y + barHeight / 2,
						nameSize,
						insideName ? textColor : HD_INFOGRAPHIC_COLORS.deepGreen,
						'start',
					),
				)
			}
		}
	}
	return primitives
}

// ── ⑦ 세로 100% 누적 · ⑧ 가로 100% 누적 ─────────────────────────────────────

function buildStackedColumn(box: Box, input: InfographicInput): VectorPrimitive[] {
	const values = firstColumn(input.data)
	const sum = values.reduce((total, value) => total + value, 0)
	if (sum <= 0) return []
	const colors = pickSeriesColors(input.palette, values.length)
	// 두께 축이 기둥 폭을 정한다.
	const width = box.width * (0.16 + input.thickness * 0.58)
	const x = box.x + (box.width - width) / 2
	const fontSize = width * 0.11 * input.textScale
	// 조각 높이가 값에 비례한다 — 얇은 조각이 글자를 담을 수 있는 높이가 곧 상한이다.
	const valueSizes = valueFontSizes(
		values.map((value) => ({
			text: valueText(value),
			width: width * 0.9,
			height: (value / sum) * box.height * 0.7,
		})),
		fontSize,
	)
	const primitives: VectorPrimitive[] = []
	let cursor = box.y
	// 정본 도판이 위를 작은 조각으로 시작한다 — 데이터 순서가 곧 쌓이는 순서다.
	values.forEach((value, index) => {
		const height = (value / sum) * box.height
		primitives.push({ kind: 'rect', x, y: cursor, width, height, fill: colors[index] })
		if (input.showValueLabels) {
			primitives.push(
				label(
					valueText(value),
					x + width / 2,
					cursor + height / 2,
					valueSizes[index],
					readableTextColor(colors[index]),
				),
			)
		}
		cursor += height
	})
	return primitives
}

function buildStackedBar(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	const sum = rows.reduce((total, row) => total + (row.values[0] ?? 0), 0)
	if (sum <= 0) return []
	const colors = pickSeriesColors(input.palette, rows.length)
	// 두께 축이 띠 높이를 정한다.
	const height = box.height * (0.05 + input.thickness * 0.22)
	const y = box.y + (box.height - height) / 2
	const fontSize = height * 0.22 * input.textScale
	// 좁은 칸에서는 글자가 칸을 넘는다 — 가장 좁은 칸이 모든 이름의 크기를 정한다.
	const nameSize = sharedFontSize(
		rows.map((row) => ({
			text: row.label,
			width: ((row.values[0] ?? 0) / sum) * box.width * 0.9,
		})),
		fontSize,
	)
	const primitives: VectorPrimitive[] = []
	let cursor = box.x
	rows.forEach((row, index) => {
		const width = ((row.values[0] ?? 0) / sum) * box.width
		primitives.push({ kind: 'rect', x: cursor, y, width, height, fill: colors[index] })
		if (input.showNameLabels && row.label) {
			primitives.push(
				label(
					row.label,
					cursor + width / 2,
					y + height / 2,
					nameSize,
					readableTextColor(colors[index]),
				),
			)
		}
		cursor += width
	})
	return primitives
}

// ── ⑨ 다계열 선 ──────────────────────────────────────────────────────────────

/** 한 줄에 칸이 여럿이면 계열이 여럿이다. 가장 짧은 줄이 그릴 수 있는 계열 수를 정한다. */
function seriesCount(data: ChartData): number {
	return Math.min(...data.rows.map((row) => row.values.length))
}

function buildLine(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	if (rows.length < 2) return []
	const lines = seriesCount(input.data)
	const values = rows.flatMap((row) => row.values.slice(0, lines))
	// 축 글자는 데이터가 아니라 좌표계다 — 정본 도판도 값 라벨보다 한참 작게 둔다.
	const fontSize = Math.min(box.width, box.height) * 0.032 * input.textScale
	// 선은 면이 아니라 획이다 — 팔레트를 그대로 쓰면 연한 계열이 흰 판에서 사라진다.
	const colors = pickStrokeColors(input.palette, lines)
	// 눈금·이름·범례와 그것들이 먹는 여백은 판이 정한다(`plot-frame.ts`).
	const frame = plotFrame(box, {
		left: { kind: 'value', min: Math.min(...values), max: Math.max(...values) },
		bottom: { kind: 'category', labels: rows.map((row) => row.label), scale: 'point' },
		legend: input.showNameLabels ? { names: input.data.series, colors } : undefined,
		fontSize,
	})
	const primitives: VectorPrimitive[] = [...frame.primitives]
	for (let series = 0; series < lines; series += 1) {
		primitives.push({
			kind: 'path',
			// 정본 도판의 선은 꺾은선이다 — 중립까지는 마디를 남기고, 그 위로 부드러워진다.
			d: curvePath(
				rows.map((row, index) => ({ x: frame.x(index), y: frame.y(row.values[series]) })),
				Math.max(0, input.curvature - INFOGRAPHIC_AXIS_NEUTRAL) * 2,
			),
			stroke: colors[series],
			strokeWidth: Math.max(1.5, fontSize * (0.06 + input.thickness * 0.24)),
			fill: 'none',
		})
	}
	return primitives
}

// ── ⑩ 영역 ───────────────────────────────────────────────────────────────────

function buildArea(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	if (rows.length < 2) return []
	const areas = seriesCount(input.data)
	const max = Math.max(...rows.flatMap((row) => row.values.slice(0, areas)))
	if (max <= 0) return []
	const colors = pickSeriesColors(input.palette, areas + 1)
	const fontSize = Math.min(box.width, box.height) * 0.09 * input.textScale
	const primitives: VectorPrimitive[] = []
	/**
	 * 머릿수치 — 마지막 시점에서 **첫 계열이 마지막 계열보다 얼마나 앞섰나**.
	 * 🔑 정본 도판의 「+24%」가 바로 이 값이다(100 − 76). 카피가 아니라 데이터에서 나오므로
	 *    값을 바꾸면 따라 움직인다. 계열이 하나면 견줄 것이 없어 적지 않는다.
	 */
	if (input.showValueLabels && areas > 1) {
		const last = rows[rows.length - 1].values
		const lead = last[0] - last[areas - 1]
		primitives.push(
			label(
				`${lead > 0 ? '+' : ''}${valueText(lead)}`,
				box.x,
				box.y + fontSize * 0.6,
				fontSize * 1.6,
				HD_INFOGRAPHIC_COLORS.deepGreen,
				'start',
			),
		)
	}
	// 큰 값부터 그린다 — 뒤에 그린 작은 영역이 위에 얹혀야 두 계열이 모두 보인다.
	for (let series = 0; series < areas; series += 1) {
		const plotTop = box.y + (input.showValueLabels && areas > 1 ? box.height * 0.28 : 0)
		const plotHeight = box.y + box.height - plotTop
		const points = rows.map((row, index) => ({
			x: box.x + (index / (rows.length - 1)) * box.width,
			y: plotTop + plotHeight - (row.values[series] / max) * plotHeight,
		}))
		const fill = colors[colors.length - 1 - series]
		primitives.push({
			kind: 'path',
			// 정본 도판은 시점을 잇는 선이 **곡선**이다 — 꺾은선은 선 차트의 몫이고,
			// 영역은 「쌓여 올라가는 흐름」을 말하므로 마디가 보이면 안 된다.
			// 정본 도판의 영역은 곡선이다 — 중립에서 이미 부드럽고, 내리면 마디가 드러난다.
			d: `${curvePath(points, Math.min(1, input.curvature * 2))}L${round(box.x + box.width)} ${round(box.y + box.height)}L${round(box.x)} ${round(box.y + box.height)}Z`,
			fill,
		})
		// 끝점의 점 — 「지금 여기까지」를 찍는다.
		const tip = points[points.length - 1]
		primitives.push({
			kind: 'circle',
			cx: tip.x,
			cy: tip.y,
			radius: Math.max(1.5, fontSize * 0.09),
			fill: HD_INFOGRAPHIC_COLORS.deepGreen,
		})
		const name = input.data.series[series]
		if (!input.showNameLabels || !name) continue
		const last = points[points.length - 1]
		primitives.push(
			label(
				name,
				last.x - fontSize * 0.3,
				last.y + fontSize * 0.7,
				fontSize * 0.45,
				readableTextColor(fill),
				'end',
			),
		)
	}
	return primitives
}

// ── ⑪ 겹친 원 ────────────────────────────────────────────────────────────────

/**
 * 동심원이 아니다 — 세 원이 **아래 가장자리에 맞춰** 겹친다. 그래서 작은 원일수록 아래에 놓이고
 * 큰 원의 위쪽 띠가 드러나며, 그 띠가 라벨이 서는 자리가 된다.
 */
function buildNestedCircle(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	const max = Math.max(...firstColumn(input.data))
	if (max <= 0) return []
	const colors = pickSeriesColors(input.palette, rows.length)
	const outer = Math.min(box.width, box.height) / 2
	/**
	 * 🔑 「겹친 원」과 「동심원」은 **같은 기하의 양 끝**이다 — 중심을 맞추면 동심원이고,
	 *    아래로 몰아 세우면 겹친 원이다. 그래서 빌더도 하나다.
	 */
	/**
	 * 🔴 정렬은 **축이 아니다** — 아래 가장자리를 맞추면 「겹친 원」이고 중심을 맞추면 「동심원」이라,
	 *    그것이 두 표현을 가르는 정체성이다. 축으로 두면 중립에서 둘 중 하나는 자기 모양이 아니게 된다.
	 */
	const alignment = input.chartType === 'concentric-circle' ? 0 : 1
	/**
	 * 🔴 겹친 원의 아래 가장자리는 **붙지 않는다**(정본 도판) — 안쪽으로 갈수록 일정한 간격만큼
	 *    올라선다. 한 선에 맞추면 고리가 아니라 한 덩어리가 잘린 것처럼 읽힌다.
	 */
	const bottomGap = outer * 0.1
	/**
	 * 두께 — 고리가 얼마나 고르게 나뉘나. 중립은 **넓이 비례**(정본)이고, 내리면 차이가 벌어져
	 * 안쪽 고리가 얇아지며, 올리면 고리 두께가 고르게 된다. 값이 서로 가까울 때(100·99·98)
	 * 원이 포개져 구분되지 않는 것을 이 축이 푼다.
	 */
	const exponent = 1 - input.thickness
	const spaced = rows.map(
		(row) => outer * ((row.values[0] ?? 0) / max) ** Math.max(0.08, exponent),
	)
	const circles = fitCircles(
		spaced.map((radius, index) => ({
			x: 0,
			y: (outer - radius - bottomGap * index) * alignment,
			r: radius,
		})),
		box,
	)
	// 🔴 이름이 서는 곳은 원이 아니라 **고리**다 — 폭만 보면 얇은 고리를 글자가 넘는다.
	const ringHeights = circles.map((circle, index) => {
		const inner = index + 1 < circles.length ? circles[index + 1] : null
		const innerTop = inner ? inner.y - inner.r : circle.y + circle.r
		return Math.max(0, innerTop - (circle.y - circle.r))
	})
	const nameSize = Math.min(
		sharedFontSize(
			rows.map((row, index) => ({ text: row.label, width: circles[index].r * 1.2 })),
			Math.min(box.width, box.height) * 0.06 * input.textScale,
		),
		...ringHeights.map((height) => height * 0.62),
	)
	const primitives: VectorPrimitive[] = []
	rows.forEach((row, index) => {
		const circle = circles[index]
		primitives.push({
			kind: 'circle',
			cx: circle.x,
			cy: circle.y,
			radius: circle.r,
			fill: colors[index],
		})
		if (!input.showNameLabels || !row.label) return
		// 다음 원에 덮이지 않고 남는 위쪽 띠의 한가운데가 이름이 설 자리다.
		const inner = index + 1 < circles.length ? circles[index + 1] : null
		const innerTop = inner ? inner.y - inner.r : circle.y + circle.r
		primitives.push(
			label(
				row.label,
				circle.x,
				(circle.y - circle.r + innerTop) / 2,
				nameSize,
				readableTextColor(colors[index]),
			),
		)
	})
	return primitives
}

// ── ⑫ 겹친 사각형 ────────────────────────────────────────────────────────────

/**
 * 🔴 셋은 **크기가 같다** — 폭도 높이도 같고 아랫변이 한 선에 놓인다. 값은 크기가 아니라
 *    적힌 수치가 말한다. 자리가 셋뿐이라 그보다 많은 항목은 그릴 자리가 없다.
 */
const OVERLAP_SLOTS = 3

function buildNestedSquare(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows.slice(0, OVERLAP_SLOTS)
	if (rows.length === 0) return []
	const colors = pickSeriesColors(input.palette, rows.length)
	/**
	 * 간격이 겹침을 정한다 — 0이면 완전히 포개지고 1이면 서로 닿기만 한다. 중립이 반 겹침(정본).
	 * 🔑 크기가 같으니 판을 채우는 것은 겹침뿐이다 — 다 벌려도 판을 넘지 않을 변 길이를
	 *    그 자리에서 거꾸로 구한다.
	 */
	const step = input.spacing
	const side = Math.min(box.height, box.width / (1 + (rows.length - 1) * step))
	const stride = side * step
	const originX = box.x + (box.width - (side + stride * (rows.length - 1))) / 2
	const top = box.y + (box.height - side) / 2
	// 앞의 것은 뒤에 그려지는 사각형에 오른쪽이 덮인다 — 남는 왼쪽 띠가 수치가 설 자리다.
	const exposed = (index: number) => (index === rows.length - 1 ? side : stride)
	const valueSizes = valueFontSizes(
		rows.map((row, index) => ({
			text: valueText(row.values[0] ?? 0),
			// 이웃 수치와 붙어 한 줄로 읽히지 않을 만큼만 띠를 쓴다.
			width: exposed(index) * 0.72,
		})),
		side * 0.3 * input.textScale,
	)
	const primitives: VectorPrimitive[] = []
	// 데이터 순서대로 그린다 — 뒤의 것이 앞의 것을 덮으므로 순서가 곧 앞뒤다.
	rows.forEach((row, index) => {
		const x = originX + stride * index
		primitives.push({ kind: 'rect', x, y: top, width: side, height: side, fill: colors[index] })
		if (!input.showValueLabels) return
		primitives.push(
			label(
				valueText(row.values[0] ?? 0),
				x + exposed(index) / 2,
				top + side / 2,
				valueSizes[index],
				readableTextColor(colors[index]),
			),
		)
	})
	return primitives
}

// ── 복합 표현 ────────────────────────────────────────────────────────────────

/**
 * 🔑 넷은 **같은 데이터**를 먹는다 — 첫 줄이 열 이름(계열), 줄마다 이름 하나와 값 여럿.
 *    그래서 한 표를 붙여넣고 표현만 갈아 끼우며 볼 수 있다.
 * 🔑 넷 다 판(`plot-frame.ts`) 위에 선다. 축·눈금·범례를 각자 그리지 않는 것이 단순 표현과
 *    갈리는 자리이고, 「정보량이 많아도 통일성이 유지된다」가 성립하는 이유다.
 */

/** 계열 이름. 머리글이 없으면 빈 배열이라 범례가 서지 않는다. */
function seriesNames(data: ChartData, count: number): string[] {
	return data.series.length >= count ? data.series.slice(0, count) : []
}

/** 줄마다 계열 값을 잘라 온다 — 모자란 칸은 0이다. */
function seriesValues(row: { values: readonly number[] }, count: number): number[] {
	return Array.from({ length: count }, (_, index) => row.values[index] ?? 0)
}

/** 복합 표현이 쓰는 두 크기 중 **이름 쪽**. 축·범례·행열 이름이 전부 이 크기다. */
function frameFontSize(box: Box, input: InfographicInput): number {
	return Math.min(box.width, box.height) * 0.032 * input.textScale
}

/**
 * 히트맵 — 행 × 열 격자의 색이 값이다.
 *
 * 🔴 값→색을 **보간하지 않는다.** 브랜드 색은 정본 값이 있고 출력이 CMYK라, 두 색 사이를
 *    섞어 만든 색은 정본에 없는 색이 된다. 팔레트 색 수만큼 구간을 끊어 이산으로 칠한다.
 */
function buildHeatmap(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	const columns = seriesCount(input.data)
	if (rows.length === 0 || columns === 0) return []
	const values = rows.flatMap((row) => seriesValues(row, columns))
	const ramp = colorSteps(input, Math.min(...values), Math.max(...values))
	const fontSize = frameFontSize(box, input)
	/**
	 * 🔴 이름을 꺼도 축을 **없애지는 않는다** — 칸 수를 판이 알아야 격자가 선다. 이름만 비운다.
	 *    없앴더니 7×12 격자가 한 칸이 됐다.
	 */
	const blank = (labels: readonly string[]) =>
		input.showNameLabels ? labels : labels.map(() => '')
	const frame = plotFrame(box, {
		left: { kind: 'category', labels: blank(rows.map((row) => row.label)) },
		bottom: { kind: 'category', labels: blank(seriesNames(input.data, columns)) },
		// 🔑 색 눈금도 범례다 — 캘린더 히트맵과 같은 줄, 같은 칩, 같은 크기로 선다.
		//    그래서 켜고 끄는 스위치도 같다: 범례는 어느 표현에서든 「이름 표시」가 정한다.
		legend: input.showNameLabels ? { names: ramp.names, colors: ramp.colors } : undefined,
		fontSize,
	})
	// 간격이 칸 사이를 정한다 — 0이면 면이 이어지고, 올리면 칸이 하나씩 떨어져 읽힌다.
	const gap = Math.min(frame.bandWidth, frame.bandHeight) * input.spacing * 0.24
	const cellWidth = Math.max(1, frame.bandWidth - gap)
	const cellHeight = Math.max(1, frame.bandHeight - gap)
	const valueSizes = valueFontSizes(
		values.map((value) => ({
			text: valueText(value),
			width: cellWidth * 0.86,
			height: cellHeight * 0.7,
		})),
		fontSize,
	)
	// 🔴 칸이 작으면 수치가 읽을 수 없는 크기로 남는다 — 그럴 바엔 적지 않는다(색이 이미 말한다).
	const showValues = input.showValueLabels && valueSizes[0] >= fontSize * 0.45
	const primitives: VectorPrimitive[] = [...frame.primitives]
	rows.forEach((row, rowIndex) => {
		seriesValues(row, columns).forEach((value, column) => {
			const fill = ramp.fillOf(value)
			primitives.push({
				kind: 'rect',
				x: frame.x(column) - cellWidth / 2,
				y: frame.y(rowIndex) - cellHeight / 2,
				width: cellWidth,
				height: cellHeight,
				fill,
			})
			if (!showValues) return
			primitives.push(
				label(
					valueText(value),
					frame.x(column),
					frame.y(rowIndex),
					valueSizes[0],
					readableTextColor(fill),
				),
			)
		})
	})
	return primitives
}

/** 누적 영역 — 계열을 **쌓아** 전체의 흐름과 구성을 한 번에 본다(겹친 영역과 갈리는 자리다). */
function buildStackedArea(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	const areas = seriesCount(input.data)
	if (rows.length < 2 || areas === 0) return []
	const totals = rows.map((row) =>
		seriesValues(row, areas).reduce((sum, value) => sum + value, 0),
	)
	const colors = pickSeriesColors(input.palette, areas)
	const fontSize = frameFontSize(box, input)
	const frame = plotFrame(box, {
		left: { kind: 'value', min: 0, max: Math.max(...totals) },
		bottom: { kind: 'category', labels: rows.map((row) => row.label), scale: 'point' },
		legend: input.showNameLabels
			? { names: seriesNames(input.data, areas), colors }
			: undefined,
		fontSize,
	})
	const primitives: VectorPrimitive[] = [...frame.primitives]
	// 아래에서부터 쌓는다. 각 계열의 윗선은 그 아래 계열들의 합이다.
	const below = rows.map(() => 0)
	for (let series = 0; series < areas; series += 1) {
		const top = rows.map((row, index) => below[index] + seriesValues(row, areas)[series])
		const upper = top.map((value, index) => ({ x: frame.x(index), y: frame.y(value) }))
		const lower = below.map((value, index) => ({ x: frame.x(index), y: frame.y(value) }))
		const smooth = Math.min(1, input.curvature * 2)
		/**
		 * 🔴 되돌아오는 아랫선은 `M`으로 시작하면 안 된다 — 면이 끊기고 얇은 조각만 남는다.
		 *    `curvePath`가 내는 첫 글자 `M`을 `L`로 바꿔 윗선에 이어 붙인다.
		 */
		const back = curvePath([...lower].reverse(), smooth)
		primitives.push({
			kind: 'path',
			d: `${curvePath(upper, smooth)}L${back.slice(1)}Z`,
			fill: colors[series],
		})
		top.forEach((value, index) => {
			below[index] = value
		})
	}
	return primitives
}

/**
 * 100% 누적 막대 — 범주마다 제 몫을 100으로 맞춰 **구성만** 견준다.
 * 🔴 기존 「전체 100% 세로」와 다르다: 그쪽은 전체 **하나**를 가르고, 이쪽은 범주가 여럿이다.
 */
function buildNormalizedStack(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	const layers = seriesCount(input.data)
	if (rows.length === 0 || layers === 0) return []
	const colors = pickSeriesColors(input.palette, layers)
	const fontSize = frameFontSize(box, input)
	const frame = plotFrame(box, {
		left: { kind: 'value', min: 0, max: 100 },
		bottom: { kind: 'category', labels: rows.map((row) => row.label) },
		legend: input.showNameLabels
			? { names: seriesNames(input.data, layers), colors }
			: undefined,
		fontSize,
	})
	const { width, offset } = barSlot(frame.bandWidth, input)
	const primitives: VectorPrimitive[] = [...frame.primitives]
	const shares = rows.map((row) => {
		const values = seriesValues(row, layers)
		const sum = values.reduce((total, value) => total + value, 0)
		return sum > 0 ? values.map((value) => (value / sum) * 100) : values.map(() => 0)
	})
	const valueSizes = valueFontSizes(
		shares.flat().map((share) => ({
			text: valueText(share),
			width: width * 0.86,
			height: (share / 100) * frame.plot.height * 0.7,
		})),
		fontSize,
	)
	rows.forEach((_, index) => {
		let base = 0
		shares[index].forEach((share, layer) => {
			const top = frame.y(base + share)
			const height = frame.y(base) - top
			primitives.push({
				kind: 'rect',
				x: frame.x(index) + offset,
				y: top,
				width,
				height,
				fill: colors[layer],
			})
			if (input.showValueLabels && height > valueSizes[0] * 1.2) {
				primitives.push(
					label(
						valueText(share),
						frame.x(index) + offset + width / 2,
						top + height / 2,
						valueSizes[0],
						readableTextColor(colors[layer]),
					),
				)
			}
			base += share
		})
	})
	return primitives
}

/** 다계열 막대 — 범주마다 계열을 **나란히** 세워 같은 자리에서 맞견준다. */
function buildGroupedBars(box: Box, input: InfographicInput): VectorPrimitive[] {
	const rows = input.data.rows
	const series = seriesCount(input.data)
	if (rows.length === 0 || series === 0) return []
	const values = rows.flatMap((row) => seriesValues(row, series))
	const max = Math.max(...values)
	if (max <= 0) return []
	const colors = pickSeriesColors(input.palette, series)
	const fontSize = frameFontSize(box, input)
	const frame = plotFrame(box, {
		left: { kind: 'value', min: Math.min(0, ...values), max },
		bottom: { kind: 'category', labels: rows.map((row) => row.label) },
		legend: input.showNameLabels
			? { names: seriesNames(input.data, series), colors }
			: undefined,
		fontSize,
	})
	const group = barSlot(frame.bandWidth, input)
	// 묶음 안에서 계열이 자리를 나눠 갖는다 — 묶음 사이는 간격 축이, 계열 사이는 붙는다.
	const width = group.width / series
	/**
	 * 🔴 막대의 밑바닥은 **0**이다. 최솟값을 바닥으로 삼았더니 막대가 판 위에 떠 있었고,
	 *    가장 낮은 막대는 높이가 0이라 수치 크기까지 0으로 눌러 글자가 통째로 사라졌다.
	 */
	const zero = frame.y(0)
	const valueSizes = valueFontSizes(
		values.map((value) => ({
			text: valueText(value),
			width: width * 0.9,
			height: Math.abs(zero - frame.y(value)) * 0.7,
		})),
		fontSize,
	)
	const primitives: VectorPrimitive[] = [...frame.primitives]
	rows.forEach((row, index) => {
		seriesValues(row, series).forEach((value, column) => {
			const x = frame.x(index) + group.offset + width * column
			const y = Math.min(zero, frame.y(value))
			const height = Math.abs(zero - frame.y(value))
			primitives.push({ kind: 'rect', x, y, width, height, fill: colors[column] })
			if (input.showValueLabels && height > valueSizes[0] * 1.3) {
				primitives.push(
					label(
						valueText(value),
						x + width / 2,
						y + valueSizes[0],
						valueSizes[0],
						readableTextColor(colors[column]),
					),
				)
			}
		})
	})
	return primitives
}

/**
 * 값 구간을 팔레트 색으로 끊는다. 🔴 두 색 사이를 **섞지 않는다** — 브랜드 색은 정본 값이 있고
 * 출력이 CMYK라, 보간해 만든 색은 정본에 없는 색이 된다(ECharts의 `visualMap: piecewise`와 같다).
 */
function colorSteps(
	input: InfographicInput,
	min: number,
	max: number,
): { colors: string[]; fillOf: (value: number) => string; names: string[] } {
	const colors = pickSeriesColors(input.palette, 5)
	const span = max - min
	return {
		colors,
		fillOf: (value) => {
			if (span <= 0) return colors[colors.length - 1]
			const step = Math.floor(((value - min) / span) * colors.length)
			return colors[Math.min(colors.length - 1, Math.max(0, step))]
		},
		// 🔑 눈금은 **구간의 아래끝**이다. 「0~20%」처럼 적으면 글자가 길어 범례가 두 줄이 된다.
		//    소수점은 버린다 — 눈금은 값이 아니라 구간을 가리키므로 자릿수가 정보가 아니다.
		names: colors.map((_, index) =>
			valueText(Math.round(min + (span * index) / colors.length)),
		),
	}
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const
const DAY_MS = 24 * 60 * 60 * 1000

/** `YYYY-MM-DD`만 읽는다. 읽히지 않는 줄은 날짜가 아니라 건너뛴다. */
function parseDay(label: string): number | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(label.trim())
	if (!match) return null
	return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/**
 * 캘린더 히트맵 — 한 해를 주(가로) × 요일(세로)로 펴고 하루를 한 칸으로 칠한다.
 *
 * 🔑 자리는 날짜가 정한다(ECharts `calendar` 좌표계와 같다) — 값은 색만 정하므로 빈 날이 있어도
 *    달력이 어긋나지 않는다. 주의 시작은 일요일이다.
 */
function buildCalendarHeatmap(box: Box, input: InfographicInput): VectorPrimitive[] {
	const days = input.data.rows.flatMap((row) => {
		const time = parseDay(row.label)
		return time === null ? [] : [{ time, value: row.values[0] ?? 0 }]
	})
	if (days.length === 0) return []
	const first = Math.min(...days.map((day) => day.time))
	// 첫 날이 속한 주의 일요일이 좌표계의 원점이다.
	const origin = first - new Date(first).getUTCDay() * DAY_MS
	const weekOf = (time: number) => Math.floor((time - origin) / (7 * DAY_MS))
	const weeks = Math.max(...days.map((day) => weekOf(day.time))) + 1
	const values = days.map((day) => day.value)
	const ramp = colorSteps(input, Math.min(...values), Math.max(...values))
	const fontSize = frameFontSize(box, input)

	// 달이 시작하는 주에만 달 이름을 적는다 — 53칸에 전부 적으면 한 덩어리가 된다.
	const months = Array.from({ length: weeks }, () => '')
	for (const day of days) {
		const date = new Date(day.time)
		// 🔴 「1~7일이 든 주」로 잡으면 한 달이 두 주에 걸쳐 같은 이름이 두 번 서고 서로 겹친다.
		if (date.getUTCDate() === 1) months[weekOf(day.time)] = `${date.getUTCMonth() + 1}월`
	}
	const spec = {
		left: {
			kind: 'category' as const,
			labels: input.showNameLabels ? [...WEEKDAYS] : WEEKDAYS.map(() => ''),
		},
		bottom: {
			kind: 'category' as const,
			labels: input.showNameLabels ? months : months.map(() => ''),
		},
		legend: input.showNameLabels ? { names: ramp.names, colors: ramp.colors } : undefined,
		fontSize,
	}
	/**
	 * 🔴 달력은 판을 **세로로 채우지 않는다.** 하루가 정사각형이고 일곱 줄이 맞붙어야 달력으로
	 *    읽히는데, 판 높이를 7로 나누면 줄 사이가 벌어져 띠 일곱 개가 된다.
	 * 🔑 그래서 두 번 잰다 — 한 번은 여백이 얼마인지 알아내려고, 한 번은 그 여백에 하루 일곱 줄만
	 *    더한 높이로. 여백은 글자가 정하므로 미리 계산할 수 없다.
	 */
	const probe = plotFrame(box, spec)
	const compact = Math.min(box.height, box.height - probe.plot.height + probe.bandWidth * 7)
	// 줄인 만큼 위로 붙지 않게 가운데로 내린다.
	const frame = plotFrame(
		{ ...box, y: box.y + (box.height - compact) / 2, height: compact },
		spec,
	)
	const gap = frame.bandWidth * input.spacing * 0.24
	const cell = Math.max(1, Math.min(frame.bandWidth, frame.bandHeight) - gap)
	return [
		...frame.primitives,
		...days.map((day) => ({
			kind: 'rect' as const,
			x: frame.x(weekOf(day.time)) - cell / 2,
			y: frame.y(new Date(day.time).getUTCDay()) - cell / 2,
			width: cell,
			height: cell,
			fill: ramp.fillOf(day.value),
		})),
	]
}

/**
 * 한 칸 안에서 막대가 차지하는 폭과 그 시작 위치. 🔑 두께와 간격이 **서로를 잠그지 않는다** —
 * 합이 칸을 넘으면 통째로 줄여 맞춘다(막대·트랙과 같은 규칙).
 */
function barSlot(band: number, input: InfographicInput): { width: number; offset: number } {
	const raw = band * (0.3 + input.thickness * 1.1)
	const gap = band * input.spacing * 0.32
	const width = Math.max(1, Math.min(raw, band - gap))
	return { width, offset: -width / 2 }
}

const model = {
	createVectorArtifact: (values, viewport) => ({
		kind: 'vector' as const,
		source: createInfographicScene(toInfographicInput(values), viewport),
	}),
	/**
	 * 표현을 고르면 **그 표현의 이상적인 데이터**가 기본값이 된다. 「초기화」가 되돌리는 자리도 여기다.
	 * 🔑 restriction인 이유: binding은 viewport만 받아 값이 바뀌어도 다시 계산되지 않는다.
	 * 🔴 현재 값은 건드리지 않는다 — 표현을 바꿀 때마다 사용자가 넣은 데이터를 덮으면 안 된다.
	 *    포맷이 12종 공통이라 대개 그대로 유효하고, 아니면 초기화가 있다.
	 */
	/**
	 * 🔴 표현 **선택지는 좁히지 않는다**. 데이터에 맞지 않는다고 숨기면 창작자는 왜 사라졌는지
	 *    알 수 없고, 자리가 모자란 것은 앞에서부터 쓰면 그만이다.
	 */
	getRestrictions: (values): StudioControllerRestrictions => {
		const chartType = pick(values.chartType, CHART_TYPE_IDS, INFOGRAPHIC_DEFAULT_CHART_TYPE)
		const chart = INFOGRAPHIC_CHART_TYPES.find((candidate) => candidate.id === chartType)
		return {
			controls: [
				// 이름을 쓰지 않는 표현에서는 「이름 표시」가 아무것도 하지 않는다 — 잠근다.
				...(chart?.usesNameLabels === false
					? [{ controlId: 'showNameLabels', availability: 'disabled' as const }]
					: []),
				/**
				 * 형태 축은 표현마다 뜻이 다르다 — 쓰지 않는 축은 잠근다. 기본값은 좁히지 않는다:
				 * 가운데(0.5)가 어느 표현에서든 정본 모양이라, 표현을 바꿔도 값이 그대로 뜻이 통한다.
				 */
				...INFOGRAPHIC_AXES.filter(
					(name) => !((chart?.axes ?? []) as ChartAxes).includes(name),
				).map((name) => ({ controlId: name, availability: 'disabled' as const })),
				{ controlId: 'data', defaultValue: INFOGRAPHIC_SAMPLE_DATA[chartType] },
			],
		}
	},
} satisfies GraphicModelAdapter

export default model

export type { ChartData }
export { EMPTY_CHART_DATA, INFOGRAPHIC_SAMPLE_DATA, parseChartData }
