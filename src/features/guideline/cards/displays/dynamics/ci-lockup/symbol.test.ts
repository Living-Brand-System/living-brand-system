import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { SYMBOL_ASPECT, SYMBOL_CONTOURS, symbolPoints } from './rules'

// 🔴 `SYMBOL_CONTOURS`는 승인 아트워크의 **사본**이다. 사본이 정본과 조용히 어긋나는 것이
//    이 리포에서 가장 자주 난 사고이므로, 정본 SVG를 파싱해 좌표를 직접 대조한다.
//    (`carbon-scale.test.ts`가 패키지에서 값을 읽어 문서 표와 맞추는 것과 같은 형태다.)

const CANON = path.join(process.cwd(), 'public/symbols')
/** 정본 viewBox 높이. 좌표를 H=1로 정규화할 때 나누는 값. */
const H = 60

/** SVG의 polygon 좌표를 삼각형 목록으로. 순서는 파일에 적힌 그대로다. */
function polygons(file: string): [number, number][][] {
	const svg = readFileSync(path.join(CANON, file), 'utf8')
	return [...svg.matchAll(/<polygon[^>]*points="([^"]+)"/g)].map((m) => {
		const n = m[1]
			.trim()
			.split(/[\s,]+/)
			.map(Number)
		const pts = Array.from(
			{ length: n.length / 2 },
			(_, i) => [n[i * 2], n[i * 2 + 1]] as [number, number],
		)
		// 🔴 정본은 첫 점을 끝에 한 번 더 적어 닫는다(4점). 그 사본을 걷어내야 삼각형이 된다.
		const last = pts.at(-1)
		return last && last[0] === pts[0][0] && last[1] === pts[0][1] ? pts.slice(0, -1) : pts
	})
}

/** 정점 집합을 순서 무관하게 비교한다 — 파일과 코드의 정점 나열 순서가 다를 수 있다. */
function sorted(points: readonly (readonly number[])[]) {
	return [...points]
		.map((p) => [Number(p[0].toFixed(4)), Number(p[1].toFixed(4))])
		.sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

describe('심볼 형상이 정본 SVG와 같다', () => {
	it('종횡비가 정본 viewBox와 √3/2에 맞는다', () => {
		const svg = readFileSync(path.join(CANON, 'symbol-default.svg'), 'utf8')
		const box = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)
		expect(box, 'viewBox를 못 읽었다').not.toBeNull()
		const [w, height] = [Number(box?.[1]), Number(box?.[2])]
		expect(height).toBe(H)
		expect(SYMBOL_ASPECT).toBeCloseTo(w / height, 3)
		expect(SYMBOL_ASPECT).toBeCloseTo(Math.sqrt(3) / 2, 3)
	})

	for (const [state, file, t] of [
		['기본형', 'symbol-default.svg', 0],
		['단색형', 'symbol-mono.svg', 1],
	] as const) {
		it(`${state} 정점이 ${file}과 일치한다`, () => {
			const canon = polygons(file).map((tri) => sorted(tri.map(([x, y]) => [x / H, y / H])))
			const ours = symbolPoints(t).map((tri) => sorted(tri))
			expect(canon.length, '정본 삼각형이 3개가 아니다').toBe(3)
			expect(ours.length).toBe(3)

			// 파일의 나열 순서와 코드의 순서가 다르므로, 코드의 삼각형마다 정본에서 짝을 찾는다.
			for (const tri of ours) {
				const match = canon.find((c) =>
					c.every(
						(p, i) =>
							Math.abs(p[0] - tri[i][0]) < 0.001 &&
							Math.abs(p[1] - tri[i][1]) < 0.001,
					),
				)
				expect(match, `정본에 없는 삼각형: ${JSON.stringify(tri)}`).toBeDefined()
			}
		})
	}

	it('보간이 연속이다 — 중간값이 양 끝 사이에 있다', () => {
		const [a, mid, b] = [symbolPoints(0), symbolPoints(0.5), symbolPoints(1)]
		for (let c = 0; c < 3; c++) {
			for (let p = 0; p < 3; p++) {
				for (const axis of [0, 1] as const) {
					expect(mid[c][p][axis]).toBeCloseTo((a[c][p][axis] + b[c][p][axis]) / 2, 10)
				}
			}
		}
	})

	it('색 이름이 조각마다 다르다', () => {
		const names = SYMBOL_CONTOURS.map((c) => c.colorName)
		expect(new Set(names).size).toBe(names.length)
	})
})
