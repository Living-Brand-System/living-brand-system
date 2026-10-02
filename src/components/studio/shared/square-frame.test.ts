import { describe, expect, it } from 'vitest'
import { clampFrame, initialFrame, zoomFrame } from './square-frame'

const portrait = { width: 100, height: 200 }

describe('square-frame', () => {
	it('crop은 틀을 꽉 채운 채 짧은 변 기준으로 가운데에서 시작한다', () => {
		expect(initialFrame('crop', portrait)).toEqual({ scale: 0.01, x: 0, y: -0.5 })
	})

	it('crop은 틀 밖으로 빈 곳이 생기게 옮길 수 없다', () => {
		expect(clampFrame('crop', portrait, { scale: 0.01, x: 0.3, y: 0.3 })).toEqual({
			scale: 0.01,
			x: 0,
			y: 0,
		})
		expect(clampFrame('crop', portrait, { scale: 0.001, x: 0, y: -5 })).toEqual({
			scale: 0.01,
			x: 0,
			y: -1,
		})
	})

	it('inset은 판 전체가 틀 안에 남는다', () => {
		const frame = clampFrame('inset', portrait, { scale: 1, x: -1, y: 2 })
		expect(frame.scale).toBe(0.005)
		expect(frame.x).toBe(0)
		expect(frame.y).toBe(0)
		const small = clampFrame('inset', portrait, { scale: 0.004, x: 0.9, y: 0.9 })
		expect(small.x).toBeCloseTo(0.6)
		expect(small.y).toBeCloseTo(0.2)
	})

	it('배율을 바꿔도 틀 가운데의 점은 가운데에 남는다', () => {
		const zoomed = zoomFrame('crop', portrait, initialFrame('crop', portrait), 0.02)
		expect(zoomed).toEqual({ scale: 0.02, x: -0.5, y: -1.5 })
	})
})
