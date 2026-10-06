import { describe, expect, it } from 'vitest'
import { exceededTokenPeriod, resolveTokenLimit, resolveTokenLimits } from './token-limit'

describe('resolveTokenLimit', () => {
	it('계정이 정하지 않았거나 「기본값 따름」이면 기본값을 쓴다', () => {
		const fallback = { mode: 'limit', tokens: 1000 } as const
		expect(resolveTokenLimit(undefined, fallback)).toBe(1000)
		expect(resolveTokenLimit({ mode: 'default', tokens: 5 }, fallback)).toBe(1000)
	})

	it('계정의 「제한 없음」과 「한도 지정」이 기본값을 이긴다', () => {
		const fallback = { mode: 'limit', tokens: 1000 } as const
		expect(resolveTokenLimit({ mode: 'unlimited' }, fallback)).toBeNull()
		expect(resolveTokenLimit({ mode: 'limit', tokens: 50 }, fallback)).toBe(50)
	})

	it('기본값이 「제한 없음」이면 따르는 계정도 제한 없음이다', () => {
		expect(resolveTokenLimit({ mode: 'default' }, { mode: 'unlimited' })).toBeNull()
		expect(resolveTokenLimit(undefined, undefined)).toBeNull()
	})

	it('「한도 지정」인데 숫자가 없으면 막지 않는다', () => {
		expect(resolveTokenLimit({ mode: 'limit', tokens: null }, { mode: 'unlimited' })).toBeNull()
	})
})

describe('exceededTokenPeriod', () => {
	const limits = resolveTokenLimits(
		{ daily: { mode: 'limit', tokens: 100 } },
		{ monthly: { mode: 'limit', tokens: 1000 } },
	)

	it('일·월 한도를 따로 센다', () => {
		expect(limits).toEqual({ daily: 100, monthly: 1000 })
		expect(exceededTokenPeriod({ daily: 99, monthly: 500 }, limits)).toBeNull()
		expect(exceededTokenPeriod({ daily: 100, monthly: 500 }, limits)).toBe('daily')
		expect(exceededTokenPeriod({ daily: 0, monthly: 1000 }, limits)).toBe('monthly')
	})

	it('둘 다 닿으면 월을 알린다', () => {
		expect(exceededTokenPeriod({ daily: 200, monthly: 2000 }, limits)).toBe('monthly')
	})

	it('제한 없음은 아무리 써도 막지 않는다', () => {
		expect(
			exceededTokenPeriod({ daily: 1e12, monthly: 1e12 }, { daily: null, monthly: null }),
		).toBeNull()
	})
})
