import { describe, expect, it } from 'vitest'
import { moveLayer, parseLayers } from './template-layers'

/**
 * 겹침 순서를 바꾸는 유일한 함수 — 정본(`overrides.childOrder`)을 쓴다.
 * 🔴 방향은 **화면에서 보이는 방향**이다: `'up'` = 다른 레이어 **위로** = 문서에서 뒤로.
 */
describe('moveLayer', () => {
	const html =
		'<div data-node-id="root" data-figma-type="FRAME">' +
		'<p data-node-id="a" data-figma-type="TEXT">a</p>' +
		'<p data-node-id="b" data-figma-type="TEXT">b</p>' +
		'<p data-node-id="c" data-figma-type="TEXT">c</p>' +
		'</div>'
	const rows = parseLayers(html)

	it('위로 = 문서에서 뒤로 한 칸', () => {
		expect(moveLayer({}, rows, 'a', 'up')?.root?.childOrder).toEqual(['b', 'a', 'c'])
	})

	it('아래로 = 문서에서 앞으로 한 칸', () => {
		expect(moveLayer({}, rows, 'c', 'down')?.root?.childOrder).toEqual(['a', 'c', 'b'])
	})

	it('🔴 끝에 닿으면 null — 조용히 같은 값을 돌려주면 손잡이가 잠기지 않는다', () => {
		expect(moveLayer({}, rows, 'c', 'up')).toBeNull()
		expect(moveLayer({}, rows, 'a', 'down')).toBeNull()
	})

	it('🔴 루트(부모 없음)는 옮기지 않는다 — 형제가 없다', () => {
		expect(moveLayer({}, rows, 'root', 'up')).toBeNull()
		expect(moveLayer({}, rows, '없는-id', 'up')).toBeNull()
	})

	it('🔴 형제 전부를 적는다 — 부분만 적으면 안 건드린 자식이 compose에서 맨 위로 간다', () => {
		expect(moveLayer({}, rows, 'a', 'up')?.root?.childOrder).toHaveLength(3)
	})

	it('부모의 다른 설정과 형제의 설정을 보존한다', () => {
		const next = moveLayer(
			{ root: { visible: false }, a: { text: '지켜져야 한다' } },
			rows,
			'a',
			'up',
		)

		expect(next?.root?.visible).toBe(false)
		expect(next?.a?.text).toBe('지켜져야 한다')
	})

	it('다른 부모의 형제는 섞이지 않는다', () => {
		const nested = parseLayers(
			'<div data-node-id="root" data-figma-type="FRAME">' +
				'<p data-node-id="a" data-figma-type="TEXT">a</p>' +
				'<div data-node-id="group" data-figma-type="GROUP">' +
				'<p data-node-id="x" data-figma-type="TEXT">x</p>' +
				'<p data-node-id="y" data-figma-type="TEXT">y</p>' +
				'</div>' +
				'</div>',
		)
		const next = moveLayer({}, nested, 'x', 'up')

		expect(next?.group?.childOrder).toEqual(['y', 'x'])
		expect(next?.root?.childOrder).toBeUndefined()
	})
})
