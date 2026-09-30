import { existsSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LayoutsReference } from './layouts'

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))
afterEach(cleanup)

it('16개 예시가 Off로 시작하며 각각 대응하는 제작 규칙을 겹쳐 표시한다', () => {
	const { container } = render(<LayoutsReference />)
	const groups = screen.getAllByRole('radiogroup', { name: /레이아웃 \d+ 가이드/ })
	expect(groups).toHaveLength(16)
	expect(container.querySelectorAll('[data-slot="clearspace-overlay"]')).toHaveLength(0)
	for (const group of groups) {
		expect(within(group).getByRole('radio', { name: 'Off' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		fireEvent.click(within(group).getByRole('radio', { name: 'On' }))
		const overlay = container.querySelector('[data-slot="clearspace-overlay"]')
		expect(overlay).not.toBeNull()
		const dimmer = overlay?.previousElementSibling
		expect(dimmer).toHaveAttribute('data-slot', 'clearspace-dimmer')
		expect(dimmer).toHaveClass('bg-background/80')
		const example = dimmer?.previousElementSibling?.getAttribute('src') ?? ''
		expect(overlay?.getAttribute('src')).toBe(
			example
				.replace('/examples/', '/construction/')
				.replace('-example-', '-construction-')
				.replace('.webp', '.svg'),
		)
		expect(existsSync(`public${overlay?.getAttribute('src')}`)).toBe(true)
		fireEvent.click(within(group).getByRole('radio', { name: 'Off' }))
		expect(container.querySelector('[data-slot="clearspace-dimmer"]')).toBeNull()
	}
	for (const image of container.querySelectorAll('img')) {
		const src = image.getAttribute('src') ?? ''
		const path = src.startsWith('/_next/image')
			? new URL(src, 'http://localhost').searchParams.get('url')
			: src
		expect(existsSync(`public${path}`), `${path} 에셋이 있어야 합니다`).toBe(true)
	}
})
