import { existsSync } from 'node:fs'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { DigitalPublicationsReference } from './digital-publications'

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))
afterEach(cleanup)

it('미디어월과 프레젠테이션을 세 캐러셀과 실제 에셋으로 구성한다', () => {
	const { container } = render(<DigitalPublicationsReference />)
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Digital Publications')
	expect(
		screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
	).toEqual(['Media Wall', 'Presentation', 'Related Resources'])
	expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3)
	expect(container.querySelectorAll('figcaption')).toHaveLength(13)
	for (const image of container.querySelectorAll('img')) {
		const source = image.getAttribute('src') ?? ''
		const path = source.startsWith('/_next/image')
			? new URL(source, 'http://localhost').searchParams.get('url')
			: source
		expect(existsSync(`public${path}`), `${path} 이미지가 있어야 합니다`).toBe(true)
	}
	expect(container.textContent).not.toContain('Example Name')
})
