'use client'

import { type PointerEvent, useRef, useState } from 'react'

export const clampControllerValue = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value))

/**
 * 값을 step 격자에 얹고 부동소수점 찌꺼기를 턴다.
 *
 * 🔴 `min + n * step`은 step이 정수가 아니면 그대로 쓸 수 없다 — `3 + 17 * 0.1`은 `4.7`이 아니라
 *    `4.700000000000001`이고, 그 값이 화면(`4.699999999999999%`)과 CSS(`4.7000000000001cqmax`)까지
 *    흘러간다. 스튜디오의 range는 step이 전부 정수라 안 드러났고, 가이드라인 마진(step 0.1)이
 *    처음 밟았다. 유효자릿수로 자르면 step의 소수 자릿수를 따로 셀 필요가 없다.
 */
export function snapControllerValue(raw: number, min: number, max: number, step: number) {
	if (step <= 0) return clampControllerValue(raw, min, max)
	const steps = Math.round((clampControllerValue(raw, min, max) - min) / step)
	return clampControllerValue(Number((min + steps * step).toPrecision(12)), min, max)
}

/** 클릭과 드래그를 가르는 이동 거리 — 이 안에서 손을 떼면 클릭이다(dialkit Slider와 같은 3px). */
const CLICK_THRESHOLD_PX = 3

type ControllerPointerDragOptions = {
	disabled?: boolean
	/** 드래그 중 매 이동마다 — 값이 손을 즉시 따라간다. */
	onDrag: (ratioX: number, ratioY: number) => void
	/**
	 * 임계 안에서 떼면 여기로 온다. 주지 않으면 누른 즉시 `onDrag`가 불린다(위치를 직접 찍는 Pad).
	 * 주면 누를 때는 값이 움직이지 않고 뗀 지점 하나만 반영된다(목표를 겨냥하는 Range) —
	 * 클릭이 미세한 손떨림으로 드래그가 되어 엉뚱한 값이 올라가는 것을 막는다.
	 */
	onClick?: (ratioX: number, ratioY: number) => void
}

/** Pad·Range가 공유하는 좌클릭 포인터 드래그 배선 — 클릭과 드래그를 나누고 드래그 여부를 알려준다. */
export function useControllerPointerDrag({
	disabled,
	onDrag,
	onClick,
}: ControllerPointerDragOptions) {
	const [dragging, setDragging] = useState(false)
	const boundsRef = useRef<DOMRect | null>(null)
	const originRef = useRef<{ x: number; y: number } | null>(null)
	// 임계 통과 여부는 ref다 — 같은 pointermove 안에서 곧바로 읽으므로 state의 다음 렌더를 기다릴 수 없다.
	const passedRef = useRef(false)

	const ratios = (event: PointerEvent<HTMLElement>) => {
		const bounds = boundsRef.current
		// 접힘·전환 중 0 크기 실측은 NaN으로 상태를 오염시키므로 버린다.
		if (!bounds?.width || !bounds?.height) return null
		return [
			clampControllerValue((event.clientX - bounds.left) / bounds.width, 0, 1),
			clampControllerValue((event.clientY - bounds.top) / bounds.height, 0, 1),
		] as const
	}

	const reset = () => {
		originRef.current = null
		passedRef.current = false
		setDragging(false)
	}

	return {
		/** 드래그가 진행 중인지 — 핸들 강조처럼 값이 아니라 조작 자체를 보여줄 때 쓴다. */
		dragging,
		handlers: {
			onPointerDown: (event: PointerEvent<HTMLElement>) => {
				if (disabled || event.button !== 0) return
				boundsRef.current = event.currentTarget.getBoundingClientRect()
				originRef.current = { x: event.clientX, y: event.clientY }
				// 클릭을 따로 받는 쪽은 임계를 넘겨야 드래그가 시작된다.
				passedRef.current = !onClick
				try {
					event.currentTarget.setPointerCapture(event.pointerId)
				} catch {
					// 이미 비활성인 포인터 — 캡처 없이 이 제스처만 처리한다.
				}
				if (onClick) return
				setDragging(true)
				const point = ratios(event)
				if (point) onDrag(...point)
			},
			onPointerMove: (event: PointerEvent<HTMLElement>) => {
				const origin = originRef.current
				if (!origin) return
				if (!passedRef.current) {
					const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y)
					if (moved < CLICK_THRESHOLD_PX) return
					passedRef.current = true
					setDragging(true)
				}
				const point = ratios(event)
				if (point) onDrag(...point)
			},
			onPointerUp: (event: PointerEvent<HTMLElement>) => {
				if (!originRef.current) return
				if (!passedRef.current) {
					const point = ratios(event)
					if (point) onClick?.(...point)
				}
				reset()
			},
			// 취소·캡처 상실은 클릭이 아니다 — 값을 올리지 않고 접는다.
			onPointerCancel: reset,
			onLostPointerCapture: reset,
		},
	}
}
