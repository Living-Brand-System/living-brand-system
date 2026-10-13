// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { orderTemplateLayers } from './template-layer-order'

const ids = (html: string) => Array.from(html.matchAll(/data-node-id="([^"]*)"/g), (m) => m[1])

describe('orderTemplateLayers', () => {
	it('형제를 배경 < 이미지 < 텍스트 < CI로 다시 쌓는다 — 서버에서도 돈다', () => {
		const html =
			'<div data-node-id="f">' +
			'<img data-node-id="ci" data-figma-type="VECTOR" src="/l.svg">' +
			'<p data-node-id="t">제목</p>' +
			'<div data-node-id="img" data-image-carrier=""></div>' +
			'<div data-node-id="f:bg" data-figma-type="BACKGROUND"></div>' +
			'</div>'
		expect(ids(orderTemplateLayers(html))).toEqual(['f', 'f:bg', 'img', 't', 'ci'])
	})

	it('같은 순위끼리는 원래 순서를 지키고, 이미 맞으면 받은 문자열을 그대로 돌려준다', () => {
		const html =
			'<div data-node-id="f">\n\t<p data-node-id="t1">가</p>\n\t<p data-node-id="t2">나</p>\n\t<img data-node-id="ci" data-figma-type="VECTOR" src="/l.svg">\n</div>'
		expect(orderTemplateLayers(html)).toBe(html)
	})

	it('묶음은 안의 가장 아래 순위를 따른다 — 묶음 속 이미지가 형제 텍스트를 덮지 않는다', () => {
		const html =
			'<div data-node-id="f">' +
			'<p data-node-id="t">글</p>' +
			'<div data-node-id="g" data-figma-type="GROUP"><div data-node-id="g-img"></div><p data-node-id="g-t">캡션</p></div>' +
			'</div>'
		expect(ids(orderTemplateLayers(html))).toEqual(['f', 'g', 'g-img', 'g-t', 't'])
	})
})
