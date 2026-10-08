import { describe, expect, it } from 'vitest'
import {
	CUSTOM_ARTBOARD,
	CUSTOM_PRESET,
	matchArtboard,
	matchOutputPreset,
	presetArtboard,
} from './output-presets'

const pixels = (key: Parameters<typeof presetArtboard>[0]) => {
	const { width, height } = presetArtboard(key)
	return { width, height }
}

describe('대지 프리셋', () => {
	it('mm 규격은 자기 권장 해상도로 px을 만든다', () => {
		// A size는 300ppi → 210mm = 2480px
		expect(pixels('a')).toEqual({ width: 2480, height: 3508 })
		// 🔴 배너는 **72ppi**다. 300으로 채우면 21,260px가 되어 캔버스 한도를 넘는다.
		expect(pixels('banner')).toEqual({ width: 1701, height: 5102 })
	})

	it('px 규격은 선언값을 그대로 쓴다', () => {
		expect(pixels('square')).toEqual({ width: 1080, height: 1080 })
		expect(pixels('wide')).toEqual({ width: 1920, height: 1080 })
	})

	it('현재 크기와 같은 프리셋을 찾고, 없으면 직접 입력이다', () => {
		expect(matchArtboard({ width: 1920, height: 1080 }, 300)).toBe('wide')
		expect(matchArtboard({ width: 2480, height: 3508 }, 300)).toBe('a')
		expect(matchArtboard({ width: 1103, height: 1246 }, 300)).toBe(CUSTOM_ARTBOARD)
		expect(matchArtboard({ width: null, height: null }, 300)).toBe(CUSTOM_ARTBOARD)
	})

	it('해상도를 바꿔도 A4는 A4다 — mm 규격은 물리 크기로 견준다', () => {
		// 🔴 px로 견주면 해상도를 건드리는 순간 선택이 「직접 입력」으로 튄다.
		expect(matchArtboard({ width: 1240, height: 1754 }, 150)).toBe('a')
		expect(matchArtboard({ width: 595, height: 842 }, 72)).toBe('a')
	})
})

describe('출력 프리셋', () => {
	it('모드마다 자기 목록에서만 찾는다 — 인쇄 모드에 디지털 프리셋은 없다', () => {
		expect(matchOutputPreset({ mode: 'digital', width: 1920, height: 1080, ppi: 300 })).toBe(
			'wide',
		)
		expect(matchOutputPreset({ mode: 'print', width: 1920, height: 1080, ppi: 300 })).toBe(
			CUSTOM_PRESET.value,
		)
		expect(matchOutputPreset({ mode: 'print', width: 1240, height: 1754, ppi: 150 })).toBe('a')
	})
})
