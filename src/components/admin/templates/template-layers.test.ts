import { describe, expect, it } from 'vitest'
import {
	applyImportedLayerDefaults,
	hasLayerEditor,
	moveLayer,
	parseLayers,
} from './template-layers'

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

describe('applyImportedLayerDefaults', () => {
	const imported =
		'<div data-node-id="f" data-figma-type="FRAME">' +
		'<div data-node-id="f:bg" data-figma-type="BACKGROUND" data-name="bg"></div>' +
		'<div data-node-id="img" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
		// 클립 프레임 안의 외동 이미지 — Admin은 프레임을 이미지 레이어로 본다.
		'<div data-node-id="clip" data-figma-type="FRAME" style="overflow:hidden"><div data-node-id="clip-img" data-image-carrier=""></div></div>' +
		'<p data-node-id="t1">제목</p><p data-node-id="t2">부제</p>' +
		'<img data-node-id="ci" data-figma-type="VECTOR" src="/l.svg">' +
		'</div>'

	it('텍스트·이미지·CI를 편집 가능으로 시작하고, 이미 정한 사용 상태와 배경·판은 건드리지 않는다', () => {
		expect(
			applyImportedLayerDefaults(imported, {
				t2: { creator: { access: 'readonly' }, label: '부' },
			}),
		).toEqual({
			img: { creator: { access: 'editable' }, imageInput: {} },
			clip: { creator: { access: 'editable' }, imageInput: {} },
			t1: { creator: { access: 'editable' }, input: {} },
			t2: { creator: { access: 'readonly' }, label: '부' },
			ci: { creator: { access: 'editable' } },
		})
	})
})
