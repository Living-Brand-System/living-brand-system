import { describe, expect, it } from 'vitest'
import { textEms } from './chart-primitives'
import { plotFrame } from './plot-frame'

const BOX = { x: 0, y: 0, width: 800, height: 600 }
const MONTHS = ['2025.03', '2025.06', '2025.09', '2026.03']

describe('판', () => {
	it('눈금·이름·범례가 먹는 만큼 판이 줄어든다 — 마크가 설 자리는 그 안이다', () => {
		const frame = plotFrame(BOX, {
			left: { kind: 'value', min: -4, max: 12 },
			bottom: { kind: 'category', labels: MONTHS, scale: 'point' },
			legend: { names: ['매출', '영업이익'], colors: ['#000', '#111'] },
			fontSize: 20,
		})
		expect(frame.plot.x).toBeGreaterThan(BOX.x)
		expect(frame.plot.y).toBeGreaterThan(BOX.y)
		expect(frame.plot.x + frame.plot.width).toBeLessThan(BOX.x + BOX.width)
		expect(frame.plot.y + frame.plot.height).toBeLessThan(BOX.y + BOX.height)
	})

	it('축이 없으면 여백도 없다 — 판이 상자를 그대로 쓴다', () => {
		const frame = plotFrame(BOX, { left: null, bottom: null, fontSize: 20 })
		expect(frame.plot).toEqual(BOX)
		expect(frame.primitives).toHaveLength(0)
	})

	/**
	 * 🔴 `point` 축의 첫·마지막 이름은 판 양 끝에 걸터앉아 절반이 밖으로 나간다. 자리를 안
	 *    비워 두면 첫 이름이 눈금 글자를 덮고 마지막 이름이 상자를 넘는다(실제로 넘었다).
	 */
	it('양 끝 이름이 상자를 넘지 않는다', () => {
		const fontSize = 24
		const frame = plotFrame(BOX, {
			left: { kind: 'value', min: 0, max: 10 },
			bottom: { kind: 'category', labels: MONTHS, scale: 'point' },
			fontSize,
		})
		const half = (text: string) => (textEms(text) * fontSize) / 2
		expect(frame.x(0) - half(MONTHS[0])).toBeGreaterThanOrEqual(BOX.x)
		expect(frame.x(MONTHS.length - 1) + half(MONTHS[3])).toBeLessThanOrEqual(BOX.x + BOX.width)
	})

	it('band 축은 칸의 한가운데를 준다 — point 축은 양 끝에 붙인다', () => {
		const band = plotFrame(BOX, {
			left: null,
			bottom: { kind: 'category', labels: ['가', '나', '다', '라'] },
			fontSize: 20,
		})
		expect(band.x(0) - band.plot.x).toBeCloseTo(band.bandWidth / 2)
		expect(band.bandWidth).toBeCloseTo(band.plot.width / 4)

		const point = plotFrame(BOX, {
			left: null,
			bottom: { kind: 'category', labels: ['가', '나', '다', '라'], scale: 'point' },
			fontSize: 20,
		})
		expect(point.x(0)).toBeCloseTo(point.plot.x)
		expect(point.x(3)).toBeCloseTo(point.plot.x + point.plot.width)
	})

	it('범례 칩 색이 계열 색과 같다 — 다르면 어느 색이 무엇인지 말해 주지 못한다', () => {
		const colors = ['#0A1A2B', '#137A3E', '#3ECF6B']
		const frame = plotFrame(BOX, {
			left: null,
			bottom: null,
			legend: { names: ['매출', '영업이익', '수주'], colors },
			fontSize: 20,
		})
		const chips = frame.primitives.filter((primitive) => primitive.kind === 'rect')
		expect(chips.map((chip) => (chip.kind === 'rect' ? chip.fill : ''))).toEqual(colors)
		const names = frame.primitives.filter((primitive) => primitive.kind === 'text')
		expect(names.map((name) => (name.kind === 'text' ? name.text : ''))).toEqual([
			'매출',
			'영업이익',
			'수주',
		])
	})

	it('🔴 계열이 하나면 범례를 그리지 않는다 — 견줄 것이 없는데 이름만 서면 제목으로 읽힌다', () => {
		const frame = plotFrame(BOX, {
			left: null,
			bottom: null,
			legend: { names: ['매출'], colors: ['#000'] },
			fontSize: 20,
		})
		expect(frame.primitives).toHaveLength(0)
		expect(frame.plot).toEqual(BOX)
	})

	it('값 축 눈금은 사람이 읽는 간격으로 끊고, 데이터 범위를 덮는다', () => {
		const frame = plotFrame(BOX, {
			left: { kind: 'value', min: -2.5, max: 9.3 },
			bottom: null,
			fontSize: 20,
		})
		const ticks = frame.primitives
			.filter((primitive) => primitive.kind === 'text')
			.map((primitive) => (primitive.kind === 'text' ? primitive.text : ''))
		expect(ticks).toEqual(['-5%', '0%', '5%', '10%'])
		// 가장 낮은 눈금이 판 바닥, 가장 높은 눈금이 판 꼭대기다.
		expect(frame.y(-5)).toBeCloseTo(frame.plot.y + frame.plot.height)
		expect(frame.y(10)).toBeCloseTo(frame.plot.y)
	})

	it('보조선은 점선이다 — 데이터 선과 층위가 다르다', () => {
		const lines = plotFrame(BOX, {
			left: { kind: 'value', min: 0, max: 10 },
			bottom: null,
			fontSize: 20,
		}).primitives.filter((primitive) => primitive.kind === 'line')
		expect(lines.length).toBeGreaterThan(0)
		expect(lines.every((line) => line.kind === 'line' && line.dash !== undefined)).toBe(true)
	})
})
