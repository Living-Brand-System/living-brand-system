import { existsSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { TypographyReference } from './typography'

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))
afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

it('언어별 위계와 명세를 일치시키고 굵기 선택을 각 표본에 독립적으로 적용한다', () => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	const { container } = render(<TypographyReference />)
	expect(screen.getByRole('heading', { name: 'Typography', level: 1 })).toBeInTheDocument()
	expect(
		screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
	).toEqual([
		'Bold Approach',
		'HD Typeface',
		'Weight',
		'Micro Typography',
		'Usecases',
		'Hierarchy',
		'Incorrect Usages',
	])
	const weightSection = screen.getByRole('region', { name: 'Weight' })
	const samples = weightSection.querySelectorAll('[data-slot="type-weight-specimen"]')
	expect([...samples].map((sample) => sample.getAttribute('lang'))).toEqual([
		'ko',
		'en',
		'ko',
		'en',
		'ko',
		'en',
	])
	for (const [index, weight] of [700, 700, 500, 500, 300, 300].entries()) {
		expect(samples[index]).toHaveStyle({ fontWeight: weight })
	}
	expect(within(weightSection).getByText('700')).toBeInTheDocument()
	const hierarchy = screen.getByRole('region', { name: 'Hierarchy' })
	const specimens = hierarchy.querySelectorAll('[data-slot="type-hierarchy-specimen"]')
	expect(specimens).toHaveLength(3)
	for (const [index, leading] of [1.3, 1.15, 1.05].entries()) {
		expect(specimens[index].firstElementChild).toHaveStyle({
			fontWeight: 700,
			lineHeight: leading,
		})
		expect(specimens[index].lastElementChild).toHaveStyle({ fontWeight: 500 })
	}
	for (const value of ['130 – 140%', '115 – 125%', '105 – 115%']) {
		expect(within(hierarchy).getAllByText(value).length).toBeGreaterThan(0)
	}
	const micro = screen.getByRole('region', { name: 'Micro Typography' })
	const groups = within(micro).getAllByRole('radiogroup', { name: '서체 굵기' })
	fireEvent.click(within(groups[0]).getByRole('radio', { name: 'Bold' }))
	const weightSpecimens = micro.querySelectorAll('[data-slot="type-weight-specimen"]')
	expect(weightSpecimens[0]).toHaveStyle({ fontWeight: 700 })
	expect(weightSpecimens[1]).toHaveStyle({ fontWeight: 500 })
	expect(
		within(micro).getByRole('radiogroup', { name: '서체 언어 카드 선택' }),
	).toBeInTheDocument()
	expect(container.querySelectorAll('figcaption')).toHaveLength(24)
	expect(screen.queryByRole('slider')).toBeNull()
	const incorrect = screen.getByRole('region', { name: 'Incorrect Usages' })
	expect(within(incorrect).getAllByRole('img', { name: /사용 금지 사례/ })).toHaveLength(6)
	for (const image of container.querySelectorAll('img')) {
		const src = image.getAttribute('src') ?? ''
		const path = src.startsWith('/_next/image')
			? new URL(src, 'http://localhost').searchParams.get('url')
			: src
		expect(existsSync(`public${path}`), `${path} 에셋이 있어야 합니다`).toBe(true)
	}
})
