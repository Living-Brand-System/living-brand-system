import { describe, expect, it } from 'vitest'
import { applyImportedLayerDefaults } from './imported-layer-defaults'

const html =
	'<div data-node-id="root" data-figma-type="FRAME">' +
	'<p data-node-id="t1" data-figma-type="TEXT">제목</p>' +
	'<p data-node-id="t2" data-figma-type="TEXT">부제</p>' +
	'<img data-node-id="ci" data-figma-type="VECTOR" data-asset-collection="brand-logos" data-asset-id="15" src="/a.svg">' +
	'<img data-node-id="deco" data-figma-type="VECTOR" data-asset-collection="application-images" data-asset-id="9" src="/b.svg">' +
	'</div>'

describe('applyImportedLayerDefaults', () => {
	it('텍스트와 CI만 편집 가능으로 시작하고, 이미 정한 사용 상태는 그대로 둔다', () => {
		expect(
			applyImportedLayerDefaults(html, {
				t2: { creator: { access: 'readonly' }, label: '부' },
			}),
		).toEqual({
			t1: { creator: { access: 'editable' }, input: {} },
			t2: { creator: { access: 'readonly' }, label: '부' },
			ci: { creator: { access: 'editable' } },
		})
	})
})
