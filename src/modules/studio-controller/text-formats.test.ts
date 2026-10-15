import { describe, expect, it } from 'vitest'
import { TEXT_FORMATS } from './text-formats'

describe('텍스트 형식 입출력 계약', () => {
	it('날짜는 ISO 원값을 받고 캔버스에는 「October 14 2026」으로 찍는다', () => {
		expect(TEXT_FORMATS.date.accepts('2026-10-14')).toBe(true)
		expect(TEXT_FORMATS.date.toText('2026-10-14')).toBe('October 14 2026')
		expect(TEXT_FORMATS.date.toText('2026-01-01')).toBe('January 1 2026')
		expect(TEXT_FORMATS.date.toText('2024-02-29')).toBe('February 29 2024')
	})

	it('날짜는 달력에 없는 날을 거절하고, ISO가 아닌 기존 문구는 그대로 둔다', () => {
		expect(TEXT_FORMATS.date.accepts('2026-02-30')).toBe(false)
		expect(TEXT_FORMATS.date.accepts('October 14 2026')).toBe(false)
		expect(TEXT_FORMATS.date.toText('December 2025')).toBe('December 2025')
	})

	it('빈 값은 어느 형식이든 받는다 — 아직 쓰지 않은 칸이다', () => {
		for (const format of Object.values(TEXT_FORMATS)) expect(format.accepts('')).toBe(true)
	})

	it('숫자·이메일은 모양만 보고, 표기는 입력 그대로다', () => {
		expect(TEXT_FORMATS.number.accepts('-12.5')).toBe(true)
		expect(TEXT_FORMATS.number.accepts('12a')).toBe(false)
		expect(TEXT_FORMATS.number.toText('1000')).toBe('1000')
		expect(TEXT_FORMATS.email.accepts('a@b.co')).toBe(true)
		expect(TEXT_FORMATS.email.accepts('a@b')).toBe(false)
	})
})
