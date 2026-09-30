import { describe, expect, it } from 'vitest'
import { parseCmykNotation } from './cmyk-notation'

describe('parseCmykNotation', () => {
	it('정본 표기를 잉크량으로 읽는다', () => {
		expect(parseCmykNotation('C 80 M 0 Y 100 K 0')).toEqual({ c: 0.8, k: 0, m: 0, y: 1 })
	})

	it('정본이 상한을 넘는 값도 그대로 읽는다 — 판단은 가이드라인이 한다', () => {
		// BLACK은 총 318%로 CRPC6의 300%를 넘지만 정본이 그렇게 적혀 있다.
		expect(parseCmykNotation('C 94 M 77 Y 53 K 94')).toEqual({
			c: 0.94,
			k: 0.94,
			m: 0.77,
			y: 0.53,
		})
	})

	it('공백과 대소문자가 흔들려도 읽는다', () => {
		expect(parseCmykNotation('  c15  m0  y20  k0 ')).toEqual({ c: 0.15, k: 0, m: 0, y: 0.2 })
	})

	it.each([
		['옛 플레이스홀더가 아닌 빈 값', ''],
		['잉크 하나가 빠진 표기', 'C 80 M 0 Y 100'],
		['100을 넘는 값', 'C 120 M 0 Y 0 K 0'],
		['퍼센트가 붙은 표기', 'C 80% M 0% Y 100% K 0%'],
		['채널 이름이 다른 표기', 'C 80 M 0 Y 100 B 0'],
		['숫자만 있는 표기', '80 0 100 0'],
	])('%s는 읽지 않는다', (_label, notation) => {
		expect(parseCmykNotation(notation)).toBeNull()
	})
})
