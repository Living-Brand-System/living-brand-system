import { describe, expect, it } from 'vitest'
import {
	DEFAULT_TOKEN_LIMITS,
	exceededTokenPeriod,
	parseTokenInput,
	resolveTokenLimits,
	tokenUsageRatio,
} from './token-limit'

describe('resolveTokenLimits', () => {
	const defaults = { daily: 100, monthly: 1000 }

	it('계정이 비운 기간은 기본값을 따른다', () => {
		expect(resolveTokenLimits(undefined, defaults)).toEqual({ daily: 100, monthly: 1000 })
		expect(resolveTokenLimits({ daily: null, monthly: 500 }, defaults)).toEqual({
			daily: 100,
			monthly: 500,
		})
	})

	it('「한도 없음」이면 입력값과 무관하게 두 기간 모두 무제한이다', () => {
		expect(resolveTokenLimits({ unlimited: true, daily: 5 }, defaults)).toEqual({
			daily: null,
			monthly: null,
		})
	})

	it('전역 기본값을 저장하지 않았어도 LBS 기본값(10만·100만)이 걸린다', () => {
		expect(resolveTokenLimits({}, {})).toEqual({ daily: 100_000, monthly: 1_000_000 })
		expect(resolveTokenLimits({}, null)).toEqual(DEFAULT_TOKEN_LIMITS)
	})
})

describe('exceededTokenPeriod', () => {
	const limits = { daily: 100, monthly: 1000 }

	it('일·월 한도를 따로 센다', () => {
		expect(exceededTokenPeriod({ daily: 99, monthly: 500 }, limits)).toBeNull()
		expect(exceededTokenPeriod({ daily: 100, monthly: 500 }, limits)).toBe('daily')
		expect(exceededTokenPeriod({ daily: 0, monthly: 1000 }, limits)).toBe('monthly')
	})

	it('둘 다 닿으면 월을 알린다', () => {
		expect(exceededTokenPeriod({ daily: 200, monthly: 2000 }, limits)).toBe('monthly')
	})

	it('무제한은 아무리 써도 막지 않는다', () => {
		expect(
			exceededTokenPeriod({ daily: 1e12, monthly: 1e12 }, { daily: null, monthly: null }),
		).toBeNull()
	})
})

describe('tokenUsageRatio', () => {
	it('한도 대비 비율이고 1에서 멈춘다', () => {
		expect(tokenUsageRatio(25, 100)).toBe(0.25)
		expect(tokenUsageRatio(300, 100)).toBe(1)
		expect(tokenUsageRatio(5, null)).toBeNull()
	})
})

describe('parseTokenInput', () => {
	it('빈칸은 기본값(null), 1 이상의 정수는 그 수다 — 콤마·공백은 허용한다', () => {
		expect(parseTokenInput('')).toBeNull()
		expect(parseTokenInput('  ')).toBeNull()
		expect(parseTokenInput('100,000')).toBe(100_000)
		expect(parseTokenInput(' 50 ')).toBe(50)
	})

	it('그 밖은 반영하지 않는다(undefined)', () => {
		for (const text of ['0', '05', '-3', '1.5', '12a', 'abc']) {
			expect(parseTokenInput(text)).toBeUndefined()
		}
	})
})
