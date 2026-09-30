import { describe, expect, it } from 'vitest'
import { resolveCmykIccProfilePath } from '../color-profile.server'
import { convertRgbToCmyk } from './rgb-to-cmyk.sharp'

const icc = resolveCmykIccProfilePath('cgats21-crpc6')

describe('convertRgbToCmyk', () => {
	it('순수 검정은 K만으로 나간다', async () => {
		const map = await convertRgbToCmyk(['#000000', '#FFFFFF'], icc)
		// 🔴 ICC를 그대로 쓰면 307.5%(C76.5 M71.8 Y61.6 K97.6)가 되어 글자가 네 판에 찍힌다.
		expect(map.get('#000000')).toEqual({ c: 0, m: 0, y: 0, k: 1 })
		expect(map.get('#ffffff')).toEqual({ c: 0, m: 0, y: 0, k: 0 })
	})

	it('유채색은 ICC를 그대로 탄다', async () => {
		const map = await convertRgbToCmyk(['#003087', '#00ad45'], icc)
		const navy = map.get('#003087')
		expect(navy?.c).toBeGreaterThan(0.9)
		expect(navy?.m).toBeGreaterThan(0.5)
		const green = map.get('#00ad45')
		expect(green?.m).toBeLessThan(0.1)
		expect(green?.y).toBeGreaterThan(0.9)
	})

	/**
	 * 🔴 `toColourspace('cmyk')`를 먼저 부르면 ICC가 그 CMYK를 또 변환한다(이중 변환).
	 * 그러면 브랜드 색에 검정이 얹혀 탁해진다 — HD 그린이 K2 대신 K11.8이었다.
	 */
	it('브랜드 색에 검정이 얹히지 않는다', async () => {
		const map = await convertRgbToCmyk(['#00ad45', '#003087'], icc)
		expect(map.get('#00ad45')?.k).toBeLessThan(0.05)
		expect(map.get('#003087')?.k).toBeLessThan(0.32)
	})

	/** 이중 변환은 어두운 톤을 한 값으로 뭉갰다 — #000000과 #1a1a1a가 완전히 같아졌다. */
	it('어두운 톤끼리 구분이 남는다', async () => {
		const map = await convertRgbToCmyk(['#1a1a1a', '#262626'], icc)
		expect(map.get('#1a1a1a')).not.toEqual(map.get('#262626'))
	})

	it('총 잉크량이 프로파일 상한(300%)을 넘지 않는다', async () => {
		const map = await convertRgbToCmyk(['#000000', '#003087', '#00ad45', '#333333'], icc)
		for (const ink of map.values()) {
			expect(ink.c + ink.m + ink.y + ink.k).toBeLessThanOrEqual(3)
		}
	})
})
