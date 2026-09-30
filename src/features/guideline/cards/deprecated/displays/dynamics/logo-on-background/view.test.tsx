import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LogoOnBackgroundView } from './view'

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

it.each([152, 600])('배경 선택은 고정 px가 아닌 실제 높이 %i에 비례한다', (height) => {
	vi.stubGlobal('PointerEvent', MouseEvent)
	const bands = Array.from({ length: 5 }, (_, i) => ({
		id: String(i),
		name: `배경 ${i + 1}`,
		hex: '#ffffff',
		monoFill: 'black' as const,
		allowsFullColor: true,
		allowsWhiteWordmark: false,
	}))
	render(
		<LogoOnBackgroundView
			bands={bands}
			logos={{ default: '/logo.svg', white: null, mono: null }}
			column="fullColor"
		/>,
	)
	const slider = screen.getByRole('slider')
	vi.spyOn(slider.parentElement as HTMLElement, 'getBoundingClientRect').mockReturnValue({
		top: 40,
		height,
	} as DOMRect)
	fireEvent.pointerDown(slider, { clientY: 40 + height * 0.85 })
	expect(slider).toHaveAttribute('aria-valuenow', '5')
	expect(slider).toHaveStyle({ height: '20%', top: '80%' })
	fireEvent.pointerMove(slider, { clientY: 0 })
	expect(slider).toHaveAttribute('aria-valuenow', '1')
	fireEvent.pointerUp(slider)
	fireEvent.keyDown(slider, { key: 'ArrowDown' })
	expect(slider).toHaveAttribute('aria-valuenow', '2')
})
