// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VectorPrimitive, VectorScene } from '@/modules/studio-artifact/studio-artifact'
import { outlineVectorScene, translateOutlinePath } from './outline-vector-scene.client'

/** 서버는 baseline이 원점인 지역 좌표 path를 준다. 줄마다 같은 모양을 주면 이동만 보면 된다. */
function respond(runs: readonly ({ d: string; width: number } | 'failed')[]) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => ({
			ok: true,
			json: async () => ({
				runs: runs.map((run) =>
					run === 'failed'
						? { outlined: false, reason: 'unknown-font' }
						: { outlined: true, d: run.d, width: run.width, family: 'hd' },
				),
			}),
		})),
	)
}

const line = (text: string, y: number, fill = '#000000'): VectorPrimitive => ({
	kind: 'text',
	text,
	x: 10,
	y,
	fontFamily: 'HD',
	fontSize: 12,
	fill,
})

const scene = (children: VectorPrimitive[]): VectorScene => ({
	height: 100,
	primitives: [{ kind: 'group', label: 'Description', children }],
	width: 100,
})

const pathsOf = (result: VectorScene) => {
	const group = result.primitives[0]
	if (group.kind !== 'group') throw new Error('그룹이 아니다')
	return group.children
}

afterEach(() => {
	vi.unstubAllGlobals()
})

/**
 * 🔴 워커는 문단을 **렌더된 줄**로 쪼갠다. 그대로 두면 Illustrator에서 문단 하나가 줄 수만큼
 * 오브젝트로 열린다 — 실측(2026-09-11): poster의 Text 묶음이 문단 5개인데 8조각이었다.
 */
describe('문단 글줄 잇기', () => {
	it('연이은 글줄이 한 path가 되고 뒷줄이 그만큼 옮겨진다', async () => {
		respond([
			{ d: 'M0 0L10 0Z', width: 10 },
			{ d: 'M0 0L10 0Z', width: 10 },
		])

		const { scene: outlined } = await outlineVectorScene(
			scene([line('첫 줄', 20), line('둘째 줄', 32)]),
		)
		const paths = pathsOf(outlined)

		expect(paths).toHaveLength(1)
		// 첫 줄은 그대로, 둘째 줄은 baseline 차이(32-20=12)만큼 아래로.
		expect(paths[0]).toMatchObject({ kind: 'path', x: 10, y: 20, d: 'M0 0L10 0Z M0 12L10 12Z' })
	})

	/** 🔴 사이에 다른 것이 끼면 이으면 안 된다 — 이으면 그 요소가 문단 위아래로 뒤집힌다. */
	it('사이에 다른 도형이 끼면 잇지 않는다', async () => {
		respond([
			{ d: 'M0 0Z', width: 10 },
			{ d: 'M0 0Z', width: 10 },
		])
		const box: VectorPrimitive = { kind: 'rect', x: 0, y: 0, width: 5, height: 5, fill: '#fff' }

		const { scene: outlined } = await outlineVectorScene(
			scene([line('위', 20), box, line('아래', 32)]),
		)

		expect(pathsOf(outlined).map((primitive) => primitive.kind)).toEqual([
			'path',
			'rect',
			'path',
		])
	})

	it('칠이 다르면 잇지 않는다', async () => {
		respond([
			{ d: 'M0 0Z', width: 10 },
			{ d: 'M0 0Z', width: 10 },
		])

		const { scene: outlined } = await outlineVectorScene(
			scene([line('검정', 20), line('초록', 32, '#00AF41')]),
		)

		expect(pathsOf(outlined)).toHaveLength(2)
	})

	/** 🔴 굽지 못한 줄은 `text`로 남는다. 그것을 건너뛰고 앞뒤를 이으면 줄 순서가 무너진다. */
	it('굽지 못한 줄이 끼면 앞뒤를 잇지 않는다', async () => {
		respond([{ d: 'M0 0Z', width: 10 }, 'failed', { d: 'M0 0Z', width: 10 }])

		const { scene: outlined, notOutlined } = await outlineVectorScene(
			scene([line('위', 20), line('가운데', 32), line('아래', 44)]),
		)

		expect(pathsOf(outlined).map((primitive) => primitive.kind)).toEqual([
			'path',
			'text',
			'path',
		])
		expect(notOutlined).toHaveLength(1)
	})

	/** 가운데 정렬은 줄마다 폭이 달라 x가 달라진다 — 그 차이도 이동에 들어가야 한다. */
	it('가운데 정렬에서 줄 폭 차이만큼 가로로도 옮긴다', async () => {
		respond([
			{ d: 'M0 0Z', width: 20 },
			{ d: 'M0 0Z', width: 40 },
		])
		const centered = (y: number): VectorPrimitive => ({
			...(line('글', y) as Extract<VectorPrimitive, { kind: 'text' }>),
			textAnchor: 'middle',
		})

		const { scene: outlined } = await outlineVectorScene(scene([centered(20), centered(20)]))

		// 첫 줄 x = 10 - 10 = 0, 둘째 줄 x = 10 - 20 = -10 → 차이 -10.
		expect(pathsOf(outlined)[0]).toMatchObject({ x: 0, d: 'M0 0Z M-10 0Z' })
	})
})

describe('translateOutlinePath', () => {
	it('절대 좌표 M·L·C를 옮기고 Z는 건드리지 않는다', () => {
		expect(translateOutlinePath('M1 2L3 4C5 6 7 8 9 10Z', 100, 200)).toBe(
			'M101 202L103 204C105 206 107 208 109 210Z',
		)
	})

	it('이동이 없으면 원본 그대로다 — 반올림으로 값을 흔들지 않는다', () => {
		expect(translateOutlinePath('M1.005 2Z', 0, 0)).toBe('M1.005 2Z')
	})

	it('음수 좌표도 공백으로 끊긴다', () => {
		expect(translateOutlinePath('M-1 -2Z', -1, -2)).toBe('M-2 -4Z')
	})
})
