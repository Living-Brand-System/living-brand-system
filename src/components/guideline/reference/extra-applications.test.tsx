import { existsSync } from 'node:fs'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ExtraApplicationsReference } from './extra-applications'

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))
afterEach(cleanup)

it('네 차종 선택지를 올바른 차량 에셋과 연결하고 쇼핑백 두 사례를 표시한다', () => {
	const { container } = render(<ExtraApplicationsReference />)
	expect(screen.getAllByRole('radio').map((item) => item.textContent)).toEqual([
		'Box Truck',
		'Flatbed Truck',
		'Bus',
		'Van',
	])
	expect(screen.getByRole('radio', { name: 'Box Truck' })).toHaveAttribute('aria-checked', 'true')
	const truck = screen.getByRole('img', { name: '박스 트럭 래핑 적용 예시' })
	expect(decodeURIComponent(truck.getAttribute('src') ?? '')).toContain('box-truck-overview.webp')
	expect(container.querySelectorAll('figcaption')).toHaveLength(2)
	for (const image of container.querySelectorAll('img')) {
		const source = image.getAttribute('src') ?? ''
		const path = source.startsWith('/_next/image')
			? new URL(source, 'http://localhost').searchParams.get('url')
			: source
		expect(existsSync(`public${path}`), `${path} 이미지가 있어야 합니다`).toBe(true)
	}
})
