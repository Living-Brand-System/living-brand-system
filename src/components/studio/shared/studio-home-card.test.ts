import { describe, expect, it } from 'vitest'
import { averagePixelColor } from './studio-home-card'

const pixels = (...rgba: number[]) => new Uint8ClampedArray(rgba)

describe('averagePixelColor', () => {
	it('불투명 픽셀의 채널 평균을 hex로 낸다', () => {
		expect(averagePixelColor(pixels(0, 0, 0, 255, 255, 255, 255, 255))).toBe('#808080')
	})

	it('투명한 픽셀은 평균에 넣지 않는다', () => {
		expect(averagePixelColor(pixels(0, 40, 10, 255, 255, 255, 255, 0))).toBe('#00280a')
	})

	it('전부 투명하면 null이다', () => {
		expect(averagePixelColor(pixels(255, 255, 255, 0))).toBeNull()
	})
})
