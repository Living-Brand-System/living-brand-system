import { describe, expect, it } from 'vitest'
import { easeMorph } from './view'

// 🔴 `easeMorph`는 CSS `cubic-bezier(...)`가 하는 계산을 JS에서 다시 하는 것이다. 두 곡선이 어긋나면
//    심볼 형태(JS 계산)와 색·판·위치(CSS)가 따로 움직여 어색해진다 — 실제로 겪은 결함이라 여기서 지킨다.

describe('전환 곡선', () => {
	it('양 끝이 고정이다', () => {
		expect(easeMorph(0)).toBeCloseTo(0, 6)
		expect(easeMorph(1)).toBeCloseTo(1, 6)
	})

	it('단조 증가한다 — 되돌아가는 구간이 없다', () => {
		let previous = -1
		for (let i = 0; i <= 100; i++) {
			const y = easeMorph(i / 100)
			expect(y, `x=${i / 100}에서 곡선이 되돌아갔다`).toBeGreaterThanOrEqual(previous)
			previous = y
		}
	})

	it('오버슛이 없다 — 색이 색역을 벗어나거나 형태가 규정 값을 넘지 않는다', () => {
		for (let i = 0; i <= 100; i++) {
			const y = easeMorph(i / 100)
			expect(y).toBeGreaterThanOrEqual(0)
			expect(y).toBeLessThanOrEqual(1)
		}
	})

	// easeOutQuint 계열의 성질 — 앞이 빠르고 뒤가 길다. 곡선을 밋밋하게 바꾸면 여기서 걸린다.
	it('앞이 빠르다 — 절반 시점에 이미 대부분 이동해 있다', () => {
		expect(easeMorph(0.5)).toBeGreaterThan(0.8)
		expect(easeMorph(0.25)).toBeGreaterThan(0.5)
	})
})
