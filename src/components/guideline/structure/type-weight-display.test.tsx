import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import {
	GuidelineTypeWeightAdjustableDisplay,
	GuidelineTypeWeightDisplay,
} from './type-weight-display'

it('컨트롤러 없이 언어·굵기를 반영하고 표본의 줄바꿈과 행간을 유지한다', () => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	try {
		const { container, rerender, unmount } = render(<GuidelineTypeWeightDisplay />)
		const specimen = () => container.querySelector('[data-slot="type-weight-specimen"]')
		const contentClass = container.querySelector('[data-slot="guideline-card-display"]')
			?.firstElementChild?.className
		rerender(<GuidelineTypeWeightDisplay actions={<button type="button">액션</button>} />)
		expect(
			container.querySelector('[data-slot="guideline-card-display"]')?.firstElementChild
				?.className,
		).toBe(contentClass)
		expect(specimen()).toHaveStyle({ fontWeight: 500 })
		expect(specimen()).toHaveAttribute('lang', 'ko')
		expect(specimen()?.firstElementChild).toHaveStyle({ lineHeight: 1.3 })
		expect(specimen()?.firstElementChild?.textContent).toContain('\n')
		rerender(<GuidelineTypeWeightDisplay language="en" weight="bold" />)
		expect(specimen()).toHaveStyle({ fontWeight: 700 })
		expect(specimen()).toHaveAttribute('lang', 'en')
		expect(specimen()?.firstElementChild).toHaveStyle({ lineHeight: 1.15 })
		expect(specimen()?.firstElementChild?.textContent).toContain('A FUTURE BUILDER')
		rerender(
			<>
				<GuidelineTypeWeightAdjustableDisplay />
				<GuidelineTypeWeightAdjustableDisplay />
			</>,
		)
		const groups = screen.getAllByRole('radiogroup', { name: '서체 굵기' })
		expect(within(groups[0]).getByRole('radio', { name: 'Medium' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		fireEvent.click(within(groups[0]).getByRole('radio', { name: 'Bold' }))
		expect(specimen()).toHaveStyle({ fontWeight: 700 })
		expect(within(groups[1]).getByRole('radio', { name: 'Medium' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		fireEvent.click(within(groups[0]).getByRole('radio', { name: 'Light' }))
		expect(specimen()).toHaveStyle({ fontWeight: 300 })
		expect(screen.queryByRole('slider')).toBeNull()

		unmount()
	} finally {
		vi.unstubAllGlobals()
	}
})
