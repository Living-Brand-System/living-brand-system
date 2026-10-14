import { describe, expect, it } from 'vitest'
import { managerOutline, roundedPolygonPath } from './manager-shape'

const arcs = (d: string) => [...d.matchAll(/A[\d.]+ [\d.]+ 0 0 ([01])/g)].map((m) => Number(m[1]))

describe('managerOutline + roundedPolygonPath', () => {
	const frame = { left: 100, top: 0, width: 200, height: 400 }

	it('짧은 새 패널이 왼쪽에 붙으면 꼭짓점 하나가 오목해져 바깥으로 메워진다', () => {
		const d = roundedPolygonPath(
			managerOutline(frame, { width: 80, height: 150, side: 'left' }),
			20,
		)
		// 시계 방향 6개 꼭짓점: 새 패널 왼위·frame 오른위·오른아래·왼아래 = 볼록, 이음매(frame 왼쪽 150) = 오목, 새 패널 왼아래 = 볼록
		expect(arcs(d)).toEqual([1, 1, 1, 1, 0, 1])
	})

	it('새 패널이 더 길면 오목한 자리가 frame 아래 모서리로 옮겨 간다', () => {
		const d = roundedPolygonPath(
			managerOutline(frame, { width: 80, height: 600, side: 'right' }),
			20,
		)
		// frame 왼위·새 패널 오른위·오른아래·왼아래 = 볼록, frame 오른아래(이음매) = 오목, frame 왼아래 = 볼록
		expect(arcs(d)).toEqual([1, 1, 1, 1, 0, 1])
	})

	it('새 패널이 없으면 둥근 사각형이고, 반지름은 짧은 변의 절반을 넘지 않는다', () => {
		const d = roundedPolygonPath(
			managerOutline({ left: 0, top: 0, width: 30, height: 400 }),
			40,
		)
		expect(arcs(d)).toEqual([1, 1, 1, 1])
		expect(d).toContain('A15 15')
	})
})
