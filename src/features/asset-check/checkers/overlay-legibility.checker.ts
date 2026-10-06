/**
 * 오버레이 가독성 측정 — 배경 위에 얹힌 CI·글자가 배경과 얼마나 분리되는지만 잰다.
 * 판정(임계값 비교)은 evaluator가 소유한다.
 *
 * 배경 이미지는 통제 대상이 아니므로 배경의 색·종류는 보지 않는다. 오버레이 경계에서
 * 「가장 나쁜 지점」의 대비만 본다 — 심볼은 잘 보이는데 글자가 묻히는 경우를 평균이 가려버리기 때문이다.
 *
 * 오버레이를 찾는 근거는 색이 아니라 **평탄성**이다. 벡터로 그린 오버레이는 색이 정확히 균일하고
 * 사진의 밝은 영역은 픽셀마다 흔들리므로, 「지정 색에 가깝고 + 한 축으로 평탄」이 오버레이다.
 * 색만 보면 흰 글자와 흰 하늘이 구별되지 않는다.
 */

import { contrastRatio } from './color-metrics'
import type { Rgb } from './palette-match'
import type { CheckFactValue, MeasurementResult, MeasurementValue, PixelGrid } from './types'

const DEFAULT_OVERLAY_COLORS = ['#FFFFFF', '#000000']
const DEFAULT_COLOR_TOLERANCE = 26
const DEFAULT_FLAT_TOLERANCE = 6
const ALPHA_MIN = 8
/** 안티앨리어싱 띠를 건너뛰고 배경을 샘플링하는 체비셰프 거리 범위. */
const RING_MIN = 2
const RING_MAX = 3
/** 경계 픽셀이 이보다 적으면 오버레이를 못 찾은 것으로 본다. */
const MIN_BOUNDARY_PIXELS = 24
/**
 * 연결 덩어리가 판의 이 비율을 넘으면 오버레이가 아니라 판 배경으로 본다.
 * 🔴 이 필터가 없으면 흰 판(Poster) 전체가 흰 오버레이로 잡힌다.
 */
const MAX_COMPONENT_AREA_RATIO = 0.15
/** 이보다 작은 덩어리는 노이즈로 버린다. */
const MIN_COMPONENT_PIXELS = 8
/**
 * 덩어리를 오버레이로 인정하는 「뚜렷함」 하한. 경계 대비의 **최대값**이 이 값에 못 미치면
 * 어디서도 도드라지지 않는 평면이므로 사진의 일부로 본다(물거품·선체 하이라이트가 여기서 걸린다).
 * 🔴 룰의 합·부 기준과 다른 값이다 — 이건 「오버레이인가」를 가리는 검출 파라미터다.
 */
const COMPONENT_STEP_MIN = 3
/**
 * 덩어리 전체의 색 진폭 상한. 벡터로 칠한 오버레이는 덩어리 안에서 색이 **정확히** 같아 0에 가깝고,
 * 사진의 밝은·어두운 능선은 값이 드리프트한다. 실측(2026-08-20): 타이틀 글자 진폭 0, 사진 8~25.
 * 사람이 판정한 이미지 5장에서 상한을 훑어 통과·불통과가 가장 넓게 갈리는 값이 6이었다
 * (6에서 간격 0.30 / 8에서 0.18 / 25에서는 순서가 뒤집힌다).
 * 🔴 이것이 「사진을 오버레이로 잡는」 오검출을 막는 주 장치다. 뚜렷함(STEP_MIN)만으로는 안 걸린다 —
 *    사진 능선도 어두운 곳과 만나면 대비가 20까지 나온다.
 */
const MAX_COMPONENT_AMPLITUDE = 6

export interface OverlayLegibilityParameters {
	overlayColors?: string[]
	colorTolerance?: number
	flatTolerance?: number
	maxComponentAmplitude?: number
}

/** 덩어리 안 색의 최대-최소 폭. 채널을 구분하지 않고 하나의 진폭으로 본다. */
function componentAmplitude(grid: PixelGrid, component: number[]): number {
	let lo = 255
	let hi = 0
	for (const i of component) {
		const { r, g, b } = grid.pixels[i]
		lo = Math.min(lo, r, g, b)
		hi = Math.max(hi, r, g, b)
	}
	return hi - lo
}

/**
 * 한 축의 평탄성. 판 밖 이웃은 「어긋나지 않음」으로 보고, 존재하는 이웃이 하나도 없으면 false.
 * 🔴 판 밖을 어긋남으로 치면 테두리에 걸친 글자 획이 마스크에서 빠져 배경으로 샘플링된다.
 */
function flatAlong(
	center: Rgb,
	before: Rgb | undefined,
	after: Rgb | undefined,
	tolerance: number,
): boolean {
	let compared = 0
	if (before) {
		if (dist(center, before) > tolerance) return false
		compared++
	}
	if (after) {
		if (dist(center, after) > tolerance) return false
		compared++
	}
	return compared > 0
}

/**
 * 4-이웃 연결 덩어리를 훑어 판 배경(너무 큼)과 노이즈(너무 작음)를 마스크에서 뺀다.
 * 오버레이는 판의 일부다 — 판을 덮는 평면은 오버레이가 아니라 그 오버레이가 얹히는 면이다.
 */
function* components(colorIndex: Int8Array, width: number, height: number) {
	const total = width * height
	const seen = new Uint8Array(total)
	const stack: number[] = []

	for (let start = 0; start < total; start++) {
		if (seen[start] || colorIndex[start] < 0) continue
		const color = colorIndex[start]
		const component: number[] = []
		seen[start] = 1
		stack.push(start)
		while (stack.length > 0) {
			const i = stack.pop() as number
			component.push(i)
			const x = i % width
			const y = (i - x) / width
			const push = (j: number) => {
				if (seen[j] || colorIndex[j] !== color) return
				seen[j] = 1
				stack.push(j)
			}
			if (x > 0) push(i - 1)
			if (x < width - 1) push(i + 1)
			if (y > 0) push(i - width)
			if (y < height - 1) push(i + width)
		}
		yield component
	}
}

function dropNonOverlayComponents(colorIndex: Int8Array, width: number, height: number): void {
	const maxArea = Math.floor(width * height * MAX_COMPONENT_AREA_RATIO)
	for (const component of components(colorIndex, width, height)) {
		if (component.length > maxArea || component.length < MIN_COMPONENT_PIXELS) {
			for (const i of component) colorIndex[i] = -1
		}
	}
}

function parseHex(hex: string): Rgb {
	return {
		r: Number.parseInt(hex.slice(1, 3), 16),
		g: Number.parseInt(hex.slice(3, 5), 16),
		b: Number.parseInt(hex.slice(5, 7), 16),
	}
}

function dist(a: Rgb, b: Rgb): number {
	const dr = a.r - b.r
	const dg = a.g - b.g
	const db = a.b - b.b
	return Math.sqrt(dr * dr + dg * dg + db * db)
}

function percentile(sorted: number[], q: number): number {
	if (sorted.length === 0) return Number.NaN
	const index = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))
	return sorted[index]
}

/**
 * 오버레이 마스크를 만든다. 진단 도구가 무엇을 오버레이로 봤는지 그리려고 export한다. `colorIndex[i] >= 0`이면 그 픽셀은 i번째 오버레이 색이다.
 * 평탄 조건은 「세로 이웃 둘이 같음 OR 가로 이웃 둘이 같음」 — 1px 획도 한 축은 평탄하다.
 */
export function buildOverlayMask(
	grid: PixelGrid,
	colors: Rgb[],
	colorTolerance: number,
	flatTolerance: number,
): Int8Array {
	const { width: w, height: h, pixels, alpha } = grid
	const colorIndex = new Int8Array(w * h).fill(-1)

	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = y * w + x
			if (alpha[i] < ALPHA_MIN) continue

			let matched = -1
			let best = colorTolerance
			for (let c = 0; c < colors.length; c++) {
				const d = dist(pixels[i], colors[c])
				if (d <= best) {
					best = d
					matched = c
				}
			}
			if (matched < 0) continue

			const flatY = flatAlong(
				pixels[i],
				y > 0 ? pixels[i - w] : undefined,
				y < h - 1 ? pixels[i + w] : undefined,
				flatTolerance,
			)
			const flatX = flatAlong(
				pixels[i],
				x > 0 ? pixels[i - 1] : undefined,
				x < w - 1 ? pixels[i + 1] : undefined,
				flatTolerance,
			)
			if (flatY || flatX) colorIndex[i] = matched
		}
	}
	dropNonOverlayComponents(colorIndex, w, h)
	return colorIndex
}

/**
 * 덩어리 하나의 경계 대비를 모은다. 오버레이 색 ↔ 링(거리 2~3)의 비오버레이 픽셀 중
 * 가장 대비가 낮은 것을 그 지점의 값으로 쓴다.
 */
function componentBoundaryContrasts(
	grid: PixelGrid,
	colorIndex: Int8Array,
	colors: Rgb[],
	colorTolerance: number,
	component: number[],
): number[] {
	const { width: w, height: h, pixels, alpha } = grid
	const contrasts: number[] = []

	for (const i of component) {
		const c = colorIndex[i]
		if (c < 0) continue
		const x = i % w
		const y = (i - x) / w

		const isBoundary =
			(x > 0 && colorIndex[i - 1] < 0) ||
			(x < w - 1 && colorIndex[i + 1] < 0) ||
			(y > 0 && colorIndex[i - w] < 0) ||
			(y < h - 1 && colorIndex[i + w] < 0)
		if (!isBoundary) continue

		// 🔴 링에서 최소값을 취하면 안티앨리어싱 헤일로 한 픽셀이 그 지점을 오염시킨다.
		//    실측: 타이틀 글자 전부가 minC 1.14~1.39로 뭉쳤고 그것이 글자가 아니라 AA였다.
		//    「이 지점의 배경」은 극단값이 아니라 중앙값으로 추정한다. 최악 구간은 지점을
		//    바꿔가며(백분위) 찾는다 — 한 이웃 안에서 찾지 않는다.
		const ring: number[] = []
		for (let dy = -RING_MAX; dy <= RING_MAX; dy++) {
			for (let dx = -RING_MAX; dx <= RING_MAX; dx++) {
				const cheb = Math.max(Math.abs(dx), Math.abs(dy))
				if (cheb < RING_MIN || cheb > RING_MAX) continue
				const nx = x + dx
				const ny = y + dy
				if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
				const j = ny * w + nx
				if (colorIndex[j] >= 0 || alpha[j] < ALPHA_MIN) continue
				// 오버레이와 같은 색은 배경 표본이 아니다 — 마스크에 못 들어간 글자 코너가 섞인다.
				if (dist(pixels[j], colors[c]) <= colorTolerance) continue
				ring.push(contrastRatio(colors[c], pixels[j]))
			}
		}
		if (ring.length > 0) {
			ring.sort((a, b) => a - b)
			contrasts.push(percentile(ring, 0.5))
		}
	}
	return contrasts
}

/**
 * 덩어리마다 「어딘가에서 뚜렷한가」를 물어 오버레이만 남기고, 남은 것들의 경계 대비를 모은다.
 * 탈락한 덩어리는 마스크에서도 지운다 — 진단 도구가 그리는 그림이 판정과 어긋나지 않게.
 */
function collectOverlayContrasts(
	grid: PixelGrid,
	colorIndex: Int8Array,
	colors: Rgb[],
	colorTolerance: number,
	maxAmplitude: number = MAX_COMPONENT_AMPLITUDE,
): { contrasts: number[]; accepted: number; rejected: number } {
	const contrasts: number[] = []
	let accepted = 0
	let rejected = 0

	for (const component of components(colorIndex, grid.width, grid.height)) {
		if (componentAmplitude(grid, component) > maxAmplitude) {
			rejected++
			for (const i of component) colorIndex[i] = -1
			continue
		}
		const own = componentBoundaryContrasts(grid, colorIndex, colors, colorTolerance, component)
		const brightest = own.length > 0 ? Math.max(...own) : 0
		if (brightest < COMPONENT_STEP_MIN) {
			rejected++
			for (const i of component) colorIndex[i] = -1
			continue
		}
		accepted++
		contrasts.push(...own)
	}
	return { contrasts, accepted, rejected }
}

/**
 * 오버레이(CI·글자) 경계의 국소 대비 분포를 측정한다.
 * ponytail: 오버레이를 「지정 색 + 평탄 + 판의 15% 미만인 연결 덩어리」로 근사한다. 사진 안에
 * 판의 15%보다 작고 완전히 균일한 단색 면이 있으면 그것도 오버레이로 잡힌다 — 정확히 잡으려면
 * 템플릿 소스(HTML의 요소 좌표·색)를 보는 checker로 올려야 한다.
 * ponytail: 배경이 오버레이와 같은 색인 구간은 못 잡는다 — 그 구간은 경계가 없어 표본이 생기지 않는다.
 * 그런 면이 판의 15%를 넘으면 덩어리 필터가 걷어내 not_measurable(=담당자 검토)로 떨어진다.
 */
/**
 * 진단용 — 덩어리별로 무엇이 채택·탈락했는지와 그 경계 대비 분포를 낸다.
 * 🔴 판정과 **같은 함수**를 쓴다. 진단이 판정을 베끼면 둘이 어긋나 사람을 속인다(실제로 겪었다).
 */
export function describeOverlayComponents(
	grid: PixelGrid,
	parameters?: OverlayLegibilityParameters,
) {
	const hexes = parameters?.overlayColors ?? DEFAULT_OVERLAY_COLORS
	const colors = hexes.map(parseHex)
	const colorTolerance = parameters?.colorTolerance ?? DEFAULT_COLOR_TOLERANCE
	const flatTolerance = parameters?.flatTolerance ?? DEFAULT_FLAT_TOLERANCE
	const colorIndex = buildOverlayMask(grid, colors, colorTolerance, flatTolerance)

	return [...components(colorIndex, grid.width, grid.height)].map((component) => {
		const own = componentBoundaryContrasts(
			grid,
			colorIndex,
			colors,
			colorTolerance,
			component,
		).sort((a, b) => a - b)
		let lo = 255
		let hi = 0
		let x0 = grid.width
		let y0 = grid.height
		let x1 = -1
		let y1 = -1
		for (const i of component) {
			const { r, g, b } = grid.pixels[i]
			lo = Math.min(lo, r, g, b)
			hi = Math.max(hi, r, g, b)
			const x = i % grid.width
			const y = (i - x) / grid.width
			if (x < x0) x0 = x
			if (x > x1) x1 = x
			if (y < y0) y0 = y
			if (y > y1) y1 = y
		}
		const brightest = own.length > 0 ? own[own.length - 1] : 0
		return {
			size: component.length,
			color: hexes[colorIndex[component[0]]] ?? '?',
			bbox: `${x0},${y0}-${x1},${y1}`,
			amplitude: hi - lo,
			boundary: own.length,
			max: brightest,
			p50: own.length > 0 ? percentile(own, 0.5) : 0,
			p05: own.length > 0 ? percentile(own, 0.05) : 0,
			min: own.length > 0 ? own[0] : 0,
			accepted: brightest >= COMPONENT_STEP_MIN,
		}
	})
}

export { collectOverlayContrasts }

export function measureOverlayLegibility(
	grid: PixelGrid,
	parameters?: OverlayLegibilityParameters,
): MeasurementResult {
	const hexes = parameters?.overlayColors ?? DEFAULT_OVERLAY_COLORS
	const colors = hexes.map(parseHex)
	const colorTolerance = parameters?.colorTolerance ?? DEFAULT_COLOR_TOLERANCE
	const flatTolerance = parameters?.flatTolerance ?? DEFAULT_FLAT_TOLERANCE

	const colorIndex = buildOverlayMask(grid, colors, colorTolerance, flatTolerance)
	let overlayPixels = 0
	for (let i = 0; i < colorIndex.length; i++) if (colorIndex[i] >= 0) overlayPixels++

	const facts: Record<string, CheckFactValue> = {
		gridSize: `${grid.width}x${grid.height}`,
		overlayColors: hexes,
		overlayPixels,
	}

	const { contrasts, accepted, rejected } = collectOverlayContrasts(
		grid,
		colorIndex,
		colors,
		colorTolerance,
		parameters?.maxComponentAmplitude ?? MAX_COMPONENT_AMPLITUDE,
	)
	const shape = { ...facts, overlays: accepted, discardedAreas: rejected }
	if (contrasts.length < MIN_BOUNDARY_PIXELS) {
		return {
			state: 'not_measurable',
			reasonCode: 'overlay_not_detected',
			facts: { ...shape, boundaryPixels: contrasts.length },
		}
	}

	contrasts.sort((a, b) => a - b)
	const round = (value: number) => Math.round(value * 100) / 100
	const measurements: Record<string, MeasurementValue> = {
		minContrastRatio: round(contrasts[0]),
		p05ContrastRatio: round(percentile(contrasts, 0.05)),
		p50ContrastRatio: round(percentile(contrasts, 0.5)),
	}

	return {
		state: 'measured',
		measurements,
		facts: { ...shape, boundaryPixels: contrasts.length },
	}
}
