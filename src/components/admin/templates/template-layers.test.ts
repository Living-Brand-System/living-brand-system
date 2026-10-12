import { describe, expect, it } from 'vitest'
import { hasLayerEditor, moveLayer, parseLayers } from './template-layers'

const html =
	'<div data-node-id="f" data-figma-type="FRAME">' +
	'<div data-node-id="f:bg" data-figma-type="BACKGROUND" data-name="bg"></div>' +
	'<div data-node-id="img" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
	'<p data-node-id="t">제목</p>' +
	'</div>'

describe('배경 레이어(admin)', () => {
	const rows = parseLayers(html)
	const row = (id: string) => rows.find((candidate) => candidate.id === id)

	it('고를 수 있다(이름 편집)', () => {
		expect(hasLayerEditor(row('f:bg') as never)).toBe(true)
	})

	it('배경은 옮길 수 없고, 배경과 자리를 바꾸는 이동도 없다 — 나머지는 자유롭다', () => {
		expect(moveLayer({}, rows, 'f:bg', 'up')).toBeNull()
		expect(moveLayer({}, rows, 'img', 'down')).toBeNull()
		expect(moveLayer({}, rows, 'img', 'up')).toEqual({
			f: { childOrder: ['f:bg', 't', 'img'] },
		})
	})
})
