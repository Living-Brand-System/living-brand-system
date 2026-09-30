// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fitRect } from './image-to-data-url.client'

// jsdom에는 canvas가 없어 실제 굽기를 돌릴 수 없다 — 워커가 굽기를 **부르는지**만 본다.
// 구운 결과가 맞는지는 순수 함수 `fitRect`와 브라우저 실측이 담당한다.
// html-to-image도 jsdom에서 못 돈다 — 굽기를 부르는지만 본다.
vi.mock('html-to-image', () => ({ toPng: vi.fn(async () => 'data:image/png;base64,FLAT') }))
vi.mock('./image-to-data-url.client', async (importOriginal) => ({
	...(await importOriginal<typeof import('./image-to-data-url.client')>()),
	toBakedImageDataUrl: vi.fn(async () => 'data:image/png;base64,BAKED'),
	cropBakedImage: vi.fn(async () => 'data:image/png;base64,CROPPED'),
}))

import type { VectorPrimitive } from '@/modules/studio-artifact/studio-artifact'
import {
	colorAlpha,
	hasRealGradient,
	solidColor,
	templateDomToVectorScene,
	uniformGradientColor,
} from './template-dom-to-vector-scene.client'

/** jsdom은 레이아웃을 하지 않는다 — 워커가 읽는 상자만 심어 준다. */
function measure(element: Element, box: { x: number; y: number; width: number; height: number }) {
	element.getBoundingClientRect = () =>
		({
			left: box.x,
			top: box.y,
			right: box.x + box.width,
			bottom: box.y + box.height,
			width: box.width,
			height: box.height,
			x: box.x,
			y: box.y,
			toJSON: () => ({}),
		}) as DOMRect
}

function stageWith(html: string): HTMLElement {
	const stage = document.createElement('div')
	stage.innerHTML = html
	document.body.replaceChildren(stage)
	measure(stage, { x: 0, y: 0, width: 400, height: 300 })
	return stage
}

describe('templateDomToVectorScene', () => {
	beforeEach(() => document.body.replaceChildren())

	/**
	 * 🔑 판의 배경은 **stage가 아니라 그 자식인 루트 프레임**에 얹힌다 —
	 * `composeTemplateHtml`이 `doc.body.firstElementChild`에 넣고, 템플릿 HTML에 `#__stage`가 없어
	 * stage는 스타일 없는 wrapper다. 그래서 판 배경은 일반 자식 걷기가 집는다.
	 * 🔴 2026-09-09에 이것을 「stage 자신에 얹힌다」로 오진해 stage 배경을 따로 걷는 코드를 넣었다.
	 * 프로덕션에서 도달 불가였고, 전제가 바뀌면 판 사각형을 두 장 낸다. 여기서 실제 형태를 잠근다.
	 */
	it('루트 프레임의 배경 이미지를 image로 옮긴다', async () => {
		const stage = stageWith(
			'<div data-node-id="root" style="background-color:#eeeeee;background-image:url(\'https://example.test/plate.png\')"></div>',
		)
		measure(stage.firstElementChild as Element, { x: 0, y: 0, width: 400, height: 300 })

		const { scene } = await templateDomToVectorScene(stage, { width: 400, height: 300 })
		const flattened = scene.primitives.flatMap((primitive) =>
			primitive.kind === 'group' ? primitive.children : [primitive],
		)

		expect(flattened).toContainEqual({
			kind: 'image',
			x: 0,
			y: 0,
			width: 400,
			height: 300,
			href: 'data:image/png;base64,BAKED',
			preserveAspectRatio: 'none',
		})
	})

	it('div 배경과 테두리를 판 좌표계의 rect로 옮긴다', async () => {
		const stage = stageWith(
			'<div data-node-id="frame-1" data-name="Card" style="background-color:#eeeeee;border:2px solid #112233;border-top-left-radius:8px;border-top-right-radius:8px;border-bottom-right-radius:8px;border-bottom-left-radius:8px"></div>',
		)
		measure(stage.firstElementChild as Element, { x: 10, y: 20, width: 100, height: 50 })

		const { scene } = await templateDomToVectorScene(stage, { width: 400, height: 300 })

		expect(scene.primitives).toEqual([
			{
				kind: 'group',
				label: 'Card',
				layer: 'Background',
				children: [
					{
						kind: 'rect',
						x: 10,
						y: 20,
						width: 100,
						height: 50,
						fill: '#eeeeee',
						stroke: '#112233',
						strokeWidth: 2,
						radius: 8,
					},
				],
			},
		])
	})

	it('내용이 없는 노드는 버린다 — 빈 그룹이 남으면 받는 쪽 레이어가 지저분해진다', async () => {
		const stage = stageWith('<div data-node-id="empty-1"></div>')
		measure(stage.firstElementChild as Element, { x: 0, y: 0, width: 10, height: 10 })

		expect(
			(await templateDomToVectorScene(stage, { width: 400, height: 300 })).scene.primitives,
		).toEqual([])
	})

	it('img를 구운 data URI로 싣는다 — URL을 그대로 두면 파일 밖에서 안 보인다', async () => {
		const stage = stageWith(
			'<img data-node-id="img-1" src="/api/application-images/file/a.png" style="object-fit:contain">',
		)
		measure(stage.firstElementChild as Element, { x: 5, y: 5, width: 40, height: 40 })

		const { scene } = await templateDomToVectorScene(stage, { width: 400, height: 300 })
		const group = scene.primitives[0]

		expect(group.kind === 'group' && group.children[0]).toMatchObject({
			kind: 'image',
			href: 'data:image/png;base64,BAKED',
			// 맞춤은 굽는 쪽이 이미 반영했다 — 여기서 또 맞추면 두 번 적용된다.
			preserveAspectRatio: 'none',
			x: 5,
			y: 5,
		})
	})

	// 🔴 Figma importer는 IMAGE fill을 img가 아니라 background-image로 내린다 — 이걸 놓쳐서
	//    실제 템플릿에서 사진이 통째로 빠졌다(2026-08-27).
	it('div의 background-image도 싣는다', async () => {
		const stage = stageWith(
			'<div data-node-id="photo" style="background-image:url(&quot;/api/application-images/file/b.png&quot;);background-size:cover"></div>',
		)
		measure(stage.firstElementChild as Element, { x: 0, y: 0, width: 100, height: 100 })

		const { scene } = await templateDomToVectorScene(stage, { width: 400, height: 300 })
		const group = scene.primitives[0]

		expect(group.kind === 'group' && group.children[0]).toMatchObject({
			kind: 'image',
			href: 'data:image/png;base64,BAKED',
		})
	})

	// 🔴 굽지 않으면 배경 이미지를 건너뛰고 배경색만 남아 **단색 사각형이 그림을 덮는다**.
	//    Technical Illustration의 색 입힘이 이 형태다(2026-08-27 실물 확인).
	it('래스터 마스크는 그 노드를 구워 이미지로 얹는다', async () => {
		const stage = stageWith(
			'<div data-node-id="carrier" style="background-color:#ffffff">' +
				'<div data-node-id="carrier-colorize" style="background-color:#000000;mask-image:url(&quot;/api/generated-images/file/a.jpg&quot;)"></div>' +
				'</div>',
		)
		const carrier = stage.firstElementChild as HTMLElement
		measure(carrier, { x: 0, y: 0, width: 100, height: 100 })
		measure(carrier.firstElementChild as Element, { x: 0, y: 0, width: 100, height: 100 })

		const { scene, unsupported } = await templateDomToVectorScene(stage, {
			width: 400,
			height: 300,
		})
		const group = scene.primitives[0]
		const children = group.kind === 'group' ? group.children : []

		// 바닥은 벡터로 남고 오버레이만 이미지가 된다 — 그래야 밑색이 비쳐 원본과 같아진다.
		expect(children[0]).toMatchObject({ kind: 'rect', fill: '#ffffff' })
		const overlay = children[1]
		expect(overlay.kind === 'group' && overlay.children[0]).toMatchObject({
			kind: 'image',
			href: 'data:image/png;base64,FLAT',
		})
		expect(unsupported).toContainEqual({ nodeId: 'carrier-colorize', reason: 'mask' })
	})

	// 🔴 구운 것은 요소 전체다. 조상이 자른 좁은 상자에 그대로 밀어 넣으면 그림이 찌그러진다 —
	//    실물에서 3462×1932 비트맵이 630×644 상자에 들어가 가로 0.55배가 됐다(2026-08-27).
	it('조상이 자르면 비트맵도 같이 잘라 비율을 지킨다', async () => {
		const { cropBakedImage } = await import('./image-to-data-url.client')
		const stage = stageWith(
			'<div data-node-id="frame" style="overflow:hidden">' +
				'<div data-node-id="wide" style="background-color:#000000;mask-image:url(&quot;/api/generated-images/file/a.jpg&quot;)"></div>' +
				'</div>',
		)
		const frame = stage.firstElementChild as HTMLElement
		// 프레임이 100 너비로 자르는데 내용은 200 너비다.
		measure(frame, { x: 0, y: 0, width: 100, height: 60 })
		measure(frame.firstElementChild as Element, { x: 0, y: 0, width: 200, height: 60 })

		const { scene } = await templateDomToVectorScene(stage, { width: 400, height: 300 })

		expect(cropBakedImage).toHaveBeenCalledWith(
			expect.any(String),
			{ x: 0, y: 0, width: 100, height: 60 },
			expect.any(Number),
		)
		// 그린 상자와 잘라 낸 비트맵이 같은 영역이어야 비율이 산다.
		const flat = JSON.stringify(scene.primitives)
		expect(flat).toContain('"href":"data:image/png;base64,CROPPED"')
		expect(flat).toContain('"width":100')
	})

	// 🔴 캔버스 디머가 rgba(0,0,0,0.4)로 들어온다 — 알파를 버리면 판 전체가 새까맣게 인쇄되고
	//    경고도 뜨지 않는다(불투명 단색으로 보이므로).
	it('반투명 칠의 알파를 opacity로 싣는다', async () => {
		const stage = stageWith(
			'<div data-node-id="dimmer" style="background-color:rgba(0, 0, 0, 0.4)"></div>',
		)
		measure(stage.firstElementChild as Element, { x: 0, y: 0, width: 100, height: 100 })

		const { scene } = await templateDomToVectorScene(stage, { width: 400, height: 300 })
		const group = scene.primitives[0]

		expect(group.kind === 'group' && group.children[0]).toMatchObject({
			kind: 'rect',
			fill: '#000000',
			opacity: 0.4,
		})
	})

	// 🔴 브라우저는 잘린 줄도 레이아웃해 둔다 — 클립을 안 보면 화면에 없는 문장이 판에 실린다.
	//    Figma의 고정 크기 텍스트가 <p style="overflow:hidden">으로 내려오므로 흔한 형태다.
	it('overflow로 잘린 줄은 싣지 않는다', async () => {
		const stage = stageWith(
			'<p data-node-id="fixed" style="overflow:hidden;font-size:20px;color:#000000">보이는 줄</p>',
		)
		const p = stage.firstElementChild as HTMLElement
		measure(p, { x: 0, y: 0, width: 200, height: 24 })
		// 상자(높이 24) 아래로 밀려난 줄을 흉내 낸다.
		const node = p.firstChild as Text
		const range = document.createRange()
		range.selectNodeContents(node)
		range.getClientRects = () => [] as unknown as DOMRectList
		range.getBoundingClientRect = () =>
			({
				left: 0,
				top: 100,
				right: 120,
				bottom: 124,
				width: 120,
				height: 24,
				x: 0,
				y: 100,
				toJSON: () => ({}),
			}) as DOMRect
		document.createRange = () => range

		const { scene } = await templateDomToVectorScene(stage, { width: 400, height: 300 })

		expect(JSON.stringify(scene.primitives)).not.toContain('보이는 줄')
	})

	it('벡터로 못 옮기는 효과는 버리지 않고 unsupported로 보고한다', async () => {
		const stage = stageWith(
			'<div data-node-id="hero" style="background-image:linear-gradient(90deg,#000,#fff);box-shadow:0 2px 4px #000"></div>',
		)
		measure(stage.firstElementChild as Element, { x: 0, y: 0, width: 100, height: 100 })

		const { unsupported } = await templateDomToVectorScene(stage, { width: 400, height: 300 })

		expect(unsupported).toContainEqual({ nodeId: 'hero', reason: 'gradient' })
		expect(unsupported).toContainEqual({ nodeId: 'hero', reason: 'box-shadow' })
	})

	/**
	 * 🔴 묶음은 **슬롯 nodeId에서만** 바뀐다. 목록에 없는 노드는 배경이고, 슬롯 아래 자식은
	 *    슬롯의 묶음을 물려받는다 — 그래야 인쇄 PDF가 묶음 하나를 form 하나로 묶을 수 있다.
	 */
	it('슬롯 nodeId에서 묶음이 바뀌고 자식이 물려받는다', async () => {
		const stage = stageWith(
			'<div data-node-id="root" style="background-color:#ffffff"><div data-node-id="ci-1" style="background-color:#00ff00"><div data-node-id="inner" style="background-color:#0000ff"></div></div></div>',
		)
		for (const node of Array.from(stage.querySelectorAll('div'))) {
			measure(node, { x: 0, y: 0, width: 100, height: 100 })
		}

		const { scene } = await templateDomToVectorScene(
			stage,
			{ width: 400, height: 300 },
			new Map([['ci-1', 'CI']]),
		)

		const layersOf = (primitives: readonly VectorPrimitive[]): string[] =>
			primitives.flatMap((primitive) =>
				primitive.kind === 'group'
					? [String(primitive.layer), ...layersOf(primitive.children)]
					: [],
			)
		expect(layersOf(scene.primitives)).toEqual(['Background', 'CI', 'CI'])
	})

	it('숨긴 노드는 훑지 않는다', async () => {
		const stage = stageWith(
			'<div data-node-id="hidden" style="display:none;background-color:#ff0000"></div>',
		)
		measure(stage.firstElementChild as Element, { x: 0, y: 0, width: 10, height: 10 })

		expect(
			(await templateDomToVectorScene(stage, { width: 400, height: 300 })).scene.primitives,
		).toEqual([])
	})
})

describe('solidColor', () => {
	it('투명은 색이 아니다 — rgba(0,0,0,0)을 검정으로 읽으면 배경 없는 판이 검게 인쇄된다', async () => {
		expect(solidColor('rgba(0, 0, 0, 0)')).toBeNull()
		expect(solidColor('rgb(17, 34, 51)')).toBe('#112233')
		expect(solidColor('rgba(255, 0, 0, 0.5)')).toBe('#ff0000')
		expect(solidColor('#abcdef')).toBe('#abcdef')
	})
})

describe('위장 그라디언트', () => {
	// 🔴 Figma importer가 배경 레이어 여러 겹일 때 SOLID를 linear-gradient(색,색)으로 바꿔 넣는다.
	//    그걸 진짜 그라디언트로 세면 멀쩡한 단색 배경이 전부 래스터 폴백으로 빠진다.
	it('정지점이 같은 색이면 단색으로 읽는다', () => {
		expect(uniformGradientColor('linear-gradient(rgb(0, 173, 69),rgb(0, 173, 69))')).toBe(
			'#00ad45',
		)
		expect(hasRealGradient('linear-gradient(rgb(0, 173, 69),rgb(0, 173, 69))')).toBe(false)
	})

	it('정지점이 다르면 진짜 그라디언트다', () => {
		expect(uniformGradientColor('linear-gradient(90deg,#000000,#ffffff)')).toBeNull()
		expect(hasRealGradient('linear-gradient(90deg,#000000,#ffffff)')).toBe(true)
	})

	it('배경이 없으면 그라디언트도 없다', () => {
		expect(hasRealGradient('none')).toBe(false)
	})

	it('단색 위장 레이어를 배경색보다 우선해 칠한다', async () => {
		const stage = stageWith(
			'<div data-node-id="layered" style="background-image:linear-gradient(rgb(0, 173, 69),rgb(0, 173, 69))"></div>',
		)
		measure(stage.firstElementChild as Element, { x: 0, y: 0, width: 40, height: 40 })

		const { scene, unsupported } = await templateDomToVectorScene(stage, {
			width: 400,
			height: 300,
		})
		const group = scene.primitives[0]

		expect(group.kind === 'group' && group.children[0]).toMatchObject({
			kind: 'rect',
			fill: '#00ad45',
		})
		expect(unsupported).toEqual([])
	})
})

describe('fitRect', () => {
	const natural = { width: 200, height: 100 }
	const target = { width: 100, height: 100 }

	it('cover는 상자를 덮고 남는 쪽이 가운데로 넘친다', () => {
		expect(fitRect(natural, target, 'cover')).toEqual({
			x: -50,
			y: 0,
			width: 200,
			height: 100,
		})
	})

	it('contain은 비율을 지키고 남는 축을 가운데로 민다', () => {
		expect(fitRect(natural, target, 'contain')).toEqual({ x: 0, y: 25, width: 100, height: 50 })
	})

	it('fill은 상자를 그대로 채운다', () => {
		expect(fitRect(natural, target, 'fill')).toEqual({ x: 0, y: 0, width: 100, height: 100 })
	})
})

describe('colorAlpha', () => {
	it('rgba의 알파를 읽고, 없으면 1이다', () => {
		expect(colorAlpha('rgba(0, 0, 0, 0.4)')).toBe(0.4)
		expect(colorAlpha('rgb(0, 0, 0)')).toBe(1)
		expect(colorAlpha('#000000')).toBe(1)
	})
})
