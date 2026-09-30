import { describe, expect, it } from 'vitest'
import { pickActiveRegion } from './active-region'

/** 문서 순서가 tie-break에 쓰이므로 실제 DOM에 붙여야 compareDocumentPosition이 답한다. */
function regions(count: number): HTMLElement[] {
	const host = document.createElement('div')
	document.body.append(host)
	return Array.from({ length: count }, () => {
		const element = document.createElement('div')
		host.append(element)
		return element
	})
}

describe('pickActiveRegion', () => {
	it('선택한 카드가 보이는 동안 유지하고 화면에서 사라지면 자동 선택한다', () => {
		const [a, b] = regions(2)
		expect(
			pickActiveRegion(
				[
					{ element: a, visibleArea: 900 },
					{ element: b, visibleArea: 100 },
				],
				b,
			),
		).toBe(b)
		expect(
			pickActiveRegion(
				[
					{ element: a, visibleArea: 900 },
					{ element: b, visibleArea: 0 },
				],
				b,
			),
		).toBe(a)
	})
	it('보이는 영역이 없으면 아무도 고르지 않는다', () => {
		const [a, b] = regions(2)
		expect(pickActiveRegion([])).toBeNull()
		expect(
			pickActiveRegion([
				{ element: a, visibleArea: 0 },
				{ element: b, visibleArea: 0 },
			]),
		).toBeNull()
	})

	it('화면을 더 많이 차지한 쪽을 고른다 — 비율이 아니라 면적이다', () => {
		const [big, small] = regions(2)
		// 큰 판형은 일부만 보여도(비율은 낮아도) 화면을 더 채운다.
		expect(
			pickActiveRegion([
				{ element: big, visibleArea: 900 },
				{ element: small, visibleArea: 100 },
			]),
		).toBe(big)
	})

	it('면적이 같으면 문서 순서가 앞선 쪽 — 입력 순서가 달라도 답이 같다', () => {
		const [first, second] = regions(2)
		const candidates = [
			{ element: first, visibleArea: 500 },
			{ element: second, visibleArea: 500 },
		]
		expect(pickActiveRegion(candidates)).toBe(first)
		expect(pickActiveRegion([...candidates].reverse())).toBe(first)
	})

	it('0인 영역은 면적이 가장 커도 후보가 아니다', () => {
		const [hidden, visible] = regions(2)
		expect(
			pickActiveRegion([
				{ element: hidden, visibleArea: 0 },
				{ element: visible, visibleArea: 1 },
			]),
		).toBe(visible)
	})
})
