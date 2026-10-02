/**
 * 정사각 썸네일 틀의 기하 — 틀은 한 변 1로 고정하고, 그 안에서 캡처한 그림을 옮기고 키운다.
 *
 * - `crop` (Graphic·Image): 패턴처럼 쓰는 에셋이라 그림이 틀을 **꽉 채운다**. 줄이면 cover까지.
 * - `inset` (Template): 내보낼 결과물이라 판 **전체가 틀 안에** 든다. 키우면 contain까지.
 *
 * 🔑 두 모드의 위치 제한은 같은 식 하나다 — 그림이 틀보다 크면 틀을 덮어야 하고, 작으면 틀 안에 있어야 한다.
 * 모드가 가르는 것은 배율 범위뿐이다.
 */
export type SquareFrameMode = 'crop' | 'inset'

/** `scale`은 그림 1px당 틀 길이, `x`·`y`는 틀 기준 그림 좌상단 위치(틀 한 변 = 1). */
export type SquareFrame = { scale: number; x: number; y: number }

type Size = { width: number; height: number }

// ponytail: 캡처가 긴 변 ~2048px라 2배까지는 결과(1024px)가 업스케일되지 않는다. 더 당기려면 캡처 해상도를 올린다.
const MAX_CROP_ZOOM = 2
const MIN_INSET_RATIO = 0.5
/** 처음 열 때 판이 틀에서 차지하는 비율 — Figma SelectCard의 Poster 카드 실측(≈0.89). */
const DEFAULT_INSET_RATIO = 0.9

export function scaleRange(mode: SquareFrameMode, size: Size): [number, number] {
	if (mode === 'crop') {
		const cover = 1 / Math.min(size.width, size.height)
		return [cover, cover * MAX_CROP_ZOOM]
	}
	const contain = 1 / Math.max(size.width, size.height)
	return [contain * MIN_INSET_RATIO, contain]
}

function clampAxis(position: number, span: number) {
	const room = 1 - span
	return Math.min(Math.max(position, Math.min(0, room)), Math.max(0, room))
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

export function initialFrame(mode: SquareFrameMode, size: Size): SquareFrame {
	const [min, max] = scaleRange(mode, size)
	const scale = mode === 'crop' ? min : max * DEFAULT_INSET_RATIO
	return clampFrame(mode, size, {
		scale,
		x: (1 - size.width * scale) / 2,
		y: (1 - size.height * scale) / 2,
	})
}
