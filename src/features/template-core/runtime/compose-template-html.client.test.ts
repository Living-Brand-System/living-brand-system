import { describe, expect, it } from 'vitest'
import { composeTemplateHtml, formatImageEditTransform } from './compose-template-html.client'

const baseHtml =
	'<img data-node-id="vector-1" data-figma-type="VECTOR" src="/api/template-assets/file/original.svg" style="width:120px;height:40px">'

describe('composeTemplateHtml vector override', () => {
	it('인가 자산·contain·브랜드 컬러를 벡터에 함께 적용한다', () => {
		const html = composeTemplateHtml(baseHtml, {
			'vector-1': {
				vectorAsset: {
					collection: 'brand-logos',
					id: 7,
					src: '/api/brand-logos/file/logo.svg',
				},
				vectorFit: 'contain',
				vectorColor: '#112233',
			},
		})
		const element = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild

		expect(element?.tagName).toBe('DIV')
		expect(element?.getAttribute('data-asset-collection')).toBe('brand-logos')
		expect(element?.getAttribute('data-asset-id')).toBe('7')
		expect((element as HTMLElement).style.maskImage).toContain('/api/brand-logos/file/logo.svg')
		expect((element as HTMLElement).style.maskSize).toBe('contain')
		expect((element as HTMLElement).style.backgroundColor).toBe('rgb(17, 34, 51)')
	})

	it('색상이 없으면 img와 fill 맞춤을 유지한다', () => {
		const html = composeTemplateHtml(baseHtml, {
			'vector-1': { vectorFit: 'fill' },
		})
		const image = new DOMParser().parseFromString(html, 'text/html').querySelector('img')

		expect(image?.style.objectFit).toBe('fill')
	})

	it('vectorFit이 없으면 objectFit을 기록하지 않는다 — base의 맞춤 유지', () => {
		const html = composeTemplateHtml(baseHtml, {
			'vector-1': {
				vectorAsset: {
					collection: 'brand-logos',
					id: 7,
					src: '/api/brand-logos/file/logo.svg',
				},
			},
		})
		const image = new DOMParser().parseFromString(html, 'text/html').querySelector('img')

		expect(image?.style.objectFit).toBe('')
	})
})

describe('composeTemplateHtml text color override', () => {
	const textHtml =
		'<p data-node-id="text-1" style="color:#1a1a1a;font-size:20px">FUTURE BUILDER</p>'

	it('color 오버라이드가 텍스트 노드의 inline color를 덮는다', () => {
		const html = composeTemplateHtml(textHtml, { 'text-1': { color: '#ff0000' } })
		const p = new DOMParser().parseFromString(html, 'text/html').querySelector('p')

		expect(p?.style.color).toBe('rgb(255, 0, 0)')
		expect(p?.style.fontSize).toBe('20px') // 다른 스타일은 보존
	})

	it('color가 없으면 base의 색을 유지한다', () => {
		const html = composeTemplateHtml(textHtml, { 'text-1': { text: 'NEW' } })
		const p = new DOMParser().parseFromString(html, 'text/html').querySelector('p')

		expect(p?.style.color).toBe('rgb(26, 26, 26)')
		expect(p?.textContent).toBe('NEW')
	})

	it('color 오버라이드는 텍스트 노드(<p>)가 아니면 아무것도 바꾸지 않는다', () => {
		const html = composeTemplateHtml(
			'<div data-node-id="frame-1" style="color:#111111"></div>',
			{ 'frame-1': { color: '#ff0000' } },
		)
		const frame = new DOMParser().parseFromString(html, 'text/html').querySelector('div')

		expect(frame?.style.color).toBe('rgb(17, 17, 17)')
	})
})

describe('composeTemplateHtml image carrier', () => {
	const generated = '/api/generated-images/file/gen.png'

	it('캐리어 div의 이미지만 갈아끼우고 background-size·position을 보존한다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' style="background-image:url(/api/application-images/file/ph.png);background-size:contain;background-position:left top;background-repeat:no-repeat"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': { backgroundImage: generated, generatedImageId: 9 },
		})
		const doc = new DOMParser().parseFromString(html, 'text/html')
		const frame = doc.querySelector('[data-node-id="frame-1"]') as HTMLElement
		const carrier = doc.querySelector('[data-image-carrier]') as HTMLElement

		expect(frame.style.backgroundImage).toBe('')
		expect(carrier.style.backgroundImage).toContain(generated)
		expect(carrier.style.backgroundSize).toBe('contain')
		expect(carrier.style.backgroundPosition).toBe('left top')
		// 발행 검증이 요소의 data-asset-*와 URL 일치를 요구하므로 생성 이미지 참조로 바뀐다.
		expect(carrier.getAttribute('data-asset-collection')).toBe('generated-images')
		expect(carrier.getAttribute('data-asset-id')).toBe('9')
	})

	it('세션이 실은 assetRef로 캐리어의 자산 참조를 바꾼다', () => {
		const sample = '/api/sample-images/file/submarine.png'
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' style="background-image:url(/api/application-images/file/ph.png)"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: sample,
				assetRef: { collection: 'sample-images', id: 12 },
			},
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement

		expect(carrier.style.backgroundImage).toContain(sample)
		expect(carrier.getAttribute('data-asset-collection')).toBe('sample-images')
		expect(carrier.getAttribute('data-asset-id')).toBe('12')
	})

	it('요소 자신이 캐리어면(사각형 직접 선택) 그 요소에서 교체·재바인딩한다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' style="background-image:url(/api/application-images/file/ph.png);background-size:contain"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'rect-1': { backgroundImage: generated, generatedImageId: 9 },
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="rect-1"]') as HTMLElement

		expect(carrier.style.backgroundImage).toContain(generated)
		expect(carrier.style.backgroundSize).toBe('contain')
		expect(carrier.getAttribute('data-asset-collection')).toBe('generated-images')
		expect(carrier.getAttribute('data-asset-id')).toBe('9')
	})

	it('스탠드얼론 이미지 fill 사각형(자기 캐리어)도 생성 이미지 참조로 재바인딩한다', () => {
		// 임포트가 자식 없는 이미지 fill 노드를 자기 캐리어로 마킹한다 — 프레임 없이도 통일 경로.
		const html = composeTemplateHtml(
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
				' data-asset-collection="application-images" data-asset-id="3"' +
				' style="background-image:url(/api/application-images/file/ph.png)"></div>',
			{ 'rect-1': { backgroundImage: generated, generatedImageId: 9 } },
		)
		const rect = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="rect-1"]') as HTMLElement

		expect(rect.style.backgroundImage).toContain(generated)
		expect(rect.getAttribute('data-asset-collection')).toBe('generated-images')
		expect(rect.getAttribute('data-asset-id')).toBe('9')
	})

	it('배경 스타일이 없는 캐리어 div에는 cover·center 기본값을 준다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, { 'frame-1': { backgroundImage: generated } })
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement

		expect(carrier.style.backgroundSize).toBe('cover')
		expect(carrier.style.backgroundPosition).toBe('center center')
	})

	it('캐리어 img는 src를 갈아끼운다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<img data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' src="/api/application-images/file/baked.png" alt="">' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': { backgroundImage: generated, generatedImageId: 9 },
		})
		const image = new DOMParser().parseFromString(html, 'text/html').querySelector('img')

		expect(image?.getAttribute('src')).toBe(generated)
		expect(image?.getAttribute('data-asset-id')).toBe('9')
	})

	it('imageColorize가 캐리어 div를 luminance 마스크 2겹으로 재구성한다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' style="background-image:url(/api/application-images/file/ph.png);background-size:contain;background-position:left top;background-repeat:no-repeat"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				generatedImageId: 9,
				imageColorize: { line: '#112233', background: '#aabbcc' },
			},
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement
		const overlay = carrier.firstElementChild as HTMLElement

		// 바닥(캐리어) = 라인색. 이미지 URL과 에셋 참조는 마스크를 가진 오버레이로 옮겨진다.
		expect(carrier.style.backgroundImage).toBe('')
		expect(carrier.style.backgroundColor).toBe('rgb(17, 34, 51)')
		expect(carrier.hasAttribute('data-asset-collection')).toBe(false)
		expect(carrier.hasAttribute('data-asset-id')).toBe(false)
		// 오버레이 = 배경색 + 생성 이미지 luminance 마스크. 프레이밍은 기존 background-*를 물려받는다.
		expect(overlay.getAttribute('data-node-id')).toBe('rect-1-colorize')
		expect(overlay.style.backgroundColor).toBe('rgb(170, 187, 204)')
		expect(overlay.style.maskImage).toContain(generated)
		expect(overlay.style.getPropertyValue('mask-mode')).toBe('luminance')
		expect(overlay.style.maskSize).toBe('contain')
		expect(overlay.style.maskPosition).toBe('left top')
		expect(overlay.getAttribute('data-asset-collection')).toBe('generated-images')
		expect(overlay.getAttribute('data-asset-id')).toBe('9')
	})

	it('imageColorize와 imageTransform이 함께 적용된다 — transform은 캐리어, 마스크는 자식', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				imageColorize: { line: '#112233', background: '#aabbcc' },
				imageTransform: { x: 12, y: -30, scale: 1.5, rotate: 15 },
			},
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement

		expect(carrier.style.transform).toBe('translate(12px, -30px) scale(1.5) rotate(15deg)')
		expect((carrier.firstElementChild as HTMLElement).style.maskImage).toContain(generated)
	})

	it('background 생략 시 단일 레이어 반전 마스크 — 배경은 칠하지 않고 선만 line 색', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden;background-color:rgb(255,255,255)">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' style="background-size:contain"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': { backgroundImage: generated, imageColorize: { line: '#112233' } },
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement
		const overlay = carrier.firstElementChild as HTMLElement

		// 바닥은 아무것도 칠하지 않는다 — 배경이 투명해야 캔버스가 그대로 비친다.
		expect(carrier.style.backgroundColor).toBe('')
		// 오버레이 = line 색 + 반전 마스크(백색 기준층에서 이미지 luminance를 빼 선만 불투명).
		expect(overlay.style.backgroundColor).toBe('rgb(17, 34, 51)')
		expect(overlay.style.maskImage).toContain('linear-gradient')
		expect(overlay.style.maskImage).toContain(generated)
		expect(overlay.style.getPropertyValue('mask-mode')).toBe('alpha, luminance')
		expect(overlay.style.getPropertyValue('mask-composite')).toBe('subtract')
		// 기준층은 4px 인셋(가장자리 AA 잔선 방지), 이미지 레이어는 기존 background-size 승계.
		expect(overlay.style.maskSize).toBe('calc(100% - 4px) calc(100% - 4px), contain')
	})

	it('부모 clip 프레임의 fill을 투명화한다 — 캐리어가 못 덮는 노출 영역으로 새는 것 방지', () => {
		const frameHtml =
			'<div data-node-id="root-1" data-figma-type="FRAME" style="background-color:rgb(0,40,10)">' +
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden;background-color:rgb(255,255,255)">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				imageColorize: { line: '#112233', background: '#aabbcc' },
			},
		})
		const frame = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="frame-1"]') as HTMLElement

		expect(frame.style.backgroundColor).toBe('transparent')
	})

	it('캐리어에 형제가 있으면 프레임 fill을 투명화하지 않는다 — 형제 콘텐츠의 배경 보존', () => {
		const frameHtml =
			'<div data-node-id="root-1" data-figma-type="FRAME" style="background-color:rgb(0,40,10)">' +
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden;background-color:rgb(255,255,255)">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'<p data-node-id="caption-1" data-figma-type="TEXT">캡션</p>' +
			'</div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				imageColorize: { line: '#112233', background: '#aabbcc' },
			},
		})
		const frame = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="frame-1"]') as HTMLElement

		expect(frame.style.backgroundColor).toBe('rgb(255, 255, 255)')
	})

	it('프레임에 url( 배경이 있으면 fill을 건드리지 않는다', () => {
		const frameHtml =
			'<div data-node-id="root-1" data-figma-type="FRAME" style="background-color:rgb(0,40,10)">' +
			'<div data-node-id="frame-1" data-figma-type="FRAME"' +
			' style="overflow:hidden;background-image:url(/api/application-images/file/bg.png);background-color:rgb(255,255,255)">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': { backgroundImage: generated, imageColorize: { line: '#112233' } },
		})
		const frame = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="frame-1"]') as HTMLElement

		expect(frame.style.backgroundColor).toBe('rgb(255, 255, 255)')
	})

	it('프레임이 템플릿 루트(캔버스)면 fill을 건드리지 않는다', () => {
		const frameHtml =
			'<div data-node-id="root-1" data-figma-type="FRAME" style="overflow:hidden;background-color:rgb(0,40,10)">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'root-1': { backgroundImage: generated, imageColorize: { line: '#112233' } },
		})
		const root = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="root-1"]') as HTMLElement

		expect(root.style.backgroundColor).toBe('rgb(0, 40, 10)')
	})

	it('imageColorize가 없으면 캐리어에 오버레이를 만들지 않는다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': { backgroundImage: generated, generatedImageId: 9 },
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement

		expect(carrier.childElementCount).toBe(0)
		expect(carrier.style.backgroundImage).toContain(generated)
	})

	it('캐리어 img는 imageColorize 시 vectorColor처럼 div 2겹으로 치환된다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<img data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' src="/api/application-images/file/baked.png" alt="" style="width:100px;height:80px">' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				generatedImageId: 9,
				imageColorize: { line: '#112233', background: '#aabbcc' },
			},
		})
		const doc = new DOMParser().parseFromString(html, 'text/html')
		const carrier = doc.querySelector('[data-image-carrier]') as HTMLElement
		const overlay = carrier.firstElementChild as HTMLElement

		expect(doc.querySelector('img')).toBeNull()
		expect(carrier.tagName).toBe('DIV')
		expect(carrier.style.width).toBe('100px') // img의 박스 스타일 승계
		expect(carrier.style.backgroundColor).toBe('rgb(17, 34, 51)')
		expect(overlay.style.maskImage).toContain(generated)
		expect(overlay.style.maskSize).toBe('100% 100%') // img 기본 fill 상당
		expect(overlay.getAttribute('data-asset-collection')).toBe('generated-images')
		expect(overlay.getAttribute('data-asset-id')).toBe('9')
	})

	it('교체 이미지가 없어도 기존 캐리어 이미지에 colorize를 적용한다', () => {
		const existing = '/api/application-images/file/line-art.png'
		const base =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			`<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier="" style="background-image:url(${existing})"></div>` +
			'</div>'
		const html = composeTemplateHtml(base, {
			'frame-1': { imageColorize: { line: '#112233' } },
		})
		const overlay = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="rect-1-colorize"]') as HTMLElement

		expect(overlay.style.maskImage).toContain(existing)
		expect(overlay.style.backgroundColor).toBe('rgb(17, 34, 51)')
	})

	it('이미 colorize된 canonical 이미지도 URL과 에셋 참조를 보존해 다시 칠한다', () => {
		const existing = '/api/application-images/file/line-art.png'
		const base =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			`<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier="" data-asset-collection="application-images" data-asset-id="3" style="background-image:url(${existing})"></div>` +
			'</div>'
		const canonical = composeTemplateHtml(base, {
			'frame-1': { imageColorize: { line: '#112233' } },
		})
		const recolored = composeTemplateHtml(canonical, {
			'frame-1': { imageColorize: { line: '#445566' } },
		})
		const overlay = new DOMParser()
			.parseFromString(recolored, 'text/html')
			.querySelector('[data-node-id="rect-1-colorize"]') as HTMLElement

		expect(overlay.style.maskImage).toContain(existing)
		expect(overlay.style.backgroundColor).toBe('rgb(68, 85, 102)')
		expect(overlay.dataset.assetCollection).toBe('application-images')
		expect(overlay.dataset.assetId).toBe('3')
	})

	it('레이어 visible=false는 합성 미리보기와 export HTML에서 같은 노드를 숨긴다', () => {
		const html = composeTemplateHtml(
			'<p data-node-id="text-1" data-figma-type="TEXT">문구</p>',
			{ 'text-1': { visible: false } },
		)
		const text = new DOMParser().parseFromString(html, 'text/html').querySelector('p')

		expect(text?.getAttribute('style')).toContain('display: none')
	})

	it('formatImageEditTransform이 compose가 쓰는 문자열과 같은 포맷을 만든다 — 오버레이의 prefix strip 계약', () => {
		expect(formatImageEditTransform({ x: 12, y: -30, scale: 1.5, rotate: 15 })).toBe(
			'translate(12px, -30px) scale(1.5) rotate(15deg)',
		)
	})

	it('imageTransform을 캐리어의 transform으로 적용한다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				imageTransform: { x: 12, y: -30, scale: 1.5, rotate: 15 },
			},
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement

		expect(carrier.style.transform).toBe('translate(12px, -30px) scale(1.5) rotate(15deg)')
	})

	it('캐리어의 기존 base transform 앞에 편집 transform을 붙여 보존한다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' style="transform:rotate(-10deg)"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				imageTransform: { x: 5, y: 0, scale: 2, rotate: 0 },
			},
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement

		expect(carrier.style.transform).toBe(
			'translate(5px, 0px) scale(2) rotate(0deg) rotate(-10deg)',
		)
	})

	it('identity imageTransform은 아무것도 쓰지 않는다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				imageTransform: { x: 0, y: 0, scale: 1, rotate: 0 },
			},
		})
		const carrier = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement

		expect(carrier.style.transform).toBe('')
	})

	it('자기 캐리어 래스터 img는 배경을 칠하지 않고 src를 갈아끼운다', () => {
		// 임포트가 래스터 폴백 img(비벡터)를 자기 캐리어로 마킹한다 — 형제가 있어도 통일 경로.
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME">' +
			'<img data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="5"' +
			' src="/api/application-images/file/baked.png" alt="">' +
			'<div data-node-id="deco-1" data-figma-type="RECTANGLE"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'rect-1': { backgroundImage: generated, generatedImageId: 9 },
		})
		const image = new DOMParser().parseFromString(html, 'text/html').querySelector('img')

		expect(image?.getAttribute('src')).toBe(generated)
		expect(image?.getAttribute('data-asset-collection')).toBe('generated-images')
		expect(image?.getAttribute('data-asset-id')).toBe('9')
		expect(image?.style.backgroundImage).toBe('')
	})

	it('손자 캐리어는 무시된다 — 탐색은 자신·직계 자식만, 프레임 배경으로도 흘리지 않는다', () => {
		const frameHtml =
			'<div data-node-id="wrap-1" data-figma-type="FRAME">' +
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' style="background-image:url(/api/application-images/file/ph.png)"></div>' +
			'</div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, { 'wrap-1': { backgroundImage: generated } })
		const doc = new DOMParser().parseFromString(html, 'text/html')
		const wrap = doc.querySelector('[data-node-id="wrap-1"]') as HTMLElement
		const carrier = doc.querySelector('[data-image-carrier]') as HTMLElement

		// 손자 캐리어는 건드리지 않는다 — 생산자(자신·직계 자식만 마킹)와 소비자의 탐색 범위 일치.
		expect(carrier.style.backgroundImage).toContain('ph.png')
		expect(wrap.style.backgroundImage).toBe('')
	})

	it('colorize 합성 결과를 다시 compose해도 오버레이는 1개 — 마스크·에셋 참조가 새 이미지를 가리킨다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' style="background-image:url(/api/application-images/file/ph.png)"></div>' +
			'</div>'
		const first = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				generatedImageId: 9,
				imageColorize: { line: '#112233' },
			},
		})
		const replaced = '/api/generated-images/file/gen2.png'
		const html = composeTemplateHtml(first, {
			'frame-1': {
				backgroundImage: replaced,
				generatedImageId: 10,
				imageColorize: { line: '#112233' },
			},
		})
		const doc = new DOMParser().parseFromString(html, 'text/html')
		const overlays = doc.querySelectorAll('[data-node-id="rect-1-colorize"]')
		const overlay = overlays[0] as HTMLElement

		expect(overlays.length).toBe(1)
		expect(overlay.style.maskImage).toContain(replaced)
		expect(overlay.style.maskImage).not.toContain(generated)
		expect(overlay.getAttribute('data-asset-collection')).toBe('generated-images')
		expect(overlay.getAttribute('data-asset-id')).toBe('10')
	})

	it('마킹된 직계 자식이 2개면 프레임 키 배정은 아무것도 바꾸지 않는다 — 추측하지 않는다', () => {
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' style="background-image:url(/api/application-images/file/a.png)"></div>' +
			'<div data-node-id="rect-2" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' style="background-image:url(/api/application-images/file/b.png)"></div>' +
			'</div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': { backgroundImage: generated, generatedImageId: 9 },
		})
		const doc = new DOMParser().parseFromString(html, 'text/html')

		expect(doc.body.innerHTML).not.toContain(generated)
		for (const id of ['rect-1', 'rect-2']) {
			const carrier = doc.querySelector(`[data-node-id="${id}"]`) as HTMLElement
			expect(carrier.getAttribute('data-asset-collection')).toBeNull()
		}
	})

	it('재합성 멱등성 — transform 없는 config는 published 출력에 다시 적용해도 같다', () => {
		// B-1 검증 겸함: colorize가 캐리어 프레이밍을 지우지 않아 2차 compose의 마스크가 원본
		// background-size/position을 그대로 물려받는다. imageTransform은 설계상 비멱등이라 뺀다.
		const base =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden;background-color:rgb(255,255,255)">' +
			'<div data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' style="background-image:url(/api/application-images/file/ph.png);background-size:contain;background-position:left top"></div>' +
			'</div>' +
			'<p data-node-id="text-1" data-figma-type="TEXT">원본</p>'
		const config = {
			'frame-1': {
				backgroundImage: generated,
				generatedImageId: 9,
				imageColorize: { line: '#112233' },
			},
			'text-1': { text: '바뀐 문구' },
		}
		const once = composeTemplateHtml(base, config)

		expect(composeTemplateHtml(once, config)).toBe(once)
		// 프레이밍 보존 확인 — 마스크가 cover/center 기본값으로 강등되지 않는다.
		const overlay = new DOMParser()
			.parseFromString(once, 'text/html')
			.querySelector('[data-node-id="rect-1-colorize"]') as HTMLElement
		expect(overlay.style.maskSize).toContain('contain')
		expect(overlay.style.maskPosition).toContain('left top')
	})

	it('재합성 멱등성 — img 캐리어도 published 출력에 다시 적용해도 같다', () => {
		// 1차에서 img→div 치환이 프레이밍('100% 100%'/center/no-repeat)을 명시 고정하므로
		// 2차 배정 분기의 "없을 때만 기본값" 가드가 이 값을 보존해 maskSize가 cover로 드리프트하지 않는다.
		const base =
			'<div data-node-id="root-1" data-figma-type="FRAME" style="background-color:rgb(0,40,10)">' +
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="overflow:hidden;background-color:rgb(255,255,255)">' +
			'<img data-node-id="rect-1" data-figma-type="RECTANGLE" data-image-carrier=""' +
			' data-asset-collection="application-images" data-asset-id="3"' +
			' src="/api/application-images/file/baked.png" alt="" style="width:100px;height:80px">' +
			'</div>' +
			'</div>'
		const config = {
			'frame-1': {
				backgroundImage: generated,
				generatedImageId: 9,
				imageColorize: { line: '#112233' },
			},
		}
		const once = composeTemplateHtml(base, config)

		expect(composeTemplateHtml(once, config)).toBe(once)
		// 치환 div에 img 렌더 상당 프레이밍이 명시돼 있어야 2차 배정이 cover로 덮지 않는다.
		const carrier = new DOMParser()
			.parseFromString(once, 'text/html')
			.querySelector('[data-image-carrier]') as HTMLElement
		expect(carrier.style.backgroundSize).toBe('100% 100%')
	})

	it('캐리어 없는 노드의 backgroundImage는 무시된다 — 원본 그대로', () => {
		// 이미지 배정은 캐리어 전용 계약 — 임포트가 마킹하지 않은 노드(구 임포트 산출물 포함)에는
		// 배경도, transform도, 에셋 참조도 쓰지 않는다.
		const frameHtml =
			'<div data-node-id="frame-1" data-figma-type="FRAME" style="background:rgb(0,40,10)"></div>'
		const html = composeTemplateHtml(frameHtml, {
			'frame-1': {
				backgroundImage: generated,
				generatedImageId: 9,
				imageTransform: { x: 12, y: 0, scale: 1.5, rotate: 15 },
			},
		})
		const frame = new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="frame-1"]') as HTMLElement

		expect(frame.style.backgroundImage).not.toContain(generated)
		expect(frame.style.backgroundColor).toBe('rgb(0, 40, 10)')
		expect(frame.style.transform).toBe('')
		expect(frame.getAttribute('data-asset-collection')).toBeNull()
	})
})

describe('composeTemplateHtml canvas background', () => {
	// 루트 프레임(body 직계 자식) + 자식 프레임 — 배경이 루트에만 얹히는지 구분하기 위해 두 겹이다.
	const canvasHtml =
		'<div data-node-id="root-1" data-figma-type="FRAME" style="width:400px;height:300px;background-color:rgb(0,40,10)">' +
		'<div data-node-id="frame-1" data-figma-type="FRAME" style="width:100px;height:80px"></div>' +
		'</div>'
	const generatedBackground = '/api/generated-images/file/canvas.png'

	const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')
	const rootOf = (html: string) => parse(html).body.firstElementChild as HTMLElement
	const childOf = (html: string) =>
		parse(html).querySelector('[data-node-id="frame-1"]') as HTMLElement

	it('색만 주면 루트 프레임의 배경색만 덮는다', () => {
		const html = composeTemplateHtml(canvasHtml, {}, { canvasBackground: { color: '#ff0000' } })

		expect(rootOf(html).style.backgroundColor).toBe('rgb(255, 0, 0)')
		expect(rootOf(html).style.backgroundImage).toBe('')
		// 자식 프레임은 건드리지 않는다 — 배경의 주소는 캔버스뿐이다.
		expect(childOf(html).style.backgroundColor).toBe('')
	})

	it('이미지만 주면 cover·center·no-repeat로 루트에 깐다', () => {
		const html = composeTemplateHtml(
			canvasHtml,
			{},
			{ canvasBackground: { imageUrl: generatedBackground } },
		)
		const root = rootOf(html)

		expect(root.style.backgroundImage).toBe(`url("${generatedBackground}")`)
		expect(root.style.backgroundSize).toBe('cover')
		expect(root.style.backgroundPosition).toBe('center center') // CSSOM 정규화 표기
		expect(root.style.backgroundRepeat).toBe('no-repeat')
		// 저작 배경색은 남는다 — 이미지 갈래는 색을 지우지 않는다.
		expect(root.style.backgroundColor).toBe('rgb(0, 40, 10)')
	})

	it('색과 이미지를 함께 주면 둘 다 얹힌다', () => {
		const html = composeTemplateHtml(
			canvasHtml,
			{},
			{ canvasBackground: { color: '#ffffff', imageUrl: generatedBackground } },
		)
		const root = rootOf(html)

		expect(root.style.backgroundColor).toBe('rgb(255, 255, 255)')
		expect(root.style.backgroundImage).toBe(`url("${generatedBackground}")`)
	})

	it('clear를 주면 루트의 기존 배경 선언을 모두 비운다', () => {
		const html = composeTemplateHtml(canvasHtml, {}, { canvasBackground: { clear: true } })
		const root = rootOf(html)

		expect(root.style.background).toBe('transparent')
		expect(root.style.backgroundImage).toBe('none')
	})

	const dimmerOf = (html: string) => rootOf(html).querySelector('[data-canvas-dimmer]')

	it('디머는 루트의 첫 자식으로 들어가 전면을 덮는다 — 배경 위, 콘텐츠 아래', () => {
		const html = composeTemplateHtml(canvasHtml, {}, { canvasBackground: { dimmer: 0.2 } })
		const root = rootOf(html)
		// 첫 자식이어야 뒤따르는 텍스트·로고가 그 위에 그려진다.
		const dimmer = root.firstElementChild as HTMLElement
		expect(dimmer.hasAttribute('data-canvas-dimmer')).toBe(true)
		expect(dimmer.style.backgroundColor).toBe('rgba(0, 0, 0, 0.2)')
		expect(dimmer.style.position).toBe('absolute')
		expect(dimmer.style.width).toBe('100%')
		expect(dimmer.style.height).toBe('100%')
		// 편집면의 클릭을 가로채면 슬롯을 고를 수 없다.
		expect(dimmer.style.pointerEvents).toBe('none')
		// 루트가 static이면 디머가 조상 기준으로 퍼진다.
		expect(root.style.position).toBe('relative')
		// 저작 배경색은 그대로 남고 디머가 그 위에 얹힌다.
		expect(root.style.backgroundColor).toBe('rgb(0, 40, 10)')
	})

	it('배경 형식과 무관하게 얹힌다 — color·image·graphic(clear) 모두', () => {
		for (const background of [
			{ color: '#ffffff', dimmer: 0.3 },
			{ imageUrl: generatedBackground, dimmer: 0.3 },
			{ clear: true, dimmer: 0.3 },
		]) {
			const html = composeTemplateHtml(canvasHtml, {}, { canvasBackground: background })
			expect(dimmerOf(html)).not.toBeNull()
		}
	})

	it('재합성이 멱등이다 — 디머가 쌓이지 않는다', () => {
		const once = composeTemplateHtml(canvasHtml, {}, { canvasBackground: { dimmer: 0.2 } })
		const twice = composeTemplateHtml(once, {}, { canvasBackground: { dimmer: 0.2 } })

		expect(twice).toBe(once)
		expect(rootOf(twice).querySelectorAll('[data-canvas-dimmer]')).toHaveLength(1)
	})

	it('디머를 주지 않은 재합성은 이미 깔린 디머를 지우지 않는다', () => {
		// graphic 래스터 경로가 캡처한 프레임을 얹으려 합성 HTML을 한 번 더 통과시킨다.
		const dimmed = composeTemplateHtml(canvasHtml, {}, { canvasBackground: { dimmer: 0.2 } })
		const withFrame = composeTemplateHtml(
			dimmed,
			{},
			{ canvasBackground: { imageUrl: generatedBackground } },
		)

		expect(dimmerOf(withFrame)).not.toBeNull()
	})

	it('0과 범위 밖 값을 자른다 — 세션 값이 그대로 흘러오는 자리다', () => {
		expect(
			dimmerOf(composeTemplateHtml(canvasHtml, {}, { canvasBackground: { dimmer: 0 } })),
		).toBeNull()
		expect(
			dimmerOf(composeTemplateHtml(canvasHtml, {}, { canvasBackground: { dimmer: -1 } })),
		).toBeNull()
		const over = composeTemplateHtml(canvasHtml, {}, { canvasBackground: { dimmer: 5 } })
		expect((dimmerOf(over) as HTMLElement).style.backgroundColor).toBe('rgb(0, 0, 0)')
	})

	it('디머 0은 이미 깔린 디머를 걷어낸다 — 창작자가 껐을 때', () => {
		const dimmed = composeTemplateHtml(canvasHtml, {}, { canvasBackground: { dimmer: 0.2 } })

		expect(
			dimmerOf(composeTemplateHtml(dimmed, {}, { canvasBackground: { dimmer: 0 } })),
		).toBeNull()
	})

	it('배경 인자를 주지 않으면 출력이 base 그대로다 — 기존 호출부 무영향', () => {
		expect(composeTemplateHtml(canvasHtml, {})).toBe(canvasHtml)
		expect(composeTemplateHtml(canvasHtml, {}, {})).toBe(canvasHtml)
		expect(composeTemplateHtml(canvasHtml, {}, { canvasBackground: {} })).toBe(canvasHtml)
	})

	it('노드 오버라이드와 함께 흘러도 서로를 밀어내지 않는다', () => {
		const html = composeTemplateHtml(
			'<div data-node-id="root-1" data-figma-type="FRAME">' +
				'<p data-node-id="text-1" data-figma-type="TEXT">원본</p>' +
				'</div>',
			{ 'text-1': { text: '바뀐 문구' } },
			{ canvasBackground: { color: '#123456' } },
		)

		expect(rootOf(html).style.backgroundColor).toBe('rgb(18, 52, 86)')
		expect(parse(html).querySelector('p')?.textContent).toBe('바뀐 문구')
	})

	it('재합성 멱등성 — 같은 배경을 출력에 다시 적용해도 같다', () => {
		const background = { color: '#ffffff', imageUrl: generatedBackground }
		const once = composeTemplateHtml(canvasHtml, {}, { canvasBackground: background })

		expect(composeTemplateHtml(once, {}, { canvasBackground: background })).toBe(once)
	})
})

/**
 * 레이어 겹침 순서의 정본은 **Admin의 `childOrder`** 이고, compose가 그것으로 DOM을 재배치한다
 * (사용자 결정, 2026-09-10).
 *
 * 🔴 z-index를 쓰지 않는 이유를 이 테스트가 지킨다: 벡터 내보내기가 DOM 순서로만 걷고
 *    z-index를 읽지 않으므로(`template-dom-to-vector-scene.client.ts`), 정본이 DOM 순서 하나여야
 *    화면과 PDF·SVG가 갈리지 않는다.
 */
describe('composeTemplateHtml childOrder', () => {
	const frame = (...ids: string[]) =>
		`<div data-node-id="root" data-figma-type="FRAME">${ids
			.map((id) => `<p data-node-id="${id}" data-figma-type="TEXT">${id}</p>`)
			.join('')}</div>`

	const idsOf = (html: string) =>
		Array.from(
			new DOMParser()
				.parseFromString(html, 'text/html')
				.querySelectorAll('[data-node-id="root"] > *'),
			(child) => child.getAttribute('data-node-id'),
		)

	it('나열한 순서대로 형제를 재배치한다 — 문서 순서가 곧 그리는 순서다', () => {
		const html = composeTemplateHtml(frame('a', 'b', 'c'), {
			root: { childOrder: ['c', 'b', 'a'] },
		})

		expect(idsOf(html)).toEqual(['c', 'b', 'a'])
	})

	/**
	 * 🔴 재import로 생긴 노드가 **Figma가 놓은 자리에 그대로 남는다.** 목록 끝으로 쓸어 보내면
	 * 그 노드가 다른 레이어에 가려지거나 위를 덮는다 — 어느 쪽이든 디자이너 의도가 아니다.
	 * 「초안은 Figma, 수정은 Admin」(사용자, 2026-09-10)이 이 규칙이다.
	 */
	it('목록에 없는 자식은 제 자리를 지킨다 — 이름 댄 것들의 자리에만 순서를 채운다', () => {
		// a·c가 쓰던 자리는 0·2. 그 두 자리에만 [c, a]가 채워지고 new는 1에 남는다.
		expect(
			idsOf(
				composeTemplateHtml(frame('a', 'new', 'c'), { root: { childOrder: ['c', 'a'] } }),
			),
		).toEqual(['c', 'new', 'a'])
	})

	it('없는 id는 건너뛰고, 이미 그 순서면 출력이 base와 같다', () => {
		// 한 개만 남으면 뒤바꿀 것이 없다 — 자리도 그대로다.
		expect(
			idsOf(composeTemplateHtml(frame('a', 'b'), { root: { childOrder: ['사라진', 'a'] } })),
		).toEqual(['a', 'b'])
		expect(composeTemplateHtml(frame('a', 'b'), { root: { childOrder: ['a', 'b'] } })).toBe(
			frame('a', 'b'),
		)
	})

	it('🔴 다른 부모의 자식은 옮기지 않는다 — 좌표 기준이 바뀌어 위치가 깨진다', () => {
		const nested =
			'<div data-node-id="root" data-figma-type="FRAME">' +
			'<p data-node-id="a" data-figma-type="TEXT">a</p>' +
			'<div data-node-id="group" data-figma-type="GROUP">' +
			'<p data-node-id="deep" data-figma-type="TEXT">deep</p>' +
			'</div>' +
			'</div>'
		const html = composeTemplateHtml(nested, { root: { childOrder: ['deep', 'a'] } })

		// `deep`은 root의 자식이 아니므로 무시되고, 이름 댄 것이 하나뿐이라 아무것도 움직이지 않는다.
		expect(idsOf(html)).toEqual(['a', 'group'])
		expect(
			new DOMParser()
				.parseFromString(html, 'text/html')
				.querySelector('[data-node-id="group"] > [data-node-id="deep"]'),
		).not.toBeNull()
	})

	it('디머는 재배치 뒤에 깔려 항상 맨 아래에 남는다', () => {
		const html = composeTemplateHtml(
			frame('a', 'b'),
			{ root: { childOrder: ['b', 'a'] } },
			{ canvasBackground: { dimmer: 0.4 } },
		)
		const children = Array.from(
			new DOMParser()
				.parseFromString(html, 'text/html')
				.querySelectorAll('[data-node-id="root"] > *'),
		)

		expect(children[0]?.hasAttribute('data-canvas-dimmer')).toBe(true)
		expect(children.slice(1).map((child) => child.getAttribute('data-node-id'))).toEqual([
			'b',
			'a',
		])
	})
})

/**
 * 레이어 이름의 정본은 **Admin의 `label`** 이고, compose가 그것을 노드의 `data-name`에 쓴다
 * (사용자 지시, 2026-09-10).
 *
 * 🔑 `data-name` 한 자리로 모으는 이유: 스튜디오 레이어 패널 · Admin 레이어 목록 · **인쇄 PDF의
 *    Illustrator 레이어명**(`template-dom-to-vector-scene.client.ts`의 group label → PDF OCG)이
 *    전부 그것을 읽는다. 새 필드를 따로 내려보내면 셋 중 하나가 조용히 Figma 이름에 머문다.
 */
describe('composeTemplateHtml label', () => {
	const nameOf = (html: string) =>
		new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="t1"]')
			?.getAttribute('data-name')

	const base = '<p data-node-id="t1" data-name="Frame 12">TITLE</p>'

	it('Admin이 정한 이름이 data-name을 덮는다 — PDF 레이어명까지 그것을 읽는다', () => {
		expect(nameOf(composeTemplateHtml(base, { t1: { label: 'Title' } }))).toBe('Title')
	})

	it('🔴 비우면 Figma 이름이 남는다 — 초안은 Figma, 수정은 Admin이다', () => {
		expect(nameOf(composeTemplateHtml(base, { t1: {} }))).toBe('Frame 12')
		expect(nameOf(composeTemplateHtml(base, { t1: { label: '' } }))).toBe('Frame 12')
	})

	it('이름이 없던 노드에도 붙는다', () => {
		const html = composeTemplateHtml('<p data-node-id="t1">TITLE</p>', {
			t1: { label: 'Subtitle' },
		})

		expect(nameOf(html)).toBe('Subtitle')
	})
})

/**
 * 🔴 레이어 이름의 유일한 관문. Figma가 준 이름에 **보이지 않는 문자**가 섞여 오고, 그것이 그대로
 * 인쇄 PDF의 Illustrator 레이어 이름으로 나갔다(실측 2026-09-10: 발행 68개 중 하나가
 * `"Title\u2028"`). Admin이 눈으로 잡을 수 없는 종류다.
 */
describe('composeTemplateHtml 레이어 이름 정리', () => {
	const nameOf = (html: string) =>
		new DOMParser()
			.parseFromString(html, 'text/html')
			.querySelector('[data-node-id="t1"]')
			?.getAttribute('data-name')

	it('보이지 않는 줄 구분자를 지운다 — 실물에서 나온 그 이름', () => {
		const html = composeTemplateHtml('<p data-node-id="t1" data-name="Title\u2028">A</p>', {})

		expect(nameOf(html)).toBe('Title')
	})

	it('제어문자·앞뒤 공백·연속 공백을 정리한다', () => {
		const html = composeTemplateHtml(
			'<p data-node-id="t1" data-name="  Slogan\u0009\u0009 2  ">A</p>',
			{},
		)

		expect(nameOf(html)).toBe('Slogan 2')
	})

	it('설정이 없는 노드도 정리한다 — 군더더기는 Admin이 손대지 않은 이름에 있다', () => {
		const html = composeTemplateHtml(
			'<p data-node-id="t1" data-name="CI\u2028">A</p><p data-node-id="t2" data-name="Title">B</p>',
			{},
		)

		expect(nameOf(html)).toBe('CI')
	})

	it('이미 깨끗한 이름은 건드리지 않는다 — 재합성 멱등', () => {
		const base = '<p data-node-id="t1" data-name="Title">A</p>'

		expect(composeTemplateHtml(base, {})).toBe(base)
		expect(composeTemplateHtml(composeTemplateHtml(base, { t1: { label: 'CI' } }), {})).toBe(
			composeTemplateHtml(base, { t1: { label: 'CI' } }),
		)
	})

	it('🔴 정리해서 빈 이름이 되면 원래 값을 남긴다 — 이름을 잃는 것이 더 나쁘다', () => {
		const html = composeTemplateHtml('<p data-node-id="t1" data-name="\u2028">A</p>', {})

		expect(nameOf(html)).toBe('\u2028')
	})
})
