import { existsSync } from 'node:fs'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PhysicalPublicationsReference } from './physical-publications'

// 페이지의 콘텐츠·에셋 계약을 검사하며 캐러셀 동작은 carousel.test.tsx에서 검증합니다.
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))

afterEach(cleanup)

it('인쇄물 세 종류와 다섯 캐러셀을 실제 에셋으로 구성한다', () => {
	const { container } = render(<PhysicalPublicationsReference />)
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Physical Publications')
	expect(
		screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
	).toEqual(['Brochure', 'Banner', 'Poster', 'Related Resources'])
	expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5)
	expect(container.querySelectorAll('figcaption')).toHaveLength(30)
	for (const image of container.querySelectorAll('img')) {
		const source = image.getAttribute('src') ?? ''
		const path = source.startsWith('/_next/image')
			? new URL(source, 'http://localhost').searchParams.get('url')
			: source
		expect(existsSync(`public${path}`), `${path} 이미지가 있어야 합니다`).toBe(true)
	}
	expect(container.textContent).not.toContain('Example Name')
})
