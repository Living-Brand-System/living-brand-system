/**
 * 정사각 썸네일 틀의 기하 — 틀은 한 변 1로 고정하고, 그 안에서 캡처한 그림을 옮기고 키운다.
 *
 * - `crop` (Graphic·Image): 패턴처럼 쓰는 에셋이라 틀을 **꽉 채운 채** 시작한다.
 * - `inset` (Template): 내보낼 결과물이라 정본 여백 안에 판 전체를 놓고 시작한다.
 * 두 모드가 가르는 것은 시작 자리와 최대 확대뿐이다 — 줄여서 바탕이 드러나도 되고, 키워서 잘려도 된다.
 * 그림 가운데는 틀 안에 남는다.
 *
 * 🔑 사람이 고른 값(raw)과 보이는 값(snap)을 가른다 — 스냅은 `snapFrame`이 raw에서 매번 새로 계산한다.
 * raw를 스냅 결과로 덮으면 자석에 붙은 채 빠져나오지 못한다.
 */
export type SquareFrameMode = 'crop' | 'inset'

/** `scale`은 그림 1px당 틀 길이, `x`·`y`는 틀 기준 그림 좌상단 위치(틀 한 변 = 1). */
export type SquareFrame = { scale: number; x: number; y: number }

type Size = { width: number; height: number }

/**
 * 썸네일 정본의 여백 — Figma `hd_lbs_interface` Select Card Template(node 448:9790)에서 잰 값.
 * 320 판에 포스터 상자 198×280.066이 정가운데라 상하 여백이 (320 − 280.066) / 2 = 19.967px(6.2397%)다.
 * 20px로 반올림하지 않는다 — 정본과 똑같이 만들 수 있어야 한다.
 */
export const THUMBNAIL_MARGIN = (320 - 280.0657958984375) / 2 / 320

/** 이 거리(틀 한 변 = 1) 안에 들어오면 붙는다 — 352px 틀에서 약 7px. */
export const SNAP_DISTANCE = 0.02

/** 그림의 변이 붙는 선 — 틀의 각 변과, 각 변에서 정본 여백만큼 들어온 선. */
const EDGE_TARGETS = [0, THUMBNAIL_MARGIN, 1 - THUMBNAIL_MARGIN, 1]
/** 그림의 가로·세로 길이가 붙는 값 — 틀 한 변, 양쪽 여백을 뺀 길이(정본 포스터의 높이). */
const SPAN_TARGETS = [1, 1 - 2 * THUMBNAIL_MARGIN]

// ponytail: 캡처가 긴 변 ~2048px라 cover의 2배까지는 결과(1024px)가 업스케일되지 않는다. 더 당기려면 캡처 해상도를 올린다.
const MAX_CROP_ZOOM = 2
const MIN_RATIO = 0.5
const MAX_INSET_RATIO = 2

/** 최소는 두 모드가 같다(판 전체가 드는 크기의 절반). 최대만 모드가 가른다. */
export function scaleRange(mode: SquareFrameMode, size: Size): [number, number] {
	const contain = 1 / Math.max(size.width, size.height)
	const max =
		mode === 'crop'
			? MAX_CROP_ZOOM / Math.min(size.width, size.height)
			: contain * MAX_INSET_RATIO
	return [contain * MIN_RATIO, max]
}

/** 그림 가운데는 틀 안에 둔다 — 그림을 통째로 잃어버리지 않게. 빈 곳 없는 자리는 변 스냅이 잡는다. */
function clampAxis(position: number, span: number) {
	return Math.min(Math.max(position, -span / 2), 1 - span / 2)
}

export function clampFrame(mode: SquareFrameMode, size: Size, frame: SquareFrame): SquareFrame {
	const [min, max] = scaleRange(mode, size)
	const scale = Math.min(Math.max(frame.scale, min), max)
	return {
		scale,
		x: clampAxis(frame.x, size.width * scale),
		y: clampAxis(frame.y, size.height * scale),
	}
}

/** 배율을 바꾸되 틀 가운데에 있던 점을 그대로 가운데에 둔다. */
export function zoomFrame(
	mode: SquareFrameMode,
	size: Size,
	frame: SquareFrame,
	scale: number,
): SquareFrame {
	const ratio = scale / frame.scale
	return clampFrame(mode, size, {
		scale,
		x: 0.5 - (0.5 - frame.x) * ratio,
		y: 0.5 - (0.5 - frame.y) * ratio,
	})
}

/** crop은 cover로 가운데에서, inset은 정본처럼 긴 변이 양쪽 여백을 뺀 길이가 되게 가운데에서 시작한다. */
export function initialFrame(mode: SquareFrameMode, size: Size): SquareFrame {
	const scale =
		mode === 'crop'
			? 1 / Math.min(size.width, size.height)
			: SPAN_TARGETS[1] / Math.max(size.width, size.height)
	return clampFrame(mode, size, {
		scale,
		x: (1 - size.width * scale) / 2,
		y: (1 - size.height * scale) / 2,
	})
}

/** 붙은 안쪽 선(틀 변 제외) — 화면에 안내선으로 그린다. */
export type SnapGuides = { x: number[]; y: number[] }

function nearestDelta(candidates: readonly [from: number, to: number][]) {
	let best: number | null = null
	for (const [from, to] of candidates) {
		const delta = to - from
		if (Math.abs(delta) <= SNAP_DISTANCE && (best === null || Math.abs(delta) < Math.abs(best)))
			best = delta
	}
	return best ?? 0
}

function snapAxis(position: number, span: number) {
	const start = position
	const end = position + span
	const center = position + span / 2
	return (
		position +
		nearestDelta([
			...EDGE_TARGETS.map((target): [number, number] => [start, target]),
			...EDGE_TARGETS.map((target): [number, number] => [end, target]),
			[center, 0.5],
		])
	)
}

const isOn = (value: number, target: number) => Math.abs(value - target) < 1e-9

function guidesOf(position: number, span: number) {
	const marks = [position, position + span / 2, position + span]
	return [THUMBNAIL_MARGIN, 0.5, 1 - THUMBNAIL_MARGIN].filter((line) =>
		marks.some((mark) => isOn(mark, line)),
	)
}

/**
 * 사람이 고른 틀(raw)을 자석에 붙인 결과 — 먼저 길이를, 다음에 위치를 붙인다.
 * 1. 가로나 세로 길이가 `SPAN_TARGETS`에 가까우면 그 길이로(그림 가운데 고정).
 * 2. 각 축에서 그림의 시작·끝 변이 `EDGE_TARGETS`에, 가운데가 틀 가운데에 가까우면 거기로.
 * 둘이 겹치면 정본이 된다 — 세로가 여백을 뺀 길이 + 가로·세로 가운데 = node 448:9790의 포스터 자리.
 */
export function snapFrame(
	mode: SquareFrameMode,
	size: Size,
	raw: SquareFrame,
): { frame: SquareFrame; guides: SnapGuides } {
	const [min, max] = scaleRange(mode, size)
	let scale = raw.scale
	let best = SNAP_DISTANCE
	for (const length of [size.width, size.height]) {
		for (const target of SPAN_TARGETS) {
			const next = target / length
			const gap = Math.abs(length * raw.scale - target)
			if (gap <= best && next >= min && next <= max) {
				best = gap
				scale = next
			}
		}
	}
	const width = size.width * scale
	const height = size.height * scale
	// 길이가 그대로면 raw 위치를 그대로 쓴다 — 가운데에서 되짚으면 부동소수 오차가 생긴다.
	const resized = scale !== raw.scale
	const x = resized ? raw.x + (size.width * raw.scale - width) / 2 : raw.x
	const y = resized ? raw.y + (size.height * raw.scale - height) / 2 : raw.y
	const frame = clampFrame(mode, size, {
		scale,
		x: snapAxis(x, width),
		y: snapAxis(y, height),
	})
	return {
		frame,
		guides: {
			x: guidesOf(frame.x, size.width * frame.scale),
			y: guidesOf(frame.y, size.height * frame.scale),
		},
	}
}
