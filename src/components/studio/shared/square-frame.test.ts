import { describe, expect, it } from 'vitest'
import {
	clampFrame,
	initialFrame,
	SNAP_DISTANCE,
	snapFrame,
	THUMBNAIL_MARGIN,
	zoomFrame,
} from './square-frame'

const portrait = { width: 100, height: 200 }
/** Poster 2의 캡처 크기 — Figma 정본(node 448:9790)의 그 포스터다. */
const poster = { width: 1260, height: 1782 }

describe('square-frame', () => {
	it('정본 여백은 Figma 320 판의 19.967px이다', () => {
		expect(THUMBNAIL_MARGIN * 320).toBeCloseTo(19.967, 3)
	})

	it('crop은 틀을 꽉 채운 채 짧은 변 기준으로 가운데에서 시작한다', () => {
		expect(initialFrame('crop', portrait)).toEqual({ scale: 0.01, x: 0, y: -0.5 })
	})

	it('두 모드 모두 판 전체가 드는 크기의 절반까지 줄이고, 그림 가운데는 틀 안에 남는다', () => {
		expect(clampFrame('crop', portrait, { scale: 0.0001, x: 0, y: 0 }).scale).toBe(0.0025)
		expect(clampFrame('inset', portrait, { scale: 0.0001, x: 0, y: 0 }).scale).toBe(0.0025)
		expect(clampFrame('crop', portrait, { scale: 0.01, x: 0.8, y: -5 })).toEqual({
			scale: 0.01,
			x: 0.5,
			y: -1,
		})
	})

	it('최대는 crop이 cover의 2배, inset이 contain의 2배다', () => {
		expect(clampFrame('crop', portrait, { scale: 1, x: 0, y: 0 }).scale).toBe(0.02)
		expect(clampFrame('inset', portrait, { scale: 1, x: 0, y: 0 }).scale).toBe(0.01)
	})

	it('inset은 정본 자리(세로 = 양쪽 여백을 뺀 길이, 가운데)에서 시작한다', () => {
		const frame = initialFrame('inset', poster)
		expect(frame.y).toBeCloseTo(THUMBNAIL_MARGIN, 12)
		expect(frame.y + poster.height * frame.scale).toBeCloseTo(1 - THUMBNAIL_MARGIN, 12)
		expect(frame.x + (poster.width * frame.scale) / 2).toBeCloseTo(0.5, 12)
	})

	it('정본 근처로 손을 놓으면 정본 자리로 정확히 붙는다', () => {
		const exact = initialFrame('inset', poster)
		const near = { scale: exact.scale * 1.01, x: exact.x + 0.008, y: exact.y - 0.006 }
		const { frame, guides } = snapFrame('inset', poster, near)
		expect(frame.scale).toBeCloseTo(exact.scale, 12)
		expect(frame.x).toBeCloseTo(exact.x, 12)
		expect(frame.y).toBeCloseTo(exact.y, 12)
		expect(guides.y).toEqual([THUMBNAIL_MARGIN, 0.5, 1 - THUMBNAIL_MARGIN])
		expect(guides.x).toEqual([0.5])
	})

	it('멀어지면 붙지 않는다', () => {
		const raw = { scale: 0.0004, x: 0.21, y: 0.1 }
		expect(snapFrame('inset', poster, raw).frame).toEqual(raw)
	})

	it('그림의 변은 틀의 변과 여백 선에 붙는다', () => {
		const scale = 0.0004 // 세로 0.7128 — 길이 스냅 범위 밖
		const nearMargin = THUMBNAIL_MARGIN + SNAP_DISTANCE / 2
		expect(snapFrame('inset', poster, { scale, x: 0.21, y: nearMargin }).frame.y).toBeCloseTo(
			THUMBNAIL_MARGIN,
			12,
		)
		expect(snapFrame('inset', poster, { scale, x: 0.21, y: 0.01 }).frame.y).toBe(0)
	})

	it('crop도 가운데에 붙는다', () => {
		const { frame } = snapFrame('crop', portrait, { scale: 0.01, x: 0, y: -0.49 })
		expect(frame.y).toBe(-0.5)
	})

	it('배율을 바꿔도 틀 가운데의 점은 가운데에 남는다', () => {
		const zoomed = zoomFrame('crop', portrait, initialFrame('crop', portrait), 0.02)
		expect(zoomed).toEqual({ scale: 0.02, x: -0.5, y: -1.5 })
	})
})
