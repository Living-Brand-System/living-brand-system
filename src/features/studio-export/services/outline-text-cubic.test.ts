import { describe, expect, it } from 'vitest'
import { pathToCubicSvg } from './outline-text.service'

/** 2차 곡선 한 점. B(t) = (1-t)²P0 + 2(1-t)t·Q + t²E */
function quadraticAt(
	p0: [number, number],
	q: [number, number],
	e: [number, number],
	t: number,
): [number, number] {
	const a = (1 - t) ** 2
	const b = 2 * (1 - t) * t
	const c = t ** 2
	return [a * p0[0] + b * q[0] + c * e[0], a * p0[1] + b * q[1] + c * e[1]]
}

/** 3차 곡선 한 점. */
function cubicAt(
	p0: [number, number],
	c1: [number, number],
	c2: [number, number],
	e: [number, number],
	t: number,
): [number, number] {
	const a = (1 - t) ** 3
	const b = 3 * (1 - t) ** 2 * t
	const c = 3 * (1 - t) * t ** 2
	const d = t ** 3
	return [
		a * p0[0] + b * c1[0] + c * c2[0] + d * e[0],
		a * p0[1] + b * c1[1] + c * c2[1] + d * e[1],
	]
}

describe('pathToCubicSvg', () => {
	/**
	 * 🔴 이 변환이 필요한 이유: pdf-lib은 `Q`를 PDF `v`로 내보내고 `v`는 첫 제어점을 현재점으로
	 * 대체한다. 그래서 아웃라인된 글자의 곡선이 눌린다. Q를 남기지 않는 것이 이 함수의 계약이다.
	 */
	it('Q를 남기지 않는다', () => {
		const d = pathToCubicSvg({
			commands: [
				{ command: 'moveTo', args: [0, 0] },
				{ command: 'quadraticCurveTo', args: [10, 20, 20, 0] },
				{ command: 'closePath', args: [] },
			],
		})
		expect(d).not.toMatch(/[Qq]/)
		expect(d).toBe('M0 0C6.67 13.33 13.33 13.33 20 0Z')
	})

	it('2차 곡선과 같은 자리를 지난다 — 근사가 아니라 정확 변환이다', () => {
		const p0: [number, number] = [0, 0]
		const q: [number, number] = [10, 20]
		const e: [number, number] = [20, 0]
		const c1: [number, number] = [
			p0[0] + (2 / 3) * (q[0] - p0[0]),
			p0[1] + (2 / 3) * (q[1] - p0[1]),
		]
		const c2: [number, number] = [
			e[0] + (2 / 3) * (q[0] - e[0]),
			e[1] + (2 / 3) * (q[1] - e[1]),
		]
		for (const t of [0, 0.25, 0.5, 0.75, 1]) {
			const [qx, qy] = quadraticAt(p0, q, e, t)
			const [cx, cy] = cubicAt(p0, c1, c2, e, t)
			expect(cx).toBeCloseTo(qx, 10)
			expect(cy).toBeCloseTo(qy, 10)
		}
	})

	/** pdf-lib이 하던 해석(첫 제어점 = 현재점)은 같은 자리를 지나지 않는다 — 검사기가 실제로 가른다. */
	it('pdf-lib의 v 해석은 2차 곡선을 벗어난다', () => {
		const p0: [number, number] = [0, 0]
		const q: [number, number] = [10, 20]
		const e: [number, number] = [20, 0]
		const [qx, qy] = quadraticAt(p0, q, e, 0.5)
		const [vx, vy] = cubicAt(p0, p0, q, e, 0.5)
		expect(Math.hypot(vx - qx, vy - qy)).toBeGreaterThan(1)
	})

	it('closePath 뒤 현재점이 subpath 시작으로 돌아간다', () => {
		const d = pathToCubicSvg({
			commands: [
				{ command: 'moveTo', args: [5, 5] },
				{ command: 'lineTo', args: [15, 5] },
				{ command: 'closePath', args: [] },
				{ command: 'quadraticCurveTo', args: [10, 10, 20, 20] },
			],
		})
		// 시작점 (5,5)에서 이어지므로 C1 = 5 + ⅔(10−5) = 8.33, C2 = 20 + ⅔(10−20) = 13.33이다.
		expect(d).toBe('M5 5L15 5ZC8.33 8.33 13.33 13.33 20 20')
	})
})
