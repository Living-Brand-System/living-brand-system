import { describe, expect, it } from 'vitest'
import { vectorSceneToSvg } from './vector-scene-to-svg'

describe('vectorSceneToSvg', () => {
	it('최소 Vector Scene을 결정론적인 SVG로 직렬화한다', () => {
		const artifact = {
			kind: 'vector',
			source: {
				width: 100,
				height: 80,
				background: '#000000',
				primitives: [
					{
						kind: 'line',
						x1: 1,
						y1: 2,
						x2: 3,
						y2: 4,
						stroke: '#ffffff',
						strokeWidth: 2,
						lineCap: 'square',
					},
					{ kind: 'circle', cx: 5, cy: 6, radius: 7, fill: '#ff0000' },
				],
			},
		} as const

		const svg = vectorSceneToSvg(artifact, 300)
		expect(vectorSceneToSvg(artifact, 300)).toBe(svg)
		// 🔴 물리 크기는 mm로 적는다 — 단위가 없으면 뷰어가 pt로 읽어(72dpi) 판이 12배 크게 열린다.
		//    좌표계는 viewBox가 px로 유지한다.
		expect(svg).toContain('width="8.47mm" height="6.77mm" viewBox="0 0 100 80"')
		// 해상도를 낮추면 같은 판이 더 큰 물리 크기로 나간다 — mm가 실제로 ppi를 타는지 잠근다.
		expect(vectorSceneToSvg(artifact, 150)).toContain('width="16.93mm" height="13.55mm"')
		// Illustrator가 `xlink:href`를 요구하므로 네임스페이스 선언이 있어야 한다.
		expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
		expect(svg).toContain('<rect width="100" height="80" fill="#000000" />')
		expect(svg).toContain(
			'<line x1="1.00" y1="2.00" x2="3.00" y2="4.00" stroke="#ffffff" stroke-width="2.00" stroke-linecap="square" />',
		)
		expect(svg).toContain('<circle cx="5.00" cy="6.00" r="7.00" fill="#ff0000" />')
	})

	it('template 개체를 presentation attribute만으로 직렬화한다', () => {
		const artifact = {
			kind: 'vector',
			source: {
				width: 200,
				height: 100,
				background: '#ffffff',
				primitives: [
					{
						kind: 'group',
						label: 'Background',
						clip: { x: 0, y: 0, width: 200, height: 100 },
						children: [{ kind: 'circle', cx: 1, cy: 2, radius: 3, fill: '#00ad45' }],
					},
					{
						kind: 'rect',
						x: 10,
						y: 20,
						width: 30,
						height: 40,
						fill: '#eeeeee',
						radius: 4,
					},
					{
						kind: 'image',
						x: 0,
						y: 0,
						width: 50,
						height: 50,
						href: 'data:image/png;base64,AAA',
					},
					{
						kind: 'text',
						x: 5,
						y: 60,
						text: 'HD & <현대>',
						fontFamily: 'Pretendard',
						fontSize: 24,
						fontWeight: 700,
						fill: '#000000',
					},
				],
			},
		} as const

		const svg = vectorSceneToSvg(artifact, 300)
		// 같은 장면은 항상 같은 문서여야 한다 — clip id가 호출 횟수를 타면 안 된다.
		expect(vectorSceneToSvg(artifact, 300)).toBe(svg)
		expect(svg).toContain('<clipPath id="clip-0">')
		expect(svg).toContain('clip-path="url(#clip-0)"')
		expect(svg).toContain('data-name="Background"')
		expect(svg).toContain(
			'<rect x="10.00" y="20.00" width="30.00" height="40.00" rx="4.00" fill="#eeeeee" />',
		)
		// 🔴 fill이 없으면 SVG 기본값이 검정이다 — 테두리만 있어야 할 상자가 검게 채워졌다.
		expect(
			vectorSceneToSvg(
				{
					kind: 'vector',
					source: {
						width: 10,
						height: 10,
						background: '#ffffff',
						primitives: [
							{ kind: 'rect', x: 0, y: 0, width: 5, height: 5, stroke: '#000000' },
						],
					},
				} as const,
				300,
			),
		).toContain('fill="none"')
		// 🔴 `xlink:href`가 없으면 Illustrator에서 사진이 통째로 안 보인다.
		expect(svg).toContain('xlink:href="data:image/png;base64,AAA" preserveAspectRatio="none"')
		// 🔴 `href`를 함께 적으면 data URI가 두 번 실려 파일이 두 배가 된다.
		expect(svg).not.toContain(' href="data:image/png;base64,AAA"')
		expect(svg).toContain('font-family="Pretendard" font-size="24.00" font-weight="700"')
		// 글자로 남긴다 — 받는 쪽에서 문구를 고칠 수 있어야 한다.
		expect(svg).toContain('>HD &amp; &lt;현대&gt;</text>')
		// foreignObject는 Figma에서 빈 화면이 된다.
		expect(svg).not.toContain('foreignObject')
	})
})
