import { describe, expect, it } from 'vitest'
import { snapControllerValue } from './pointer-drag'

describe('snapControllerValue', () => {
	it('소수 step에서 부동소수점 찌꺼기를 남기지 않는다', () => {
		// 🔴 이 테스트의 이유: `3 + 17 * 0.1`은 4.700000000000001이고, 그 값이 화면과 CSS까지 흘러갔다.
		expect(snapControllerValue(4.7, 3, 6, 0.1)).toBe(4.7)
		expect(snapControllerValue(4.5 + 0.1, 3, 6, 0.1)).toBe(4.6)
		expect(snapControllerValue(5.55, 3, 6, 0.05)).toBe(5.55)
	})

	it('격자에서 벗어난 값을 가장 가까운 눈금으로 당긴다', () => {
		expect(snapControllerValue(4.53, 3, 6, 0.1)).toBe(4.5)
		expect(snapControllerValue(77, 0, 100, 5)).toBe(75)
	})

	it('범위를 벗어나면 범위 안으로 자른다', () => {
		expect(snapControllerValue(99, 3, 6, 0.1)).toBe(6)
		expect(snapControllerValue(-1, 3, 6, 0.1)).toBe(3)
	})

	it('step이 0 이하면 격자 없이 자르기만 한다 — 0으로 나누지 않는다', () => {
		expect(snapControllerValue(4.2, 3, 6, 0)).toBe(4.2)
		expect(snapControllerValue(9, 3, 6, -1)).toBe(6)
	})
})
