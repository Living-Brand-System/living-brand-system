import { z } from 'zod'
import type { GraphicModelAdapter } from '@/features/graphic-generation/runtime/graphic-plugin'
import type { VectorSceneArtifact } from '@/modules/studio-artifact/studio-artifact'
import {
	type ControllerControlValue,
	type ControllerRuntimeBindings,
	type ControllerValues,
	isControllerPadValue,
	type StudioControllerRestrictions,
} from '@/modules/studio-controller/controller-definition'
import {
	KEY_VISUAL_PATTERN_COLORWAYS,
	KEY_VISUAL_PATTERN_DEFAULT_INPUT,
	KEY_VISUAL_PATTERN_DEFAULT_PRESET,
	KEY_VISUAL_PATTERN_DIRECTIONS,
	KEY_VISUAL_PATTERN_PRESETS,
	KEY_VISUAL_PATTERN_REFERENCE_BASE,
	KEY_VISUAL_PATTERN_VIEWPOINTS,
	type KeyVisualPatternColorwayId,
	toControllerPadValue,
} from './definition'

export { KEY_VISUAL_PATTERN_DEFAULT_INPUT, KEY_VISUAL_PATTERN_REFERENCE_BASE } from './definition'

/**
 * 🔴 캔버스 크기 경계 — 원본과 다른 유일한 구조적 결정이다.
 *
 * 브랜드팀 원본은 「작성자가 입력한 실제 크기」를 따로 들고 있고 화면에는 720px로 축소해서만
 * 보여줬다(targetCw/targetCh + previewScale + PREVIEW_MAX_DIM). 이 리포는 그 세 개념을 갖지 않는다:
 * 미리보기는 뷰포트 크기로 씬을 만들고, export는 `getGraphicStudioVectorArtifact`가 요청 크기로 씬을
 * 처음부터 다시 계산한다. 즉 크기는 이미 export 경계가 소유한다.
 *
 * 그래서 여기서는 **viewport를 곧 실제 크기로 간주한다.** 스케일은 축별이 아니라 짧은 변 하나에서
 * 나오고(width/720·height/720을 따로 쓰면 여백비가 그대로 화면비가 된다), 여백은 그 변의
 * `MARGIN_RATIO`다. previewScale류를 되살리면 export가 소유한 것을 두 곳에서 정하게 된다.
 */

/** 여백은 짧은 변의 비율이다 — 사방이 절대 같고, 판이 길어져도 따라 커지지 않는다. */
const MARGIN_RATIO = 0.06
/** 기준점이 이 칸 수 이내로 끝에 붙으면 끝으로 스냅한다 — 두 줄짜리 사분면을 만들지 않는다. */
const EDGE_SNAP_CELLS = 2
/**
 * 꼭짓점 예외 칸을 기준 자리에서 꼭짓점 쪽으로 얼마나 더 붙일지 — 대각선 축으로 두께의 몇 배인가.
 * 기준 자리는 square cap의 바깥 꼭지가 같은 행·열의 바깥 모서리(칸에서 두께의 절반)에 닿는 곳이다.
 * 1이면 선의 바깥 끝점 자체가 그 모서리에 놓인다(축마다 두께/√2). 눈으로 보고 고른 값이다.
 *
 * 🔴 취향값이라 바뀐다 — 테스트는 이 숫자를 박지 말고 여기서 가져다 관계를 검사한다.
 */
export const CORNER_OUTWARD_NUDGE = 0.75

const directionIds = KEY_VISUAL_PATTERN_DIRECTIONS.map((option) => option.value)
const viewpointIds = KEY_VISUAL_PATTERN_VIEWPOINTS.map((option) => option.value)
/** Object.keys는 키 타입을 좁혀 주지 않는다 — 조합의 정본은 definition의 표 하나다. */
const colorwayIds = Object.keys(KEY_VISUAL_PATTERN_COLORWAYS) as KeyVisualPatternColorwayId[]
const presetIds = KEY_VISUAL_PATTERN_PRESETS.map((preset) => preset.key)

export const keyVisualPatternInputSchema = z.strictObject({
	direction: z.enum(directionIds),
	viewpoint: z.enum(viewpointIds),
	colorway: z.enum(colorwayIds),
	columnGap: z.number().min(10).max(30),
	rowGap: z.number().min(10).max(30),
	variableWeight: z.boolean(),
	minWeight: z.number().min(1).max(10),
	maxWeight: z.number().min(1).max(20),
	origin: z.strictObject({
		x: z.number().min(0).max(1),
		y: z.number().min(0).max(1),
	}),
	lineLength: z.number().min(1).max(200),
	minCellGap: z.number().min(0).max(100),
	lengthFillRatio: z.number().min(0).max(1),
	depthGamma: z.number().min(1).max(6),
	depthScaleMin: z.number().min(0.01).max(1),
})

export type KeyVisualPatternInput = z.infer<typeof keyVisualPatternInputSchema>

/** 알 수 없는 선택지는 기본으로 떨어진다 — 저장된 값이 낡아도 화면은 뜬다. */
function resolveOption<Id extends string>(
	value: ControllerControlValue,
	allowed: readonly Id[],
	fallback: Id,
): Id {
	return typeof value === 'string' && (allowed as readonly string[]).includes(value)
		? (value as Id)
		: fallback
}

/**
 * Controller 값을 Key Visual Pattern 입력으로 바꾸고 검증한다.
 * 컨트롤이 없는 5개 값은 기본값 스프레드에서 그대로 온다 — 사용자가 못 바꾸지만 계산에는 쓰인다.
 */
export function toKeyVisualPatternInput(values: ControllerValues): KeyVisualPatternInput {
	const base = KEY_VISUAL_PATTERN_DEFAULT_INPUT
	const origin = values.origin
	const parsed = keyVisualPatternInputSchema.parse({
		...base,
		direction: resolveOption(values.direction, directionIds, base.direction),
		viewpoint: resolveOption(values.viewpoint, viewpointIds, base.viewpoint),
		colorway: resolveOption(values.colorway, colorwayIds, base.colorway),
		columnGap: values.columnGap ?? base.columnGap,
		rowGap: values.rowGap ?? base.rowGap,
		variableWeight: values.variableWeight ?? base.variableWeight,
		minWeight: values.minWeight ?? base.minWeight,
		maxWeight: values.maxWeight ?? base.maxWeight,
		// pad 값이 없으면 기본 기준점이다 — 위 필드들의 `?? base.x`와 같은 폴백이고,
		// 그냥 흘리면 명시적 undefined가 스프레드한 기본값을 덮어 parse가 던진다.
		origin: isControllerPadValue(origin)
			? { x: (origin.x + 1) / 2, y: (origin.y + 1) / 2 }
			: base.origin,
	})

	// 🔴 두 슬라이더가 서로를 모른다 — 「가장 얇은 라인」을 「가장 두꺼운 라인」 위로 올릴 수 있고,
	//    그러면 lerp(max, min)이 뒤집혀 기준점이 가장 얇아진다(라벨이 거짓이 된다).
	//    Definition의 min/max는 정적이라 UI에서 상한을 걸 수 없으므로 값 경계에서 얇은 쪽을 눌러 둔다.
	//    두꺼운 쪽을 내리면 얇은 쪽이 따라 내려온다 — 어느 슬라이더를 움직여도 반응은 남는다.
	return { ...parsed, minWeight: Math.min(parsed.minWeight, parsed.maxWeight) }
}

type Point = {
	x: number
	y: number
}

export type KeyVisualPatternDash = {
	x1: number
	y1: number
	x2: number
	y2: number
	weight: number
}

export type KeyVisualPatternScene = {
	width: number
	height: number
	backgroundColor: string
	lineColor: string
	origin: Point
	dashes: KeyVisualPatternDash[]
}

/**
 * 기준 px control을 현재 캔버스 px로 환산한 값. 🔴 스케일은 **짧은 변 하나**뿐이고 여백·선 길이·
 * 최소 간격·두께가 전부 그것을 쓴다 — 축마다 다른 비율을 쓰면 비정방 캔버스에서 여백과 압축 하한이
 * 비대칭이 된다.
 * 🔴 `columnGap`·`rowGap`만은 환산값이 아니라 **역산값**이다 — 여백을 먼저 고정하고 정수 칸에
 * 맞추므로 `available / (칸 수 - 1)`로 나온다. 지정 간격과 반 칸 안쪽으로 어긋난다.
 */
type KeyVisualPatternMetrics = {
	columns: number
	rows: number
	columnGap: number
	rowGap: number
	horizontalMargin: number
	verticalMargin: number
	lineLength: number
	minCellGap: number
	minLineWeight: number
	maxLineWeight: number
}

type AxisLayout = {
	positions: number[]
	scales: number[]
	gaps: number[]
}

export function createKeyVisualPatternScene(
	input: KeyVisualPatternInput,
	viewport: { width: number; height: number },
): KeyVisualPatternScene {
	const colorway = KEY_VISUAL_PATTERN_COLORWAYS[input.colorway]
	const metrics = createMetrics(input, viewport)
	const { origin, columnIndex, rowIndex } = snapOrigin(input, viewport, metrics)
	// 입체가 아니면 축 레이아웃 자체를 만들지 않는다 — 평면은 균등 격자다.
	const layout =
		input.viewpoint === 'perspective'
			? {
					row: computeAxisLayout({
						count: metrics.rows,
						gap: metrics.rowGap,
						minPos: metrics.verticalMargin,
						originIndex: rowIndex,
						minCellGap: metrics.minCellGap,
						depthGamma: input.depthGamma,
						depthScaleMin: input.depthScaleMin,
					}),
					column: computeAxisLayout({
						count: metrics.columns,
						gap: metrics.columnGap,
						minPos: metrics.horizontalMargin,
						originIndex: columnIndex,
						minCellGap: metrics.minCellGap,
						depthGamma: input.depthGamma,
						depthScaleMin: input.depthScaleMin,
					}),
				}
			: null
	const spanX = (metrics.columns - 1) * metrics.columnGap
	const spanY = (metrics.rows - 1) * metrics.rowGap
	const flatSafeGap = Math.min(metrics.columnGap, metrics.rowGap)
	const dashes: KeyVisualPatternDash[] = []

	for (let row = 0; row < metrics.rows; row++) {
		for (let column = 0; column < metrics.columns; column++) {
			const position = getGridPosition(metrics, layout, row, column)
			const { angle, anchorInward } = getLineOrientation(
				input,
				metrics,
				position,
				origin,
				row,
				column,
			)
			const weight = input.variableWeight
				? getLineWeight(metrics, position, origin, spanX, spanY)
				: metrics.minLineWeight
			// 선이 작아지는 이유는 둘이다: 기준점에서 멀어져서(depthScale), 옆 칸을 침범하지 않으려고
			// (safetyScale). 더 많이 줄이는 쪽 하나를 길이·두께에 똑같이 곱해 비율을 지킨다.
			// 🔴 평면에도 걸린다 — localGap이 없으면 공칭 간격으로 떨어지고, 기본값에서 이미 0.51배다.
			const safeGap = position.localGap ?? flatSafeGap
			const safetyScale =
				metrics.lineLength > 0
					? clamp((safeGap * input.lengthFillRatio) / metrics.lineLength, 0, 1)
					: 0
			const finalScale = Math.min(position.depthScale, safetyScale)
			const length = metrics.lineLength * finalScale
			const strokeWeight = weight * finalScale
			const halfX = Math.cos(angle) * length * 0.5
			const halfY = Math.sin(angle) * length * 0.5
			// 꼭짓점 예외 칸만 가운데가 아니라 바깥쪽으로 밀어 앉힌다 — 가운데를 칸에 맞추면
			// 대각선이라 혼자 격자 밖으로 나간다. 기준 자리(cap 바깥 꼭지가 모서리에 닿는 곳)에서
			// 꼭짓점 쪽으로 CORNER_OUTWARD_NUDGE만큼 더 붙인다.
			const inset = anchorInward
				? length * 0.5 + (1 - Math.SQRT1_2 - CORNER_OUTWARD_NUDGE) * strokeWeight
				: 0
			const centerX = position.x + Math.cos(angle) * inset
			const centerY = position.y + Math.sin(angle) * inset

			dashes.push({
				x1: centerX + halfX,
				y1: centerY + halfY,
				x2: centerX - halfX,
				y2: centerY - halfY,
				weight: strokeWeight,
			})
		}
	}

	return {
		width: viewport.width,
		height: viewport.height,
		backgroundColor: colorway.background,
		lineColor: colorway.line,
		origin,
		dashes,
	}
}

function createMetrics(
	input: KeyVisualPatternInput,
	viewport: { width: number; height: number },
): KeyVisualPatternMetrics {
	// 🔴 스케일도 여백도 **짧은 변 하나**에서 나온다. 축마다 폭·높이 비율을 따로 쓰면 여백비가 그대로
	//    화면비가 되고(5:1 판에서 여백이 5배), 같은 간격 값이 축마다 다른 간격으로 그려진다.
	const shortSide = Math.min(viewport.width, viewport.height)
	const scale = shortSide / KEY_VISUAL_PATTERN_REFERENCE_BASE
	const margin = shortSide * MARGIN_RATIO
	const availableWidth = viewport.width - margin * 2
	const availableHeight = viewport.height - margin * 2
	const columns = getAxisCount(availableWidth, input.columnGap * scale)
	const rows = getAxisCount(availableHeight, input.rowGap * scale)

	return {
		columns,
		rows,
		// 여백을 먼저 고정했으므로 맞춰지는 쪽은 간격이다 — 격자가 양 끝 여백선에 정확히 착지한다.
		// 지정 간격과는 반 칸 안쪽으로 어긋나고, 긴 변에서는 칸이 늘어 간격이 그 값에 수렴한다.
		columnGap: columns > 1 ? availableWidth / (columns - 1) : 0,
		rowGap: rows > 1 ? availableHeight / (rows - 1) : 0,
		horizontalMargin: margin,
		verticalMargin: margin,
		lineLength: input.lineLength * scale,
		minCellGap: input.minCellGap * scale,
		minLineWeight: input.minWeight * scale,
		maxLineWeight: input.maxWeight * scale,
	}
}

/**
 * 여백 안쪽에 지정 간격으로 들어가는 칸 수. 긴 변일수록 칸이 늘어난다 — 칸 크기를 판형에 맡기지
 * 않는 것이 「변이 길면 간격도 커진다」를 없애는 자리다.
 *
 * 짝수면 정중앙 칸이 없으므로 항상 홀수로 만든다(넘치지 않게 하나 줄인다).
 * 🔴 뷰포트가 0이면 간격도 0이라 나눗셈이 NaN이다 — 그 경계에서 한 칸으로 떨어뜨린다.
 */
function getAxisCount(available: number, gap: number) {
	if (!(gap > 0) || !(available > 0)) return 1
	const raw = Math.floor(available / gap) + 1
	return Math.max(1, raw % 2 === 0 ? raw - 1 : raw)
}

/**
 * 기준점은 항상 칸에 스냅된다. 그 칸은 압축되지 않으므로 입체에서도 기준 행·열은 수평·수직을
 * 유지하고, 각도·두께 계산도 이 스냅된 좌표를 쓴다(원시 pad 좌표가 아니다).
 */
function snapOrigin(
	input: KeyVisualPatternInput,
	viewport: { width: number; height: number },
	metrics: KeyVisualPatternMetrics,
) {
	const columnIndex = snapIndex(
		input.origin.x * viewport.width,
		metrics.columnGap,
		metrics.horizontalMargin,
		metrics.columns,
	)
	const rowIndex = snapIndex(
		input.origin.y * viewport.height,
		metrics.rowGap,
		metrics.verticalMargin,
		metrics.rows,
	)
	return {
		columnIndex,
		rowIndex,
		origin: {
			x: metrics.horizontalMargin + columnIndex * metrics.columnGap,
			y: metrics.verticalMargin + rowIndex * metrics.rowGap,
		} satisfies Point,
	}
}

function snapIndex(value: number, gap: number, offset: number, count: number) {
	// 🔴 뷰포트가 0이면 간격도 0이 된다. 0으로 나눈 NaN은 clamp를 통과해 씬 전체를 NaN으로 만든다.
	if (gap <= 0) return 0
	return snapToEdge(clamp(Math.round((value - offset) / gap), 0, count - 1), count)
}

/**
 * 기준점이 끝에서 EDGE_SNAP_CELLS칸 안쪽에 서면 그쪽 사분면이 두 줄 이하로 납작해져 어색해진다.
 * 그 자리에 아예 못 서게 끝으로 붙인다 — 드래그하면 마지막 두 칸이 건너뛰어진다.
 */
function snapToEdge(index: number, count: number) {
	const last = count - 1
	if (index > EDGE_SNAP_CELLS && index < last - EDGE_SNAP_CELLS) return index
	// 칸이 적어 양쪽 구간이 겹치면 가까운 끝으로 보낸다.
	return index * 2 <= last ? 0 : last
}

/**
 * 기준점 칸을 그대로 두고 거기서 첫 칸 쪽·마지막 칸 쪽으로 각각 따로 압축한다.
 * 행의 y는 행 번호에서만, 열의 x는 열 번호에서만 나오므로 같은 행은 같은 y를 유지한다.
 */
function computeAxisLayout({
	count,
	gap,
	minPos,
	originIndex,
	minCellGap,
	depthGamma,
	depthScaleMin,
}: {
	count: number
	gap: number
	minPos: number
	originIndex: number
	minCellGap: number
	depthGamma: number
	depthScaleMin: number
}): AxisLayout {
	const positions = new Array<number>(count)
	const scales = new Array<number>(count)
	positions[originIndex] = minPos + originIndex * gap
	scales[originIndex] = 1

	// 기준점이 이미 그 끝이면 그 방향 세그먼트는 없다 — 코너 기준점은 한 방향만 압축된다.
	applySegment(0)
	applySegment(count - 1)

	function applySegment(toIndex: number) {
		const segmentCount = Math.abs(toIndex - originIndex) + 1
		if (segmentCount <= 1) return

		const step = toIndex > originIndex ? 1 : -1
		const fromPos = positions[originIndex]
		const farBoundaryPos = minPos + toIndex * gap
		const idealPositions: number[] = []
		const segmentScales: number[] = []

		for (let k = 0; k < segmentCount; k++) {
			const rawT = k / (segmentCount - 1) // 0=기준점, 1=이 방향의 그리드 경계
			const nearness = 1 - rawT
			// gamma>1이라 기준점 근처는 완만하고 경계 쪽이 압축된다.
			const spatialT = 1 - (1 - rawT) ** depthGamma
			idealPositions.push(lerp(fromPos, farBoundaryPos, spatialT))
			segmentScales.push(lerp(depthScaleMin, 1, nearness ** depthGamma))
		}

		// 이상 위치를 자르는 게 아니라 이상 간격에 하한을 걸고 처음부터 다시 누적한다 —
		// 그래야 압축된 칸에서도 선들이 서로 뭉치지 않는다.
		const direction = farBoundaryPos >= fromPos ? 1 : -1
		const segmentPositions = [idealPositions[0]]
		for (let k = 1; k < segmentCount; k++) {
			const idealGap = Math.abs(idealPositions[k] - idealPositions[k - 1])
			segmentPositions.push(
				segmentPositions[k - 1] + direction * Math.max(minCellGap, idealGap),
			)
		}

		// 하한 때문에 늘어난 간격이 쌓이면 경계 밖으로 튀어나간다. 기준점을 앵커로 두고 비례 축소한다.
		// 🔴 예외 경로가 아니다 — 720×720 기본값·중앙 기준점에서 이미 발동해 최종 간격이 minCellGap 밑으로
		//    내려간다(7.734 < 8). 「minCellGap이 최종 하한」은 불변식이 아니다.
		const actualSpan = Math.abs(segmentPositions[segmentCount - 1] - segmentPositions[0])
		const allowedSpan = Math.abs(farBoundaryPos - fromPos)
		if (actualSpan > allowedSpan && actualSpan > 0) {
			const overshootFix = allowedSpan / actualSpan
			for (let k = 0; k < segmentCount; k++) {
				segmentPositions[k] =
					segmentPositions[0] + (segmentPositions[k] - segmentPositions[0]) * overshootFix
			}
		}

		for (let k = 0; k < segmentCount; k++) {
			const index = originIndex + step * k
			positions[index] = segmentPositions[k]
			scales[index] = segmentScales[k]
		}
	}

	// 보정 이후 실제 이웃 간격. 칸마다 정체가 다르다 — 끝 칸은 한쪽만, 안쪽 칸은 양쪽 평균이다.
	const gaps: number[] = []
	for (let index = 0; index < count; index++) {
		if (count === 1) gaps.push(gap)
		else if (index === 0) gaps.push(Math.abs(positions[1] - positions[0]))
		else if (index === count - 1)
			gaps.push(Math.abs(positions[count - 1] - positions[count - 2]))
		else gaps.push(Math.abs(positions[index + 1] - positions[index - 1]) / 2)
	}

	return { positions, scales, gaps }
}

function getGridPosition(
	metrics: KeyVisualPatternMetrics,
	layout: { row: AxisLayout; column: AxisLayout } | null,
	row: number,
	column: number,
): Point & { depthScale: number; localGap: number | null } {
	if (!layout) {
		return {
			x: metrics.horizontalMargin + column * metrics.columnGap,
			y: metrics.verticalMargin + row * metrics.rowGap,
			depthScale: 1,
			localGap: null,
		}
	}
	return {
		x: layout.column.positions[column],
		y: layout.row.positions[row],
		depthScale: (layout.row.scales[row] + layout.column.scales[column]) / 2,
		localGap: Math.min(layout.row.gaps[row], layout.column.gaps[column]),
	}
}

/** 각도와 함께 「그 칸을 가운데가 아니라 바깥 끝으로 앉힐지」를 돌려준다 — 꼭짓점 예외에만 쓴다. */
function getLineOrientation(
	input: KeyVisualPatternInput,
	metrics: KeyVisualPatternMetrics,
	position: Point,
	origin: Point,
	row: number,
	column: number,
): { angle: number; anchorInward: boolean } {
	if (input.direction === 'vertical') return { angle: Math.PI / 2, anchorInward: false }
	if (input.direction === 'horizontal') return { angle: 0, anchorInward: false }

	let directionX = origin.x - position.x
	let directionY = origin.y - position.y
	let anchorInward = false

	// 기준점이 칸에 스냅되므로 거리가 정확히 0인 칸이 매 렌더에 하나 생기고, 그 칸만 각도를 못 구한다.
	// 🔴 원본(HD_PATTERN.js L719~723)의 설명 주석이 코드와 정반대다("위/아래 끝 줄이면 세로 / 좌우 끝
	//    줄이면 가로"). 화면을 만든 것은 코드이므로 코드를 정본으로 옮겼다 — 끝 행은 가로, 끝 열은 세로다.
	if (directionX === 0 && directionY === 0) {
		const isRowEdge = row === 0 || row === metrics.rows - 1
		const isColumnEdge = column === 0 || column === metrics.columns - 1
		// 🔴 파생 간격(metrics)이 아니라 **지정 간격**으로 가른다. 파생 쪽은 정수 칸에 맞추느라 두 축이
		//    1~6% 안으로 붙어서, 어느 쪽이 큰지를 칸 수 반올림이 정한다 — 슬라이더 한 칸에 이 칸만
		//    90° 돌고, 하필 기준 칸이라 화면에서 가장 두꺼운 선이다.
		const preferVertical = input.columnGap > input.rowGap

		if (isRowEdge && isColumnEdge) {
			// 🔴 판의 꼭짓점에서만 끝 행(가로)과 끝 열(세로)이 같은 칸에서 만난다. 둘 중 하나를 고르면
			//    그 줄이 한 칸 끊겨 보이므로 여기만 안쪽 대각선으로 둔다.
			directionX = column === 0 ? 1 : -1
			directionY = row === 0 ? 1 : -1
			anchorInward = true
		} else if (isColumnEdge) {
			directionX = 0
			directionY = 1
		} else if (isRowEdge) {
			directionX = 1
			directionY = 0
		} else if (preferVertical) {
			directionX = 0
			directionY = 1
		} else {
			directionX = 1
			directionY = 0
		}
	}

	return { angle: Math.atan2(directionY, directionX), anchorInward }
}

/**
 * 기준점에서 멀어질수록 얇아진다. 정규화 기준은 원근 위치가 아니라 평면 격자 전체의 대각선이다 —
 * 그래야 기준점을 가장 끝 칸에 올렸을 때 두께가 정확히 최솟값이 된다.
 *
 * 🔴 감쇠가 선형이다. Forward Straight는 smoothstep을 쓰지만 여기서는 원본이 일부러 쓰지 않았다
 *    (중간 지점에서 두께가 유독 빠르게 바뀌어 보인다).
 */
function getLineWeight(
	metrics: KeyVisualPatternMetrics,
	position: Point,
	origin: Point,
	spanX: number,
	spanY: number,
) {
	const distance = Math.hypot(origin.x - position.x, origin.y - position.y)
	const maxFalloffDistance = Math.hypot(spanX, spanY)
	// 🔴 1×1 격자에서는 대각선이 0이다. 0으로 나눈 NaN은 clamp를 그대로 통과해 두께로 새 나간다.
	const progress = maxFalloffDistance > 0 ? clamp(distance / maxFalloffDistance, 0, 1) : 0
	return lerp(metrics.maxLineWeight, metrics.minLineWeight, progress)
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

function lerp(start: number, end: number, progress: number) {
	return start + (end - start) * progress
}

export function createKeyVisualPatternVectorArtifact(
	scene: KeyVisualPatternScene,
): VectorSceneArtifact {
	return {
		kind: 'vector',
		source: {
			width: scene.width,
			height: scene.height,
			background: scene.backgroundColor,
			primitives: scene.dashes.map((dash) => ({
				kind: 'line' as const,
				x1: dash.x1,
				y1: dash.y1,
				x2: dash.x2,
				y2: dash.y2,
				stroke: scene.lineColor,
				strokeWidth: dash.weight,
				lineCap: 'square' as const,
			})),
		},
	}
}

const model = {
	createVectorArtifact: (values, viewport) =>
		createKeyVisualPatternVectorArtifact(
			createKeyVisualPatternScene(toKeyVisualPatternInput(values), viewport),
		),
	/**
	 * 프리셋을 고르면 그 묶음이 다른 컨트롤의 **기본값**이 된다. 🔴 색만 건드리지 않는다 — 창작자가
	 * 고른 색이 프리셋 하나에 사라지면 안 된다. 값을 직접 덮지 않는 이유는 공용 provider가
	 * 「손대지 않은 값만 새 기본값을 따라가고 손댄 값은 지킨다」를 이미 갖고 있어서다.
	 * 🔴 그래서 창작자가 이미 만진 컨트롤은 프리셋을 골라도 안 움직인다 — 의도된 동작이다.
	 */
	getRestrictions: (values): StudioControllerRestrictions => {
		const id = resolveOption(values.preset, presetIds, KEY_VISUAL_PATTERN_DEFAULT_PRESET)
		const preset =
			KEY_VISUAL_PATTERN_PRESETS.find((candidate) => candidate.key === id) ??
			KEY_VISUAL_PATTERN_PRESETS[0]
		const { origin, ...axes } = preset.values
		return {
			controls: [
				...Object.entries(axes).map(([controlId, defaultValue]) => ({
					controlId,
					defaultValue,
				})),
				{ controlId: 'origin', defaultValue: toControllerPadValue(origin) },
			],
		}
	},
	getBindings: (viewport): ControllerRuntimeBindings =>
		viewport.width > 0 && viewport.height > 0
			? { origin: { padAspectRatio: viewport.width / viewport.height } }
			: {},
} satisfies GraphicModelAdapter

export default model
