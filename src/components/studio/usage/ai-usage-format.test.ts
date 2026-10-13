import { describe, expect, it } from 'vitest'
import { niceTokenScale } from './ai-usage-format'

describe('niceTokenScale', () => {
	it('최댓값을 덮는 깔끔한 눈금을 낸다', () => {
		expect(niceTokenScale(151_577)).toEqual({
			max: 200_000,
			ticks: [0, 50_000, 100_000, 150_000, 200_000],
		})
		expect(niceTokenScale(7)).toEqual({ max: 8, ticks: [0, 2, 4, 6, 8] })
	})

	it('사용량이 없어도 0 눈금은 있다', () => {
		expect(niceTokenScale(0)).toEqual({ max: 0, ticks: [0] })
	})
})
