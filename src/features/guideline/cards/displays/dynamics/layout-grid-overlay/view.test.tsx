import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { overlayGeometry } from './geometry'
import { LayoutGridOverlay } from './view'

afterEach(cleanup)

it('이미지별 원본 좌표에서 이미지와 격자를 함께 contain 배치한다', () => {
	const { container } = render(
		<LayoutGridOverlay
			accent="#000000"
			images={[
				{ src: '/a.svg', width: 600, height: 300 },
				{ src: '/b.svg', width: 300, height: 600 },
			]}
		/>,
	)
	const images = container.querySelectorAll('svg')
	expect(images[0]).toHaveAttribute('viewBox', '0 0 600 300')
	expect(images[1]).toHaveAttribute('viewBox', '0 0 300 600')
	for (const image of images) {
		expect(image).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet')
		expect(image.querySelectorAll('rect')).toHaveLength(12)
		expect(image.querySelector('image')).toHaveAttribute(
			'height',
			image === images[0] ? '300' : '600',
		)
	}
	expect(container.querySelector('input')).toBeNull()
})

it('과도한 패딩과 갭에서도 셀은 원본 경계 안에 남는다', () => {
	for (const params of [
		{ sections: 3, columns: 4, padding: 1000, gap: 1000 },
		{ sections: 0, columns: 0, padding: -1, gap: -2 },
		{ sections: 2, columns: 3, padding: 8, gap: 500 },
	]) {
		const g = overlayGeometry({ src: '/a.svg', width: 300, height: 200 }, params)
		expect(g.colWidth).toBeGreaterThanOrEqual(0)
		expect(g.sectionHeight - 2 * g.padding).toBeGreaterThanOrEqual(0)
		expect(g.padding + g.colWidth * g.columns + g.gap * (g.columns - 1)).toBeLessThanOrEqual(
			g.width,
		)
	}
})
