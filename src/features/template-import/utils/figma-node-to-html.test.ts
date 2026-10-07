import { describe, expect, it } from 'vitest'
import type { FigmaSourceNode } from './figma-ir'
import { convertFigmaNodeToHtml } from './figma-node-to-html'
import { planFigmaAssets } from './normalize-figma-node'

// 실제 REST /nodes 응답 형태의 최소 fixture (169:84 3×3 1:2:3 그리드).
const GRID_FRAME = {
	id: '169:84',
	name: 'Frame 35',
	type: 'FRAME',
	fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
	layoutMode: 'GRID',
	paddingTop: 40,
	paddingRight: 40,
	paddingBottom: 40,
	paddingLeft: 40,
	gridColumnGap: 10,
	gridRowGap: 10,
	gridColumnsSizing: '   minmax(0,1fr) minmax(0,2fr) minmax(0,3fr)',
	gridRowsSizing: '   minmax(0,1fr) minmax(0,2fr) minmax(0,3fr)',
	gridItemsPositioning: 'ROW_AUTO_FLOW',
	absoluteBoundingBox: { x: 0, y: 0, width: 3110, height: 2195 },
	children: [
		{
			id: '169:87',
			name: '01',
			type: 'TEXT',
			fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
			characters: '01',
			gridColumnAnchorIndex: 0,
			gridRowAnchorIndex: 0,
			gridColumnSpan: 1,
			gridRowSpan: 1,
			gridChildHorizontalAlign: 'AUTO',
			gridChildVerticalAlign: 'AUTO',
			style: {
				fontFamily: 'Inter',
				fontWeight: 400,
				fontSize: 140,
				textAlignHorizontal: 'LEFT',
				textAutoResize: 'WIDTH_AND_HEIGHT',
				lineHeightPx: 169.43,
				lineHeightUnit: 'INTRINSIC_%',
			},
		},
	],
}

// pretty-print(속성/선언 여러 줄)이라 개행 포함해 style 값을 뽑는다.
function firstTextStyle(html: string): string {
	return html.match(/<p\b[\s\S]*?style="([\s\S]*?)"/)?.[1] ?? ''
}
function rootStyle(html: string): string {
	return html.match(/^<(?:div|p)\b[\s\S]*?style="([\s\S]*?)"/)?.[1] ?? ''
}
// 특정 node-id 요소의 style 값.
function nodeStyle(html: string, id: string): string {
	const re = new RegExp(
		`<(?:div|img)\\b[\\s\\S]*?data-node-id="${id}"[\\s\\S]*?style="([\\s\\S]*?)"`,
	)
	return html.match(re)?.[1] ?? ''
}

describe('convertFigmaNodeToHtml — 레이아웃', () => {
	it('GRID 프레임을 1:2:3 css grid로 옮긴다', () => {
		const { html, width, height } = convertFigmaNodeToHtml(GRID_FRAME)

		expect(width).toBe(3110)
		expect(height).toBe(2195)
		expect(html).toContain('display:grid')
		expect(html).toContain('grid-template-columns:minmax(0,1fr) minmax(0,2fr) minmax(0,3fr)')
		expect(html).toContain('column-gap:10px')
		expect(html).toContain('padding:40px 40px 40px 40px')
		expect(html).toContain('background:rgb(255,255,255)')
		expect(html).toContain('width:3110px')
	})

	it('그리드 자식을 앵커 셀 + span + 정렬로 배치한다', () => {
		const s = firstTextStyle(convertFigmaNodeToHtml(GRID_FRAME).html)
		expect(s).toContain('grid-column:1 / span 1')
		expect(s).toContain('grid-row:1 / span 1')
		expect(s).toContain('justify-self:start')
		expect(s).toContain('align-self:start')
	})

	it('노드 타입을 data-figma-type으로 보존한다', () => {
		const { html } = convertFigmaNodeToHtml(GRID_FRAME)
		expect(html).toContain('data-figma-type="FRAME"')
		expect(html).toContain('data-figma-type="TEXT"')
	})
})

describe('convertFigmaNodeToHtml — 벡터', () => {
	it('POLYGON은 기존 임포터 계약대로 SVG가 아닌 PNG 폴백으로 계획한다', () => {
		expect(planFigmaAssets({ id: '1:1', name: 'polygon', type: 'POLYGON' }).renders).toEqual([
			{ nodeId: '1:1', name: 'polygon', format: 'png' },
		])
	})

	it('내부 SVG URL을 원본 bounding box 크기·위치의 img로 렌더링한다', () => {
		const { html } = convertFigmaNodeToHtml(
			{
				id: '1:1',
				name: 'card',
				type: 'FRAME',
				absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
				children: [
					{
						id: '1:2',
						name: 'logo',
						type: 'VECTOR',
						absoluteBoundingBox: { x: 20, y: 30, width: 80, height: 40 },
						size: { x: 60, y: 20 },
					},
				],
			},
			{
				'1:2': {
					collection: 'application-images',
					id: 7,
					url: '/api/application-images/file/figma-1-2.svg',
				},
			},
		)

		expect(html).toContain('<img')
		expect(html).toContain('src="/api/application-images/file/figma-1-2.svg"')
		expect(html).toContain('data-asset-collection="application-images"')
		expect(html).toContain('data-asset-id="7"')
		const style = nodeStyle(html, '1:2')
		expect(style).toContain('left:20px')
		expect(style).toContain('top:30px')
		expect(style).toContain('width:80px')
		expect(style).toContain('height:40px')
	})
})

describe('convertFigmaNodeToHtml — 텍스트', () => {
	it('폰트·색·정렬을 넣고 큰따옴표를 이스케이프한다', () => {
		const s = firstTextStyle(convertFigmaNodeToHtml(GRID_FRAME).html)
		expect(s).toContain('color:rgb(0,0,0)')
		expect(s).toContain('font-size:140px')
		expect(s).toContain('text-align:left')
		// font-family의 " 를 &quot;로 이스케이프해야 style="..."가 끊기지 않는다(흰 화면 회귀).
		expect(s).toContain('font-family:&quot;Inter&quot;')
		expect(convertFigmaNodeToHtml(GRID_FRAME).html).not.toContain('font-family:"Inter"')
	})

	it('스타일 이름이 웨이트 숫자를 이긴다 — 이름으로만 웨이트를 나르는 폰트(HD OTF)', () => {
		// 실제 사고(2026-08-20): HD OTF는 Bold/Medium/Light 모두 usWeightClass가 400이라
		// Figma가 fontWeight:400을 내려 모든 텍스트가 Medium으로 그려졌다.
		const text = (style: Record<string, unknown>) => ({
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: 'FUTURE BUILDERS',
			absoluteBoundingBox: { x: 0, y: 0, width: 600, height: 100 },
			style: { fontFamily: 'HD OTF', fontSize: 96, ...style },
		})
		// 스타일 이름이 정본: fontWeight 400이어도 Bold면 700.
		expect(
			rootStyle(convertFigmaNodeToHtml(text({ fontStyle: 'Bold', fontWeight: 400 })).html),
		).toContain('font-weight:700')
		// fontStyle이 없으면 PostScript 이름 접미사로 복원한다.
		expect(
			rootStyle(
				convertFigmaNodeToHtml(text({ fontPostScriptName: 'HDOTF-Lt', fontWeight: 400 }))
					.html,
			),
		).toContain('font-weight:300')
		// 이름에서 웨이트를 못 읽으면(Regular) 숫자를 그대로 쓴다.
		expect(
			rootStyle(convertFigmaNodeToHtml(text({ fontStyle: 'Regular', fontWeight: 400 })).html),
		).toContain('font-weight:400')
		// 합성 이름은 더 구체적인 쪽이 이긴다: SemiBold는 Bold(700)가 아니라 600.
		expect(
			rootStyle(convertFigmaNodeToHtml(text({ fontStyle: 'SemiBold Italic' })).html),
		).toContain('font-weight:600')
	})

	it('JUSTIFIED를 유효한 CSS 값 justify로 옮긴다(justified는 무효)', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: 'hi',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 20 },
			style: { fontFamily: 'Inter', fontSize: 16, textAlignHorizontal: 'JUSTIFIED' },
		})
		expect(html).toContain('text-align:justify')
		expect(html).not.toContain('text-align:justified')
	})

	it('lineHeightUnit INTRINSIC_%는 normal, WIDTH_AND_HEIGHT는 pre(줄바꿈 보존)', () => {
		const s = firstTextStyle(convertFigmaNodeToHtml(GRID_FRAME).html)
		expect(s).toContain('line-height:normal')
		// nowrap이면 명시 개행이 공백으로 뭉개진다 → pre로 자동 줄바꿈만 끄고 개행은 보존.
		expect(s).toContain('white-space:pre')
		expect(s).not.toContain('white-space:nowrap')
	})

	it('textAlignVertical CENTER/BOTTOM을 flex 세로 배치로 옮기고 TOP은 생략한다', () => {
		const textNode = (vertical?: string) => ({
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: 'hi',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 60 },
			style: { fontFamily: 'Inter', fontSize: 16, textAlignVertical: vertical },
		})

		const centered = rootStyle(convertFigmaNodeToHtml(textNode('CENTER')).html)
		expect(centered).toContain('display:flex')
		expect(centered).toContain('flex-direction:column')
		expect(centered).toContain('justify-content:center')

		const bottom = rootStyle(convertFigmaNodeToHtml(textNode('BOTTOM')).html)
		expect(bottom).toContain('justify-content:flex-end')

		const top = rootStyle(convertFigmaNodeToHtml(textNode('TOP')).html)
		expect(top).not.toContain('display:flex')
	})

	it('textCase/textDecoration/italic/letterSpacing를 옮긴다', () => {
		const node = {
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: 'hi',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 20 },
			style: {
				fontFamily: 'Inter',
				fontSize: 16,
				fontStyle: 'Italic',
				textCase: 'UPPER',
				textDecoration: 'UNDERLINE',
				letterSpacing: 2,
				textAutoResize: 'HEIGHT',
				lineHeightUnit: 'PIXELS',
				lineHeightPx: 24,
			},
		}
		const s = rootStyle(convertFigmaNodeToHtml(node).html)
		expect(s).toContain('font-style:italic')
		expect(s).toContain('text-transform:uppercase')
		expect(s).toContain('text-decoration:underline')
		expect(s).toContain('letter-spacing:2px')
		expect(s).toContain('line-height:24px')
		expect(s).toContain('white-space:pre-wrap')
	})

	it('textTruncation ENDING + maxLines를 -webkit-line-clamp 말줄임으로 옮긴다', () => {
		const node = {
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: '아주 긴 텍스트',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
			style: {
				fontFamily: 'Inter',
				fontSize: 16,
				textAutoResize: 'NONE',
				textTruncation: 'ENDING',
				maxLines: 2,
				textAlignVertical: 'CENTER',
			},
		}
		const s = rootStyle(convertFigmaNodeToHtml(node).html)
		expect(s).toContain('display:-webkit-box')
		expect(s).toContain('-webkit-box-orient:vertical')
		expect(s).toContain('-webkit-line-clamp:2')
		expect(s).toContain('overflow:hidden')
		// clamp의 -webkit-box가 flex 세로 정렬을 대체한다(공존 불가 — clamp가 이긴다).
		expect(s).not.toContain('display:flex')
	})

	it('레거시 TRUNCATE는 maxLines 없이 박스 높이·줄높이로 줄 수를 유도한다', () => {
		const node = {
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: '아주 긴 텍스트',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 60 },
			style: {
				fontFamily: 'Inter',
				fontSize: 16,
				textAutoResize: 'TRUNCATE',
				lineHeightUnit: 'PIXELS',
				lineHeightPx: 20,
			},
		}
		const s = rootStyle(convertFigmaNodeToHtml(node).html)
		// (60 - 16) / 20 = 2.2 → 2 + 마지막 줄 = 3줄
		expect(s).toContain('-webkit-line-clamp:3')
	})

	it('마지막 줄의 줄간격이 1px 모자란 박스에서도 그 줄을 살린다', () => {
		// 실제 Figma 노드(HD_LBS_Template 78:38): 3줄이 다 보이는데 floor(329/110)=2가 나와
		// Figma에 없는 말줄임이 생겼다. 마지막 줄은 글리프 높이(100px)만 들어가면 그려진다.
		const node = {
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: 'HD현대\n한국조선해양\n2026 리포트',
			absoluteBoundingBox: { x: 0, y: 0, width: 613, height: 329 },
			style: {
				fontFamily: 'HD OTF',
				fontSize: 100,
				textAutoResize: 'TRUNCATE',
				textTruncation: 'ENDING',
				lineHeightUnit: 'PIXELS',
				lineHeightPx: 110,
			},
		}
		expect(rootStyle(convertFigmaNodeToHtml(node).html)).toContain('-webkit-line-clamp:3')
	})

	it('말줄임 없는 텍스트는 고정 박스(NONE/생략)여도 잘리지 않는다 — Figma는 넘친 글자를 박스 밖에 그린다', () => {
		const node = (autoResize?: string) => ({
			id: '1:1',
			name: 't',
			type: 'TEXT',
			characters: 'hi',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 20 },
			style: { fontFamily: 'Inter', fontSize: 16, textAutoResize: autoResize },
		})

		// 실제 Figma 노드(hd_lbs_templates 122:6): 박스 높이 52.6px에 3줄×23px — 잘리면 제목이 깎인다.
		const fixed = rootStyle(convertFigmaNodeToHtml(node('NONE')).html)
		expect(fixed).not.toContain('overflow')
		expect(fixed).not.toContain('-webkit-line-clamp')
		// textAutoResize 생략 = Figma 기본값(auto-resize 없음) = 고정 박스.
		expect(rootStyle(convertFigmaNodeToHtml(node(undefined)).html)).not.toContain('overflow')

		expect(rootStyle(convertFigmaNodeToHtml(node('HEIGHT')).html)).not.toContain('overflow')
		expect(rootStyle(convertFigmaNodeToHtml(node('WIDTH_AND_HEIGHT')).html)).not.toContain(
			'overflow',
		)
	})
})

describe('convertFigmaNodeToHtml — 박스 속성', () => {
	const boxNode = (extra: Record<string, unknown>) => ({
		id: '1:1',
		name: 'box',
		type: 'FRAME',
		absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
		...extra,
	})

	it('stroke를 border로, cornerRadius를 border-radius로', () => {
		const s = rootStyle(
			convertFigmaNodeToHtml(
				boxNode({
					strokes: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
					strokeWeight: 3,
					cornerRadius: 8,
				}),
			).html,
		)
		expect(s).toContain('border:3px solid rgb(255,0,0)')
		expect(s).toContain('border-radius:8px')
	})

	it('개별 corner/stroke 두께', () => {
		const s = rootStyle(
			convertFigmaNodeToHtml(
				boxNode({
					rectangleCornerRadii: [1, 2, 3, 4],
					strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
					individualStrokeWeights: { top: 1, right: 2, bottom: 3, left: 4 },
				}),
			).html,
		)
		expect(s).toContain('border-radius:1px 2px 3px 4px')
		expect(s).toContain('border-top-width:1px')
		expect(s).toContain('border-left-width:4px')
	})

	it('opacity·clipsContent·blendMode·effects를 옮긴다', () => {
		const s = rootStyle(
			convertFigmaNodeToHtml(
				boxNode({
					opacity: 0.5,
					clipsContent: true,
					blendMode: 'MULTIPLY',
					effects: [
						{
							type: 'DROP_SHADOW',
							radius: 4,
							spread: 1,
							offset: { x: 2, y: 3 },
							color: { r: 0, g: 0, b: 0, a: 0.25 },
						},
						{ type: 'LAYER_BLUR', radius: 6 },
					],
				}),
			).html,
		)
		expect(s).toContain('opacity:0.5')
		expect(s).toContain('overflow:hidden')
		expect(s).toContain('mix-blend-mode:multiply')
		expect(s).toContain('box-shadow:2px 3px 4px 1px rgba(0,0,0,0.25)')
		expect(s).toContain('filter:blur(6px)')
	})

	it('Figma degree 회전을 CSS 회전 방향으로 옮긴다', () => {
		const s = rootStyle(convertFigmaNodeToHtml(boxNode({ rotation: 90 })).html)
		expect(s).toContain('transform:rotate(-90deg)')
	})

	it('회전 자식은 회전 전 크기 박스를 AABB 중심에 맞추고 rotate를 유지한다', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'frame',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
			children: [
				{
					id: '1:2',
					name: 'sticker',
					type: 'RECTANGLE',
					rotation: 15,
					constraints: { horizontal: 'LEFT', vertical: 'TOP' },
					// 회전 전 80×20 박스가 회전해 AABB 100×40을 차지하는 상황.
					absoluteBoundingBox: { x: 20, y: 30, width: 100, height: 40 },
					size: { x: 80, y: 20 },
				},
			],
		})
		const style = nodeStyle(html, '1:2')
		// 중심 정합: left = 20 + (100-80)/2, top = 30 + (40-20)/2
		expect(style).toContain('left:30px')
		expect(style).toContain('top:40px')
		expect(style).toContain('width:80px')
		expect(style).toContain('height:20px')
		expect(style).toContain('transform:rotate(-15deg)')
	})

	it('HUG CENTER 앵커와 회전이 겹치면 translate와 rotate를 합성한다', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'frame',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
			children: [
				{
					id: '1:2',
					name: 'badge',
					type: 'FRAME',
					layoutMode: 'HORIZONTAL',
					layoutSizingHorizontal: 'HUG',
					layoutSizingVertical: 'HUG',
					rotation: 10,
					constraints: { horizontal: 'CENTER', vertical: 'CENTER' },
					absoluteBoundingBox: { x: 100, y: 80, width: 100, height: 40 },
					size: { x: 96, y: 36 },
				},
			],
		})
		const style = nodeStyle(html, '1:2')
		expect(style).toContain('transform:translate(-50%,-50%) rotate(-10deg)')
	})

	it('SOLID+GRADIENT 스택을 background 다중 레이어(위→아래 = fills 역순)로 옮긴다', () => {
		const s = rootStyle(
			convertFigmaNodeToHtml(
				boxNode({
					fills: [
						{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } },
						{
							type: 'GRADIENT_LINEAR',
							gradientHandlePositions: [
								{ x: 0, y: 0 },
								{ x: 0, y: 1 },
							],
							gradientStops: [
								{ color: { r: 0, g: 0, b: 0, a: 0.5 }, position: 0 },
								{ color: { r: 0, g: 0, b: 0, a: 0 }, position: 1 },
							],
						},
					],
				}),
			).html,
		)
		// gradient(위 fill)가 CSS 첫 레이어, 흰색 단색(아래 fill)이 마지막 레이어.
		expect(s).toContain(
			'background:linear-gradient(180deg,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 100%),linear-gradient(rgb(255,255,255),rgb(255,255,255))',
		)
	})

	it('단일 IMAGE fill을 background-image longhand와 에셋 메타데이터로 낮춘다', () => {
		const { html } = convertFigmaNodeToHtml(
			boxNode({ fills: [{ type: 'IMAGE', imageRef: 'ref-9', scaleMode: 'TILE' }] }),
			{},
			{
				'ref-9': {
					collection: 'application-images',
					id: 21,
					url: '/api/application-images/file/fill.png',
				},
			},
		)
		const s = rootStyle(html)
		expect(s).toContain('background-image:url(/api/application-images/file/fill.png)')
		expect(s).toContain('background-repeat:repeat')
		expect(html).toContain('data-asset-collection="application-images"')
		expect(html).toContain('data-asset-id="21"')
	})

	// hd_lbs_templates Poster_Type3·4 — 프레임에 이미지 fill을 얹으면 검정 SOLID 위에 IMAGE가 쌓인다.
	const posterFills = [
		{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } },
		{ type: 'IMAGE', imageRef: 'ref-9', scaleMode: 'FILL' },
	]

	it('SOLID 위 IMAGE fill을 background-color와 background-image로 낮춘다', () => {
		const { html } = convertFigmaNodeToHtml(
			boxNode({ fills: posterFills }),
			{},
			{
				'ref-9': {
					collection: 'application-images',
					id: 21,
					url: '/api/application-images/file/fill.png',
				},
			},
		)
		const s = rootStyle(html)
		expect(s).toContain('background-color:rgb(0,0,0)')
		expect(s).toContain('background-image:url(/api/application-images/file/fill.png)')
		expect(s).toContain('background-size:cover')
		expect(html).toContain('data-asset-id="21"')
	})

	it('SOLID 위 IMAGE fill 루트는 래스터로 굽지 않는다 — 자식 텍스트가 편집 가능하게 남는다', () => {
		const plan = planFigmaAssets(
			boxNode({
				fills: posterFills,
				children: [{ id: '1:2', name: 'title', type: 'TEXT', characters: 'H1 2026' }],
			}),
		)
		expect(plan.renders).toEqual([])
		expect(plan.diagnostics).toEqual([])
		expect(plan.imageFills).toEqual([{ imageRef: 'ref-9', name: 'box' }])
	})

	it('IMAGE 위를 SOLID가 덮으면 CSS로 표현할 수 없어 여전히 래스터다', () => {
		const plan = planFigmaAssets(boxNode({ fills: [...posterFills].reverse() }))
		expect(plan.renders).toEqual([{ nodeId: '1:1', name: 'box', format: 'png' }])
		expect(plan.diagnostics[0]?.reason).toBe('다른 fill과 겹친 IMAGE fill')
	})

	it('해석되지 않은 IMAGE fill은 배경 없이 구조만 유지한다', () => {
		const { html } = convertFigmaNodeToHtml(
			boxNode({ fills: [{ type: 'IMAGE', imageRef: 'ref-9' }] }),
		)
		expect(html).not.toContain('url(')
		expect(html).not.toContain('data-asset-id')
		expect(html).toContain('data-node-id="1:1"')
	})

	it('linear-gradient 배경 (색 정지점 정확)', () => {
		const s = rootStyle(
			convertFigmaNodeToHtml(
				boxNode({
					fills: [
						{
							type: 'GRADIENT_LINEAR',
							gradientHandlePositions: [
								{ x: 0, y: 0 },
								{ x: 0, y: 1 },
							],
							gradientStops: [
								{ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
								{ color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
							],
						},
					],
				}),
			).html,
		)
		expect(s).toContain('background:linear-gradient(180deg,rgb(255,0,0) 0%,rgb(0,0,255) 100%)')
	})
})

describe('convertFigmaNodeToHtml — flex', () => {
	it('WRAP 주축·교차축 간격·baseline·align-self·FIXED 치수', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'row',
			type: 'FRAME',
			layoutMode: 'HORIZONTAL',
			layoutWrap: 'WRAP',
			itemSpacing: 8,
			counterAxisSpacing: 12,
			counterAxisAlignItems: 'BASELINE',
			counterAxisAlignContent: 'SPACE_BETWEEN',
			absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 100 },
			children: [
				{
					id: '1:2',
					name: 'child',
					type: 'FRAME',
					layoutAlign: 'STRETCH',
					layoutSizingHorizontal: 'FIXED',
					layoutSizingVertical: 'HUG',
					absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 40 },
				},
			],
		})
		expect(html).toContain('flex-wrap:wrap')
		expect(html).toContain('column-gap:8px')
		expect(html).toContain('row-gap:12px')
		expect(html).toContain('align-items:baseline')
		expect(html).toContain('align-content:space-between')
		const child = nodeStyle(html, '1:2')
		expect(child).toContain('align-self:stretch')
		expect(child).toContain('width:50px')
		expect(child).not.toContain('height:40px')
	})

	it('Auto Layout의 ABSOLUTE 자식을 flex item이 아닌 절대 좌표로 배치한다', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'row',
			type: 'FRAME',
			layoutMode: 'HORIZONTAL',
			absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
			children: [
				{
					id: '1:2',
					name: 'overlay',
					type: 'FRAME',
					layoutPositioning: 'ABSOLUTE',
					absoluteBoundingBox: { x: 20, y: 30, width: 100, height: 40 },
				},
			],
		})

		const child = nodeStyle(html, '1:2')
		expect(child).toContain('position:absolute')
		expect(child).toContain('left:20px')
		expect(child).toContain('top:30px')
		expect(child).toContain('width:100px')
		expect(child).toContain('height:40px')
	})
})

describe('convertFigmaNodeToHtml — constraints', () => {
	function constrainedChildStyle(constraints: {
		horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE'
		vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE'
	}) {
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'frame',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
			children: [
				{
					id: '1:2',
					name: 'child',
					type: 'RECTANGLE',
					constraints,
					absoluteBoundingBox: { x: 20, y: 30, width: 100, height: 40 },
				},
			],
		})
		return nodeStyle(html, '1:2')
	}

	it('RIGHT·BOTTOM은 부모의 오른쪽·아래 간격을 고정한다', () => {
		const style = constrainedChildStyle({ horizontal: 'RIGHT', vertical: 'BOTTOM' })

		expect(style).toContain('right:180px')
		expect(style).toContain('bottom:130px')
		expect(style).toContain('width:100px')
		expect(style).toContain('height:40px')
		expect(style).not.toContain('left:')
		expect(style).not.toContain('top:')
	})

	it('CENTER는 부모 중심으로부터의 거리를 유지한다', () => {
		const style = constrainedChildStyle({ horizontal: 'CENTER', vertical: 'CENTER' })

		expect(style).toContain('left:calc(50% - 130px)')
		expect(style).toContain('top:calc(50% - 70px)')
		expect(style).toContain('width:100px')
		expect(style).toContain('height:40px')
	})

	it('LEFT_RIGHT·TOP_BOTTOM은 양쪽 간격을 고정하고 크기를 늘린다', () => {
		const style = constrainedChildStyle({
			horizontal: 'LEFT_RIGHT',
			vertical: 'TOP_BOTTOM',
		})

		expect(style).toContain('left:20px')
		expect(style).toContain('right:180px')
		expect(style).toContain('top:30px')
		expect(style).toContain('bottom:130px')
		expect(style).not.toContain('width:')
		expect(style).not.toContain('height:')
	})

	it('SCALE은 부모 크기에 대한 위치·크기 비율을 유지한다', () => {
		const style = constrainedChildStyle({ horizontal: 'SCALE', vertical: 'SCALE' })

		expect(style).toContain('left:6.67%')
		expect(style).toContain('top:15%')
		expect(style).toContain('width:33.33%')
		expect(style).toContain('height:20%')
	})

	it('border를 방출하는 부모의 절대배치 자식은 border 두께만큼 좌표를 되돌린다', () => {
		// CSS absolute는 padding box(border 안쪽) 기준이지만 Figma 좌표는 노드 외곽 기준이다.
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'card',
			type: 'FRAME',
			strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
			strokeWeight: 4,
			absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
			children: [
				{
					id: '1:2',
					name: 'pin',
					type: 'RECTANGLE',
					constraints: { horizontal: 'LEFT', vertical: 'TOP' },
					absoluteBoundingBox: { x: 20, y: 30, width: 100, height: 40 },
				},
				{
					id: '1:3',
					name: 'anchor',
					type: 'RECTANGLE',
					constraints: { horizontal: 'RIGHT', vertical: 'BOTTOM' },
					absoluteBoundingBox: { x: 20, y: 30, width: 100, height: 40 },
				},
			],
		})

		const pin = nodeStyle(html, '1:2')
		expect(pin).toContain('left:16px')
		expect(pin).toContain('top:26px')
		// padding box 기준: (300-8) - 16 - 100 = 176, (200-8) - 26 - 40 = 126
		const anchor = nodeStyle(html, '1:3')
		expect(anchor).toContain('right:176px')
		expect(anchor).toContain('bottom:126px')
	})

	it('REST Vector 치수와 HUG 앵커를 Figma처럼 유지한다', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '109:53',
			name: '4',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 1024, height: 1024 },
			children: [
				{
					id: '110:70',
					name: 'Names',
					type: 'FRAME',
					layoutMode: 'VERTICAL',
					layoutSizingHorizontal: 'HUG',
					layoutSizingVertical: 'HUG',
					constraints: { horizontal: 'CENTER', vertical: 'CENTER' },
					absoluteBoundingBox: { x: 379, y: 454, width: 266, height: 116 },
					size: { x: 266, y: 116 },
				},
				{
					id: '419:23',
					name: 'Message',
					type: 'FRAME',
					layoutMode: 'HORIZONTAL',
					layoutSizingHorizontal: 'HUG',
					layoutSizingVertical: 'HUG',
					constraints: { horizontal: 'LEFT', vertical: 'TOP' },
					absoluteBoundingBox: { x: 421, y: 916, width: 182, height: 50 },
					size: { x: 182, y: 50 },
				},
			],
		})

		const names = nodeStyle(html, '110:70')
		expect(names).toContain('left:50%')
		expect(names).toContain('top:50%')
		expect(names).toContain('transform:translate(-50%,-50%)')
		expect(names).not.toContain('width:')
		expect(names).not.toContain('height:')

		const message = nodeStyle(html, '419:23')
		expect(message).toContain('left:421px')
		expect(message).toContain('top:916px')
		expect(message).not.toContain('width:')
		expect(message).not.toContain('height:')
		expect(html).not.toContain('NaN')
	})
})

describe('convertFigmaNodeToHtml — 리뷰 수정 회귀', () => {
	const gridChild = (extra: Record<string, unknown>) => ({
		id: '1:1',
		name: 'g',
		type: 'FRAME',
		layoutMode: 'GRID',
		gridColumnsSizing: '1fr 1fr',
		gridRowsSizing: '1fr',
		absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 100 },
		children: [
			{
				id: '1:2',
				name: 'cell',
				type: 'RECTANGLE',
				absoluteBoundingBox: { x: 0, y: 0, width: 80, height: 60 },
				...extra,
			},
		],
	})
	const childStyle = (html: string) => nodeStyle(html, '1:2')

	it('그리드 FIXED 자식은 명시 치수 + start (0폭 붕괴 방지)', () => {
		const s = childStyle(
			convertFigmaNodeToHtml(
				gridChild({ layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'FIXED' }),
			).html,
		)
		expect(s).toContain('width:80px')
		expect(s).toContain('height:60px')
		expect(s).toContain('justify-self:start')
	})

	it('그리드 FILL 자식(AUTO 정렬)은 stretch', () => {
		const s = childStyle(
			convertFigmaNodeToHtml(
				gridChild({ layoutSizingHorizontal: 'FILL', layoutSizingVertical: 'FILL' }),
			).html,
		)
		expect(s).toContain('justify-self:stretch')
		expect(s).toContain('align-self:stretch')
	})

	it('컨테이너는 position:relative(절대배치 자식 기준), 절대배치 자식은 absolute가 이긴다', () => {
		// 루트(레이아웃 없음) + 절대배치 자식
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'card',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 200 },
			children: [
				{
					id: '1:2',
					name: 't',
					type: 'TEXT',
					characters: 'hi',
					absoluteBoundingBox: { x: 20, y: 20, width: 100, height: 20 },
				},
			],
		})
		const root = rootStyle(html)
		expect(root).toContain('position:relative')
		const child =
			html.match(/<p\b[\s\S]*?data-node-id="1:2"[\s\S]*?style="([\s\S]*?)"/)?.[1] ?? ''
		expect(child).toContain('position:absolute')
		expect(child).toContain('left:20px')
	})

	it('gradient는 paint.opacity를 정지점 알파에 곱한다', () => {
		const gradHtml = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'g',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
			fills: [
				{
					type: 'GRADIENT_LINEAR',
					opacity: 0.5,
					gradientHandlePositions: [
						{ x: 0, y: 0 },
						{ x: 0, y: 1 },
					],
					gradientStops: [
						{ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
						{ color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 },
					],
				},
			],
		})
		const s = rootStyle(gradHtml.html)
		expect(s).toContain('rgba(255,0,0,0.5)')
		expect(s).toContain('rgba(0,0,255,0.5)')
	})

	it('node.id의 큰따옴표를 이스케이프해 속성 탈출/핸들러 주입을 막는다', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '1:2" onmouseover="x',
			name: 'n',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
		})
		expect(html).not.toContain('onmouseover="x"')
		expect(html).toContain('data-node-id="1:2&quot; onmouseover=&quot;x"')
	})

	it('레이어 이름의 <>를 이스케이프해 정규식 슬롯 수집기의 태그 조기 종료를 막는다', () => {
		const { html } = convertFigmaNodeToHtml({
			id: '1:1',
			name: 'A > B',
			type: 'FRAME',
			absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
		})
		expect(html).toContain('data-name="A &gt; B"')
		expect(html).not.toContain('data-name="A > B"')
	})
})

describe('convertFigmaNodeToHtml — 이미지 캐리어', () => {
	// 실사례 형태: 클리핑 프레임(911×492) 안에 크게 깔린 placeholder(1036×578, 프레임 위로 -38px).
	const clipFrame = (children: unknown[], clipsContent = true) =>
		({
			id: '2:1',
			name: 'Image Area',
			type: 'FRAME',
			clipsContent,
			absoluteBoundingBox: { x: 0, y: 0, width: 911, height: 492 },
			children,
		}) as FigmaSourceNode
	const imageChild = {
		id: '2:2',
		name: 'placeholder',
		type: 'RECTANGLE',
		fills: [{ type: 'IMAGE', imageRef: 'ref-1', scaleMode: 'FILL' }],
		constraints: { horizontal: 'LEFT', vertical: 'TOP' },
		absoluteBoundingBox: { x: 0, y: -38, width: 1036, height: 578 },
	}
	const FILL_ASSETS = {
		'ref-1': {
			collection: 'application-images' as const,
			id: 3,
			url: '/api/application-images/file/ph.png',
		},
	}

	it('clipsContent 프레임의 유일한 IMAGE fill 자식을 캐리어로 표시한다', () => {
		const { html } = convertFigmaNodeToHtml(clipFrame([imageChild]), {}, FILL_ASSETS)
		expect(html.match(/data-image-carrier/g)).toHaveLength(1)
		// 마커는 프레임이 아니라 자식(placeholder)에 붙는다.
		expect(html.indexOf('data-image-carrier')).toBeGreaterThan(
			html.indexOf('data-node-id="2:2"'),
		)
	})

	it('가시 자식이 둘 이상이면 프레임 주도 마킹은 없지만 이미지 fill 자식은 자기 마킹된다', () => {
		const { html } = convertFigmaNodeToHtml(
			clipFrame([
				imageChild,
				{
					id: '2:3',
					name: 'deco',
					type: 'RECTANGLE',
					fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
					absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
				},
			]),
			{},
			FILL_ASSETS,
		)
		// 스탠드얼론 이미지 fill 사각형(자식 없음)은 자기 자신을 캐리어로 마킹한다.
		expect(html.match(/data-image-carrier/g)).toHaveLength(1)
		expect(html.indexOf('data-image-carrier')).toBeGreaterThan(
			html.indexOf('data-node-id="2:2"'),
		)
	})

	it('직접 IMAGE fill 프레임(자식 없음)은 자기 자신을 캐리어로 마킹한다', () => {
		const { html } = convertFigmaNodeToHtml(
			{
				...clipFrame([]),
				fills: [{ type: 'IMAGE', imageRef: 'ref-1', scaleMode: 'FILL' }],
			},
			{},
			FILL_ASSETS,
		)
		expect(html).toContain('data-image-carrier')
	})

	it('자식 딸린 이미지 fill 자식은 프레임 주도 마킹하지 않는다 — 배정 이미지가 자식에 가려진다', () => {
		const { html } = convertFigmaNodeToHtml(
			clipFrame([
				{
					...imageChild,
					children: [
						{
							id: '2:9',
							name: 'caption',
							type: 'TEXT',
							characters: '캡션',
							absoluteBoundingBox: { x: 10, y: 10, width: 100, height: 20 },
						},
					],
				},
			]),
			{},
			FILL_ASSETS,
		)
		expect(html).not.toContain('data-image-carrier')
	})

	it('자식 있는 이미지 fill 프레임은 마킹하지 않는다 — 배정 시 자식이 이미지를 가린다', () => {
		const { html } = convertFigmaNodeToHtml(
			{
				...clipFrame([
					{
						id: '2:3',
						name: 'content',
						type: 'RECTANGLE',
						fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
						absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
					},
				]),
				fills: [{ type: 'IMAGE', imageRef: 'ref-1', scaleMode: 'FILL' }],
			},
			{},
			FILL_ASSETS,
		)
		expect(html).not.toContain('data-image-carrier')
	})

	it('클립 외동 조건 밖의 래스터 폴백 img도 자기 마킹된다', () => {
		const { html } = convertFigmaNodeToHtml(
			clipFrame([
				{
					id: '2:4',
					name: 'baked',
					type: 'RECTANGLE',
					isMask: true, // 래스터 폴백 사유
					absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
				},
				{
					id: '2:3',
					name: 'deco',
					type: 'RECTANGLE',
					fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
					absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
				},
			]),
			{
				'2:4': {
					collection: 'application-images',
					id: 5,
					url: '/api/application-images/file/baked.png',
				},
			},
		)
		expect(html.match(/data-image-carrier/g)).toHaveLength(1)
		expect(html.indexOf('data-image-carrier')).toBeGreaterThan(
			html.indexOf('data-node-id="2:4"'),
		)
	})

	it('래스터 폴백 img 자식은 캐리어, 벡터 SVG 자식은 아니다', () => {
		const rasterChild = {
			id: '2:4',
			name: 'baked',
			type: 'RECTANGLE',
			absoluteBoundingBox: { x: 0, y: 0, width: 911, height: 492 },
		}
		const raster = convertFigmaNodeToHtml(clipFrame([rasterChild]), {
			'2:4': {
				collection: 'application-images',
				id: 5,
				url: '/api/application-images/file/baked.png',
			},
		})
		expect(raster.html).toContain('data-image-carrier')

		const vectorChild = {
			id: '2:5',
			name: 'logo',
			type: 'VECTOR',
			absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 },
		}
		const vector = convertFigmaNodeToHtml(clipFrame([vectorChild]), {
			'2:5': {
				collection: 'application-images',
				id: 6,
				url: '/api/application-images/file/logo.svg',
			},
		})
		expect(vector.html).not.toContain('data-image-carrier')
	})

	it('IMAGE fill을 가진 벡터(ELLIPSE) 외동 자식은 캐리어가 아니다 — 벡터 img는 VectorLayerEditor 영역', () => {
		const { html } = convertFigmaNodeToHtml(
			clipFrame([
				{
					id: '2:6',
					name: 'photo circle',
					type: 'ELLIPSE',
					fills: [{ type: 'IMAGE', imageRef: 'ref-1', scaleMode: 'FILL' }],
					absoluteBoundingBox: { x: 0, y: 0, width: 200, height: 200 },
				},
			]),
			{
				'2:6': {
					collection: 'application-images',
					id: 7,
					url: '/api/application-images/file/circle.svg',
				},
			},
			FILL_ASSETS,
		)
		expect(html).not.toContain('data-image-carrier')
	})
})

// IR 파이프라인 재배선의 기준선: 주요 경로(오토레이아웃/constraints/grid/텍스트/벡터 에셋/박스 효과)를
// 한 트리에 모두 담아 출력 HTML 전체를 그대로 고정한다. 이 스냅샷이 바뀌면 변환 동작이 바뀐 것이다.
describe('convertFigmaNodeToHtml — 골든 스냅샷', () => {
	const GOLDEN_FRAME: FigmaSourceNode = {
		id: '9:0',
		name: 'Golden',
		type: 'FRAME',
		fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
		layoutMode: 'VERTICAL',
		itemSpacing: 16,
		paddingTop: 24,
		paddingRight: 24,
		paddingBottom: 24,
		paddingLeft: 24,
		primaryAxisAlignItems: 'CENTER',
		counterAxisAlignItems: 'MIN',
		clipsContent: true,
		absoluteBoundingBox: { x: 0, y: 0, width: 800, height: 600 },
		children: [
			{
				id: '9:1',
				name: 'title',
				type: 'TEXT',
				fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3, a: 1 } }],
				characters: 'Hello\n"World"',
				layoutSizingHorizontal: 'FIXED',
				layoutSizingVertical: 'HUG',
				absoluteBoundingBox: { x: 24, y: 24, width: 752, height: 58 },
				style: {
					fontFamily: 'Inter',
					fontWeight: 700,
					fontSize: 48,
					italic: true,
					textAlignHorizontal: 'CENTER',
					textAutoResize: 'HEIGHT',
					textCase: 'UPPER',
					textDecoration: 'UNDERLINE',
					letterSpacing: 1.5,
					lineHeightUnit: 'PIXELS',
					lineHeightPx: 58,
				},
			},
			{
				id: '9:2',
				name: 'hero',
				type: 'FRAME',
				fills: [
					{
						type: 'GRADIENT_LINEAR',
						gradientHandlePositions: [
							{ x: 0, y: 0 },
							{ x: 1, y: 1 },
						],
						gradientStops: [
							{ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 },
							{ color: { r: 0, g: 0, b: 1, a: 0.5 }, position: 1 },
						],
					},
				],
				strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
				strokeWeight: 2,
				rectangleCornerRadii: [4, 8, 12, 16],
				blendMode: 'MULTIPLY',
				opacity: 0.9,
				effects: [
					{
						type: 'DROP_SHADOW',
						radius: 4,
						spread: 1,
						offset: { x: 0, y: 2 },
						color: { r: 0, g: 0, b: 0, a: 0.25 },
					},
					{ type: 'BACKGROUND_BLUR', radius: 10 },
				],
				layoutSizingHorizontal: 'FILL',
				layoutSizingVertical: 'FIXED',
				layoutGrow: 1,
				layoutAlign: 'STRETCH',
				absoluteBoundingBox: { x: 24, y: 98, width: 752, height: 300 },
				children: [
					{
						id: '9:3',
						name: 'badge',
						type: 'RECTANGLE',
						fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 } }],
						constraints: { horizontal: 'RIGHT', vertical: 'BOTTOM' },
						absoluteBoundingBox: { x: 700, y: 350, width: 60, height: 30 },
					},
					{
						id: '9:4',
						name: 'center-hug',
						type: 'FRAME',
						layoutMode: 'HORIZONTAL',
						layoutSizingHorizontal: 'HUG',
						layoutSizingVertical: 'HUG',
						constraints: { horizontal: 'CENTER', vertical: 'CENTER' },
						absoluteBoundingBox: { x: 350, y: 230, width: 100, height: 36 },
						size: { x: 100, y: 36 },
					},
					{
						id: '9:5',
						name: 'logo',
						type: 'VECTOR',
						constraints: { horizontal: 'SCALE', vertical: 'SCALE' },
						absoluteBoundingBox: { x: 60, y: 120, width: 150, height: 60 },
						size: { x: 150, y: 60 },
					},
				],
			},
			{
				id: '9:6',
				name: 'table',
				type: 'FRAME',
				layoutMode: 'GRID',
				gridColumnsSizing: 'minmax(0,1fr) minmax(0,2fr)',
				gridRowsSizing: 'minmax(0,1fr)',
				gridColumnGap: 8,
				gridRowGap: 4,
				gridItemsPositioning: 'ROW_AUTO_FLOW',
				absoluteBoundingBox: { x: 24, y: 414, width: 752, height: 120 },
				children: [
					{
						id: '9:7',
						name: 'cell',
						type: 'TEXT',
						characters: 'cell',
						gridColumnAnchorIndex: 1,
						gridRowAnchorIndex: 0,
						gridColumnSpan: 1,
						gridRowSpan: 1,
						gridChildHorizontalAlign: 'CENTER',
						layoutSizingHorizontal: 'FILL',
						style: { fontFamily: 'Inter', fontSize: 14, textAlignHorizontal: 'LEFT' },
					},
				],
			},
			{
				id: '9:8',
				name: 'overlay',
				type: 'FRAME',
				layoutPositioning: 'ABSOLUTE',
				fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 0.4 } }],
				constraints: { horizontal: 'LEFT_RIGHT', vertical: 'TOP' },
				absoluteBoundingBox: { x: 100, y: 500, width: 600, height: 40 },
				children: [
					{
						id: '9:9',
						name: 'hidden',
						type: 'RECTANGLE',
						visible: false,
						absoluteBoundingBox: { x: 0, y: 0, width: 1, height: 1 },
					},
				],
			},
		],
	}

	const GOLDEN_ASSETS = {
		'9:5': {
			collection: 'application-images' as const,
			id: 42,
			url: '/api/application-images/file/figma-logo.svg',
		},
	}

	it('대표 트리의 출력 HTML 전체를 고정한다', () => {
		const result = convertFigmaNodeToHtml(GOLDEN_FRAME, GOLDEN_ASSETS)
		expect(result.width).toBe(800)
		expect(result.height).toBe(600)
		expect(result.html).toMatchSnapshot()
	})
})
