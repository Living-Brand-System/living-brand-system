import { describe, expect, it } from 'vitest'
import { nearestPoint } from './pad-pair'

const pair = { a: { x: -0.8, y: 0.8 }, b: { x: 0.8, y: -0.8 } }

describe('nearestPoint', () => {
	it('누른 지점에 가까운 점을 잡는다', () => {
		expect(nearestPoint(pair, { x: -0.7, y: 0.6 })).toBe('a')
		expect(nearestPoint(pair, { x: 0.5, y: -0.5 })).toBe('b')
	})

	it('두 점이 겹쳐 있으면 a를 잡는다 — 잡을 수 없는 점이 생기지 않게', () => {
		const stacked = { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } }
		expect(nearestPoint(stacked, { x: 0.3, y: 0.3 })).toBe('a')
	})
})
