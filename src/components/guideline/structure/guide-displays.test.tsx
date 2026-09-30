import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import {
	GuidelineCiLockupDisplay,
	GuidelineLayoutGridDisplay,
	GuidelineLayoutOverlayDisplay,
} from './guide-displays'

it('세 가이드는 Off로 시작하고 독립적으로 전환된다', () => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	vi.stubGlobal('matchMedia', () => ({
		matches: true,
		addEventListener() {},
		removeEventListener() {},
	}))
	const fonts = Object.getOwnPropertyDescriptor(document, 'fonts')
	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: { ready: Promise.resolve() },
	})
	try {
		const { container, unmount } = render(
			<>
				<GuidelineLayoutOverlayDisplay
					images={[{ src: '/sample.webp', width: 300, height: 400 }]}
					colors={{ 'HD HERITAGE GREEN': 'green' }}
				/>
				<GuidelineLayoutGridDisplay />
				<GuidelineCiLockupDisplay colors={{}} />
			</>,
		)
		const ciFrame = container.querySelectorAll('[data-slot="guideline-card-display"]')[2]
		const stage = ciFrame.querySelector('.overflow-clip') as HTMLElement
		expect(stage).not.toHaveClass('border')
		expect(stage.style.background).toBe('')
		const groups = screen.getAllByRole('radiogroup')
		expect(groups).toHaveLength(3)
		for (const group of groups)
			expect(within(group).getByRole('radio', { name: 'Off' })).toHaveAttribute(
				'aria-checked',
				'true',
			)
		const overlay = screen.getByRole('img', { name: '레이아웃 이미지와 격자' })
		expect(overlay.querySelectorAll('rect')).toHaveLength(0)
		expect(screen.queryByText('0.25H')).not.toBeVisible()
		fireEvent.click(within(groups[0]).getByRole('radio', { name: 'On' }))
		expect(overlay.querySelectorAll('rect')).toHaveLength(12)
		expect(overlay.querySelector('rect')).toHaveAttribute('stroke', 'green')
		expect(overlay.querySelector('rect')).toHaveAttribute('stroke-width', '1')
		expect(overlay.querySelector('rect')).toHaveAttribute('vector-effect', 'non-scaling-stroke')
		expect(within(groups[1]).getByRole('radio', { name: 'Off' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		for (const group of groups.slice(1))
			fireEvent.click(within(group).getByRole('radio', { name: 'On' }))
		expect(container.querySelector('[data-slot="layout-grid-guide-fill"]')).toHaveStyle({
			opacity: 0.05,
		})
		expect(
			container.querySelector('[data-slot="layout-grid-guide-lines"]')?.children,
		).toHaveLength(9)
		expect(screen.getByText('0.25H').closest('[aria-hidden]')).toHaveAttribute(
			'aria-hidden',
			'false',
		)
		unmount()
	} finally {
		if (fonts) Object.defineProperty(document, 'fonts', fonts)
		else Reflect.deleteProperty(document, 'fonts')
		vi.unstubAllGlobals()
	}
})
