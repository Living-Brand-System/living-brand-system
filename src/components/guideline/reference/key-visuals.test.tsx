import { existsSync } from 'node:fs'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { KeyVisualsReference } from './key-visuals'

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))
afterEach(cleanup)

it('타입별 21개 적용 예시와 18개 금지 사례를 실제 에셋 및 원문 규정에 연결한다', () => {
	const { container } = render(<KeyVisualsReference />)
	expect(screen.getByRole('heading', { level: 1, name: 'Key Visuals' })).toBeInTheDocument()
	const carousels = container.querySelectorAll('[data-slot="guideline-carousel-container"]')
	expect([...carousels].map((item) => item.querySelectorAll('img').length)).toEqual([5, 5, 6, 5])
	const panels = screen.getAllByRole('region', { name: 'Incorrect Usages' })
	expect(panels.map((item) => item.querySelectorAll('img').length)).toEqual([6, 4, 4, 4])
	for (const panel of panels) expect(panel).toHaveClass('bg-destructive/15')
	const mixedPatterns = within(panels[1]).getByRole('img', { name: /서로 다른 패턴 혼용/ })
	expect(decodeURIComponent(mixedPatterns.getAttribute('src') ?? '')).toContain(
		'incorrect-usage-03.webp',
	)
	expect(screen.getByText(/5단계 이하로/)).toBeInTheDocument()
	for (const image of container.querySelectorAll('img')) {
		const src = image.getAttribute('src') ?? ''
		const path = src.startsWith('/_next/image')
			? new URL(src, 'http://localhost').searchParams.get('url')
			: src
		expect(existsSync(`public${path}`), `${path} 에셋이 있어야 합니다`).toBe(true)
	}
})
