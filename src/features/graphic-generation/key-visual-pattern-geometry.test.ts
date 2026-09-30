import { describe, expect, it } from 'vitest'
import {
	applyControllerRestrictions,
	type ControllerGroupDefinition,
} from '@/modules/studio-controller/controller-definition'
import runtime, {
	KEY_VISUAL_PATTERN_DEFAULT_INPUT,
	KEY_VISUAL_PATTERN_PRESETS,
} from './graphic-runtimes/key-visual-pattern/definition'
import model, {
	CORNER_OUTWARD_NUDGE,
	createKeyVisualPatternScene,
	createKeyVisualPatternVectorArtifact,
	type KeyVisualPatternDash,
	type KeyVisualPatternScene,
} from './graphic-runtimes/key-visual-pattern/model'

/** 브랜드팀 원본이 간격·여백·라인 길이를 정한 기준 캔버스. 골든 값은 전부 이 크기에서 뽑았다. */
const BASE = { width: 720, height: 720 }
const FLAT = { ...KEY_VISUAL_PATTERN_DEFAULT_INPUT, viewpoint: 'flat' } as const

describe('createKeyVisualPatternScene', () => {
	it('기본값은 정중앙에 기준점을 둔 21×21 격자를 만든다', () => {
		const scene = createKeyVisualPatternScene(FLAT, BASE)

		expect(scene.origin).toEqual({ x: 360, y: 360 })
		expect(scene.dashes).toHaveLength(21 * 21)
		expect(scene.dashes.every(isFiniteDash)).toBe(true)
		// 첫 dash는 좌상단 칸(여백 43.2 = 720의 6%)에서 기준점(대각선 45°)을 향한다.
		expect(scene.dashes[0].x1).toBeCloseTo(49.920343, 6)
		expect(scene.dashes[0].y1).toBeCloseTo(49.920343, 6)
		expect(scene.dashes[0].x2).toBeCloseTo(36.479657, 6)
		expect(scene.dashes[0].y2).toBeCloseTo(36.479657, 6)
		expect(scene.dashes[0].weight).toBeCloseTo(2.986971, 6)
		expect(scene.backgroundColor).toBe('#00280A')
		expect(scene.lineColor).toBe('#007332')
	})

	// 짝수 칸에는 정중앙이 없다.
	it('칸 수를 항상 홀수로 맞춘다', () => {
		for (const gap of [10, 11, 13, 17, 21, 29, 30]) {
			const size = gridSize(
				createKeyVisualPatternScene({ ...FLAT, columnGap: gap, rowGap: gap }, BASE),
			)
			expect(size.columns % 2, `columnGap ${gap}`).toBe(1)
			expect(size.rows % 2, `rowGap ${gap}`).toBe(1)
		}
		expect(gridSize(createKeyVisualPatternScene(FLAT, BASE))).toEqual({ columns: 21, rows: 21 })
	})

	// 🔴 여백도 칸 크기도 **짧은 변**만 따른다. 축마다 폭·높이 비율을 쓰면 여백비가 그대로 화면비가 되어
	// 5:1 판에서 좌우 여백이 상하의 5배가 됐다. 긴 변이 늘리는 것은 칸 수지 칸 크기가 아니다.
	it('긴 변은 칸 수만 늘리고 여백·칸 크기는 짧은 변을 따른다', () => {
		const square = createKeyVisualPatternScene(FLAT, { width: 1000, height: 1000 })
		const wide = createKeyVisualPatternScene(FLAT, { width: 5000, height: 1000 })

		for (const scene of [square, wide]) {
			const columns = axisPositions(scene, 'x')
			const rows = axisPositions(scene, 'y')
			// 사방 여백이 절대 같다 — 짧은 변의 6%.
			for (const margin of [
				columns[0],
				scene.width - (columns.at(-1) as number),
				rows[0],
				scene.height - (rows.at(-1) as number),
			]) {
				expect(margin).toBeCloseTo(60, 6)
			}
		}

		expect(gridSize(square)).toEqual({ columns: 21, rows: 21 })
		expect(gridSize(wide)).toEqual({ columns: 117, rows: 21 })
		// 짧은 변이 같으므로 칸 크기도 같다. 긴 축은 정수 칸에 맞추느라 반 칸 안쪽으로만 어긋난다.
		expect(neighborGaps(axisPositions(wide, 'y'))[0]).toBeCloseTo(44, 6)
		expect(neighborGaps(axisPositions(wide, 'x'))[0]).toBeCloseTo(42.068966, 6)
	})

	it('평면 시점은 균등 격자를 대칭 여백 안에 놓는다', () => {
		const scene = createKeyVisualPatternScene(FLAT, { width: 1920, height: 1080 })
		const columnPositions = axisPositions(scene, 'x')
		const rowPositions = axisPositions(scene, 'y')

		expect(new Set(neighborGaps(columnPositions).map((gap) => gap.toFixed(6))).size).toBe(1)
		expect(new Set(neighborGaps(rowPositions).map((gap) => gap.toFixed(6))).size).toBe(1)
		// 여백은 짧은 변(1080)의 6%로 사방이 같다.
		expect(columnPositions[0]).toBeCloseTo(64.8, 6)
		expect(1920 - (columnPositions.at(-1) as number)).toBeCloseTo(64.8, 6)
		expect(rowPositions[0]).toBeCloseTo(64.8, 6)
		expect(1080 - (rowPositions.at(-1) as number)).toBeCloseTo(64.8, 6)
	})

	it('같은 입력은 캔버스 크기와 무관하게 닮은 구도를 만든다', () => {
		const small = createKeyVisualPatternScene(KEY_VISUAL_PATTERN_DEFAULT_INPUT, BASE)
		const large = createKeyVisualPatternScene(KEY_VISUAL_PATTERN_DEFAULT_INPUT, {
			width: 1080,
			height: 1080,
		})

		expect(large.dashes).toHaveLength(small.dashes.length)
		for (const [index, dash] of large.dashes.entries()) {
			const reference = small.dashes[index]
			expect(dash.x1).toBeCloseTo(reference.x1 * 1.5, 6)
			expect(dash.y1).toBeCloseTo(reference.y1 * 1.5, 6)
			expect(dash.weight).toBeCloseTo(reference.weight * 1.5, 6)
		}
	})

	it('입체 시점에서도 기준 칸이 평면 위치를 지키고 행·열이 수평·수직을 유지한다', () => {
		const scene = createKeyVisualPatternScene(KEY_VISUAL_PATTERN_DEFAULT_INPUT, BASE)
		const centers = centersOf(scene)

		// 행의 y는 행 번호에서만, 열의 x는 열 번호에서만 나온다.
		for (let row = 0; row < 21; row++) {
			const rowCenters = centers.slice(row * 21, row * 21 + 21)
			expect(
				new Set(rowCenters.map((center) => center.y.toFixed(9))).size,
				`row ${row}`,
			).toBe(1)
		}
		for (let column = 0; column < 21; column++) {
			const columnCenters = centers.filter((_, index) => index % 21 === column)
			expect(
				new Set(columnCenters.map((center) => center.x.toFixed(9))).size,
				`column ${column}`,
			).toBe(1)
		}
		// 기준 칸은 압축되지 않으므로 길이·두께가 축소 없는 원본 값이고 평면 격자점 위에 그대로 있다.
		expect(scene.origin).toEqual({ x: 360, y: 360 })
		const originDash = scene.dashes[10 * 21 + 10]
		expect(dashLength(originDash)).toBeCloseTo(35, 6)
		expect(originDash.weight).toBeCloseTo(10, 6)
	})

	// 🔴 minCellGap은 보정 **전** 하한이라 최종 간격은 그 값 아래로 내려간다(8 → 7.747). 하한이 막는 것은
	// 경계 쪽 간격이 0으로 붕괴하는 것이고, 그것이 이 단정의 내용이다.
	it('최소 칸 간격이 압축된 간격의 붕괴를 막는다', () => {
		const withFloor = createKeyVisualPatternScene(KEY_VISUAL_PATTERN_DEFAULT_INPUT, BASE)
		const withoutFloor = createKeyVisualPatternScene(
			{ ...KEY_VISUAL_PATTERN_DEFAULT_INPUT, minCellGap: 0 },
			BASE,
		)

		expect(Math.min(...neighborGaps(axisPositions(withFloor, 'x')))).toBeCloseTo(7.74731, 6)
		expect(Math.min(...neighborGaps(axisPositions(withoutFloor, 'x')))).toBeCloseTo(1.00181, 6)
	})

	it('오버슈트 보정은 압축된 축을 그리드 경계 안에 둔다', () => {
		const centered = axisPositions(
			createKeyVisualPatternScene(KEY_VISUAL_PATTERN_DEFAULT_INPUT, BASE),
			'x',
		)
		const corner = axisPositions(
			createKeyVisualPatternScene(
				{ ...KEY_VISUAL_PATTERN_DEFAULT_INPUT, origin: { x: 0, y: 0 } },
				BASE,
			),
			'x',
		)

		// 평면 격자의 첫·마지막 칸(43.2, 676.8)이 경계다.
		expect(centered[0]).toBeCloseTo(43.2, 6)
		expect(centered.at(-1) as number).toBeCloseTo(676.8, 6)
		// 코너 기준점은 한 방향만 압축되고, 보정이 먼 쪽 끝을 경계에 정확히 착지시킨다.
		// 🔴 꼭짓점 기준 칸은 가운데가 칸에서 밀리므로 격자 위치로 세지 않는다.
		expect(corner[0]).toBeCloseTo(43.2, 6)
		expect(corner.at(-1) as number).toBeCloseTo(676.8, 6)
	})

	it('수직·수평은 각도를 고정하고 사선은 기준점을 향한다', () => {
		const vertical = createKeyVisualPatternScene({ ...FLAT, direction: 'vertical' }, BASE)
		const horizontal = createKeyVisualPatternScene({ ...FLAT, direction: 'horizontal' }, BASE)
		const diagonal = createKeyVisualPatternScene(FLAT, BASE)

		expect(Math.max(...vertical.dashes.map((dash) => Math.abs(dash.x1 - dash.x2)))).toBeCloseTo(
			0,
			9,
		)
		expect(
			Math.max(...horizontal.dashes.map((dash) => Math.abs(dash.y1 - dash.y2))),
		).toBeCloseTo(0, 9)
		expect(dashLength(vertical.dashes[0])).toBeCloseTo(19.008, 6)

		for (const dash of diagonal.dashes) {
			const center = centerOf(dash)
			if (center.x === diagonal.origin.x && center.y === diagonal.origin.y) continue
			const expected = Math.atan2(diagonal.origin.y - center.y, diagonal.origin.x - center.x)
			const actual = Math.atan2(dash.y1 - center.y, dash.x1 - center.x)
			expect(Math.cos(expected - actual)).toBeCloseTo(1, 9)
		}
	})

	// 기준 칸은 기준점과 거리가 0이라 방향을 못 구한다. 🔴 원본의 설명 주석이 코드와 반대라(끝 행을 세로로
	// 적어 놓았다) 화면을 만든 코드를 정본으로 옮겼다 — 끝 행은 가로, 끝 열은 세로다.
	it('기준 칸의 각도는 끝 행·끝 열 규칙으로 갈린다', () => {
		const columnEdge = createKeyVisualPatternScene({ ...FLAT, origin: { x: 0, y: 0.5 } }, BASE)
		const rowEdge = createKeyVisualPatternScene({ ...FLAT, origin: { x: 0.5, y: 0 } }, BASE)
		const inside = createKeyVisualPatternScene(FLAT, BASE)

		// 끝 열(x=0) 기준 칸 → 세로
		expect(columnEdge.dashes[10 * 21].x1).toBeCloseTo(columnEdge.dashes[10 * 21].x2, 9)
		// 끝 행(y=0) 기준 칸 → 가로
		expect(rowEdge.dashes[10].y1).toBeCloseTo(rowEdge.dashes[10].y2, 9)
		// 안쪽 칸은 더 좁은 축을 따르고, 간격이 같으면 가로다.
		expect(inside.dashes[10 * 21 + 10].y1).toBeCloseTo(inside.dashes[10 * 21 + 10].y2, 9)
	})

	// 끝 행(가로)과 끝 열(세로)이 같은 칸에서 만나는 자리는 판의 네 꼭짓점뿐이다. 어느 한쪽 각도를
	// 고르면 그 줄이 한 칸 끊겨 보이므로 대각선으로 두되, 가운데를 칸에 맞추면 그 칸만 격자 밖으로
	// 나간다 — 바깥 끝을 같은 행·열의 바깥 모서리에 앉힌다.
	it('꼭짓점 기준 칸은 대각선이고 정해진 만큼만 꼭짓점 쪽으로 나온다', () => {
		for (const [originX, originY] of [
			[0, 0],
			[1, 0],
			[0, 1],
			[1, 1],
		]) {
			const scene = createKeyVisualPatternScene(
				{ ...KEY_VISUAL_PATTERN_DEFAULT_INPUT, origin: { x: originX, y: originY } },
				BASE,
			)
			const dash = nearestDash(scene, scene.origin)
			const angle = Math.atan2(dash.y2 - dash.y1, dash.x2 - dash.x1)

			// 45° — 가로도 세로도 아니다.
			expect(Math.abs(Math.cos(angle))).toBeCloseTo(Math.abs(Math.sin(angle)), 9)

			// 같은 행·열의 선은 칸에서 두께의 절반만큼 바깥으로 나간다. 대각선의 바깥 끝점이 그
			// 모서리에서 얼마나 못 미치는지를 CORNER_OUTWARD_NUDGE가 정한다(1이면 정확히 닿는다).
			// 🔴 값이 아니라 관계를 검사한다 — 취향값이 바뀌어도 기하가 맞으면 통과해야 한다.
			for (const axis of ['x', 'y'] as const) {
				const outward = (axis === 'x' ? originX : originY) === 0 ? -1 : 1
				const end = outward * dash[`${axis}1`] > outward * dash[`${axis}2`] ? 1 : 2
				const reach = 0.5 - (1 - CORNER_OUTWARD_NUDGE) * Math.SQRT1_2
				expect(dash[`${axis}${end}`]).toBeCloseTo(
					scene.origin[axis] + outward * dash.weight * reach,
					9,
				)
			}
		}
	})

	// 기준점이 끝에서 두 칸 안쪽에 서면 그쪽 사분면이 두 줄 이하로 납작해져 어색해진다. 각도를 손보는
	// 대신 그 자리에 아예 못 서게 한다 — 드래그하면 끝 두 칸이 건너뛰어진다.
	it('기준점은 끝에서 두 칸 이내에 서지 못하고 끝으로 붙는다', () => {
		const grid = axisPositions(createKeyVisualPatternScene(FLAT, BASE), 'x')
		const last = grid.length - 1
		const forbidden = new Set([1, 2, last - 2, last - 1])
		const landed = new Set()

		for (let step = 0; step <= 200; step++) {
			const x = step / 200
			const scene = createKeyVisualPatternScene({ ...FLAT, origin: { x, y: 0.5 } }, BASE)
			const index = grid.findIndex((position) => Math.abs(position - scene.origin.x) < 1e-6)
			expect(index, `x=${x.toFixed(3)}은 격자 위에 없다`).toBeGreaterThanOrEqual(0)
			expect(forbidden.has(index), `x=${x.toFixed(3)} → 칸 ${index}`).toBe(false)
			landed.add(index)
		}

		// 막는 것은 끝 두 칸뿐이다 — 바로 안쪽(3, last-3)은 그대로 선다.
		expect(landed.has(0) && landed.has(last)).toBe(true)
		expect(landed.has(3) && landed.has(last - 3)).toBe(true)
	})

	// 기준 칸은 각도가 0/0이라 「더 좁은 축」으로 가른다. 🔴 그 비교를 파생 간격에 걸면 안 된다 —
	// 정수 칸에 맞추느라 두 축이 1~6% 안으로 붙어서 칸 수 반올림이 대소를 정하고, 슬라이더 한 칸에
	// 화면에서 가장 두꺼운 이 선이 90° 돈다. 지정 간격은 사용자가 직접 만지는 값이라 흔들리지 않는다.
	it('비정방 판에서 간격 슬라이더를 밀어도 기준 칸 각도가 뒤집히지 않는다', () => {
		const angles = new Set()
		for (let gap = 10; gap <= 30; gap++) {
			const scene = createKeyVisualPatternScene(
				{ ...FLAT, columnGap: gap, rowGap: gap },
				{ width: 1920, height: 1080 },
			)
			const dash = nearestDash(scene, scene.origin)
			angles.add(Math.abs(dash.y1 - dash.y2) < 1e-9 ? '가로' : '세로')
		}
		expect(angles).toEqual(new Set(['가로']))

		// 두 간격을 실제로 다르게 주면 더 넓은 축을 따라 갈린다.
		const widerColumns = createKeyVisualPatternScene(
			{ ...FLAT, columnGap: 30, rowGap: 10 },
			{ width: 1920, height: 1080 },
		)
		const dash = nearestDash(widerColumns, widerColumns.origin)
		expect(Math.abs(dash.x1 - dash.x2)).toBeCloseTo(0, 9)
	})

	it('가변 두께를 끄면 평면 전체가 같은 두께다', () => {
		const off = createKeyVisualPatternScene({ ...FLAT, variableWeight: false }, BASE)
		const on = createKeyVisualPatternScene(FLAT, BASE)

		// 가변 두께를 끄면 maxWeight가 아니라 minWeight 쪽이 쓰인다(1 × safetyScale 0.543086).
		expect(new Set(off.dashes.map((dash) => dash.weight.toFixed(6)))).toEqual(
			new Set(['0.543086']),
		)
		expect(new Set(on.dashes.map((dash) => dash.weight.toFixed(6))).size).toBeGreaterThan(1)
	})

	it('두께는 기준점에서 최대, 그리드 대각선 끝에서 최소다', () => {
		const scene = createKeyVisualPatternScene({ ...FLAT, origin: { x: 0, y: 0 } }, BASE)

		// 평면에서는 축소 배율이 전 칸 공통이라 두께 비가 곧 max/min 비다(10:1).
		expect(scene.dashes[0].weight).toBeCloseTo(5.430857, 6)
		expect(scene.dashes.at(-1)?.weight).toBeCloseTo(0.543086, 6)
		expect(Math.max(...scene.dashes.map((dash) => dash.weight))).toBeCloseTo(
			scene.dashes[0].weight,
			9,
		)
		expect(Math.min(...scene.dashes.map((dash) => dash.weight))).toBeCloseTo(
			scene.dashes.at(-1)?.weight as number,
			9,
		)
	})

	it('선 길이는 옆 칸 간격의 lengthFillRatio를 넘지 않는다', () => {
		const scene = createKeyVisualPatternScene(FLAT, BASE)
		const half = createKeyVisualPatternScene({ ...FLAT, lengthFillRatio: 0.3 }, BASE)

		// 평면 간격 31.68 × 0.6 = 19.008. 라인 길이 35가 그대로 쓰이면 옆 칸을 침범한다.
		for (const dash of scene.dashes) expect(dashLength(dash)).toBeCloseTo(19.008, 6)
		for (const dash of half.dashes) expect(dashLength(dash)).toBeCloseTo(9.504, 6)
	})

	// 여백이 짧은 변의 비율이 된 뒤로 1×1 격자는 뷰포트 0에서만 나온다 — 간격도 0이라 스냅이 0으로
	// 나누고, 두께 감쇠의 정규화 기준(그리드 대각선)도 0이 된다. 레이아웃 도중 실제로 들어오는 값이다.
	it('뷰포트가 0이어도 NaN을 만들지 않는다', () => {
		const empty = createKeyVisualPatternScene(KEY_VISUAL_PATTERN_DEFAULT_INPUT, {
			width: 0,
			height: 0,
		})

		expect(empty.dashes).toHaveLength(1)
		expect(empty.dashes.every(isFiniteDash)).toBe(true)
	})

	it('기준점을 칸에 스냅하므로 저장된 좌표와 반 칸까지 어긋난다', () => {
		// 🔴 이 이격이 커서, 미리보기의 기준점 드래그 히트 판정을 scene.origin에 걸면 안 된다
		//    (핸들을 그리지 않으므로 어긋난 만큼은 다시 잡을 방법이 없다).
		//    runtime.client는 저장된 input.origin에 히트를 건다.
		const scene = createKeyVisualPatternScene(
			{ ...KEY_VISUAL_PATTERN_DEFAULT_INPUT, origin: { x: 0, y: 0 } },
			{ width: 720, height: 720 },
		)

		expect(scene.origin.x).toBeCloseTo(43.2, 9)
		expect(scene.origin.y).toBeCloseTo(43.2, 9)
		expect(Math.hypot(scene.origin.x, scene.origin.y)).toBeCloseTo(61.094, 3)
	})
})

describe('createKeyVisualPatternVectorArtifact', () => {
	it('shared geometry를 파일 형식과 무관한 Vector Artifact로 투영한다', () => {
		const scene = createKeyVisualPatternScene(FLAT, BASE)
		const artifact = createKeyVisualPatternVectorArtifact(scene)

		expect(artifact).toMatchObject({
			kind: 'vector',
			source: { width: 720, height: 720, background: '#00280A' },
		})
		// 기준점 마커는 산출물에 남지 않는다 — primitive는 dash 뿐이다.
		expect(artifact.source.primitives).toHaveLength(scene.dashes.length)
		expect(artifact.source.primitives.every((primitive) => primitive.kind === 'line')).toBe(
			true,
		)
		expect(artifact.source.primitives[0]).toMatchObject({
			kind: 'line',
			stroke: '#007332',
			lineCap: 'square',
		})
	})
})

/** 한 점에 가장 가까운 dash. 기준 칸은 가운데가 칸에서 밀릴 수 있어 좌표 일치로는 못 찾는다. */
function nearestDash(scene: KeyVisualPatternScene, point: { x: number; y: number }) {
	return scene.dashes.reduce((best, dash) => {
		const center = centerOf(dash)
		return Math.hypot(center.x - point.x, center.y - point.y) <
			Math.hypot(centerOf(best).x - point.x, centerOf(best).y - point.y)
			? dash
			: best
	})
}

function centerOf(dash: KeyVisualPatternDash) {
	return { x: (dash.x1 + dash.x2) / 2, y: (dash.y1 + dash.y2) / 2 }
}

function centersOf(scene: KeyVisualPatternScene) {
	return scene.dashes.map(centerOf)
}

/** 씬에서 관찰되는 한 축의 격자 위치. 같은 행·열이 좌표를 공유하므로 중복을 걷어 오름차순으로 준다. */
function axisPositions(scene: KeyVisualPatternScene, axis: 'x' | 'y') {
	const values = new Set(centersOf(scene).map((center) => center[axis].toFixed(9)))
	return [...values].map(Number).sort((a, b) => a - b)
}

function neighborGaps(positions: number[]) {
	return positions.slice(1).map((value, index) => value - positions[index])
}

function gridSize(scene: KeyVisualPatternScene) {
	return {
		columns: axisPositions(scene, 'x').length,
		rows: axisPositions(scene, 'y').length,
	}
}

function dashLength(dash: KeyVisualPatternDash) {
	return Math.hypot(dash.x1 - dash.x2, dash.y1 - dash.y2)
}

function isFiniteDash(dash: KeyVisualPatternDash) {
	return [dash.x1, dash.y1, dash.x2, dash.y2, dash.weight].every(Number.isFinite)
}

// 프리셋은 컬러와 같은 위계로 definition에 선언되고, 고르면 **우측 컨트롤의 기본값**이 바뀐다.
// 🔴 기본값이 계약을 벗어나면 `applyControllerRestrictions`가 던지는데, 그 호출이 `/studio/graphic`
//    렌더 경로라 프로파일 하나가 스튜디오 전체를 500으로 만든다. 여섯 개를 전부 통과시켜 둔다.
describe('프리셋', () => {
	// 매니페스트의 groups는 리터럴 튜플로 좁혀져 있어 계약 타입으로 한 번 넓혀 쓴다.
	const groups = runtime.controller.groups as readonly ControllerGroupDefinition[]
	const controls = groups.flatMap((group) => group.controls)

	it('모든 프리셋이 계약 안쪽 기본값만 만든다', () => {
		for (const preset of KEY_VISUAL_PATTERN_PRESETS) {
			const restrictions = model.getRestrictions?.({ preset: preset.key }) ?? null
			const applied = applyControllerRestrictions(groups, restrictions)
			const byId = new Map(
				applied.flatMap((group) => group.controls.map((c) => [c.id, c] as const)),
			)

			for (const [key, value] of Object.entries(preset.values)) {
				if (key === 'origin') continue
				expect(byId.get(key)?.defaultValue, `${preset.key}.${key}`).toEqual(value)
			}
		}
	})

	// 🔴 프리셋이 건드리지 않는 축은 색 하나다 — 창작자가 고른 색이 프리셋 하나에 사라지면 안 된다.
	//    자기 자신(preset)도 건드리지 않는다. 그 둘을 뺀 나머지는 전부 정한다.
	it('색과 자기 자신을 뺀 모든 컨트롤을 정한다', () => {
		const all = new Set<string>([...runtime.controller.left, ...runtime.controller.right])
		const expected = new Set([...all].filter((id) => id !== 'colorway' && id !== 'preset'))

		for (const preset of KEY_VISUAL_PATTERN_PRESETS) {
			const touched = (model.getRestrictions?.({ preset: preset.key })?.controls ?? []).map(
				(control) => control.controlId,
			)
			expect(new Set(touched), preset.key).toEqual(expected)
		}
	})

	// 사용자가 정한 구성이다 — 「입체 × 사선형」은 둘뿐이고 나머지는 방향·시점을 섞는다.
	it('입체 사선형은 둘뿐이고 방향·시점이 섞여 있다', () => {
		const combos = KEY_VISUAL_PATTERN_PRESETS.map(
			(preset) => `${preset.values.viewpoint}/${preset.values.direction}`,
		)

		expect(combos.filter((combo) => combo === 'perspective/diagonal')).toHaveLength(2)
		expect(new Set(KEY_VISUAL_PATTERN_PRESETS.map((p) => p.values.viewpoint)).size).toBe(2)
		expect(new Set(KEY_VISUAL_PATTERN_PRESETS.map((p) => p.values.direction)).size).toBe(3)
	})

	// 기준점이 중앙·꼭짓점에만 몰리지 않는다. 🔴 끝에서 두 칸 이내는 끝으로 스냅되므로 그 띠에
	//    올려 두면 지정한 자리에 안 선다 — 실제로 스냅된 자리까지 확인한다.
	it('기준점이 중앙과 끝에만 몰려 있지 않다', () => {
		const positions = KEY_VISUAL_PATTERN_PRESETS.map((preset) => preset.values.origin)
		const isCenter = (o: { x: number; y: number }) => o.x === 0.5 && o.y === 0.5
		const isCorner = (o: { x: number; y: number }) =>
			(o.x === 0 || o.x === 1) && (o.y === 0 || o.y === 1)

		expect(positions.filter((o) => !isCenter(o) && !isCorner(o)).length).toBeGreaterThanOrEqual(
			3,
		)

		const grid = axisPositions(createKeyVisualPatternScene(FLAT, BASE), 'x')
		const forbidden = new Set([1, 2, grid.length - 3, grid.length - 2])
		for (const origin of positions) {
			const scene = createKeyVisualPatternScene({ ...FLAT, origin }, BASE)
			const index = grid.findIndex((p) => Math.abs(p - scene.origin.x) < 1e-6)
			expect(forbidden.has(index), `origin.x=${origin.x} → 칸 ${index}`).toBe(false)
		}
	})

	// 시작 화면에서 보이는 프리셋과 실제 값이 어긋나면 안 된다.
	it('base 프리셋은 런타임 기본 입력과 같다', () => {
		const base = KEY_VISUAL_PATTERN_PRESETS[0]
		expect(base.key).toBe('base')
		for (const [key, value] of Object.entries(base.values)) {
			expect(
				KEY_VISUAL_PATTERN_DEFAULT_INPUT[
					key as keyof typeof KEY_VISUAL_PATTERN_DEFAULT_INPUT
				],
				key,
			).toEqual(value)
		}
	})

	it('선택지는 색도 썸네일도 없이 번호만 보여 준다', () => {
		const preset = controls.find((control) => control.id === 'preset')
		expect(runtime.controller.left).toContain('preset')
		expect(preset?.kind).toBe('select')
		const options = preset?.kind === 'select' ? preset.options : []
		expect(options.map((option) => option.label)).toEqual(['1', '2', '3', '4', '5', '6'])
		expect(options.every((option) => !option.colors && !option.preview)).toBe(true)
	})
})
