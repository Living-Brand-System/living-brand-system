import { act, render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { GuidelineStickyContainer } from './sticky'

it('고정 기준선을 통과한 카드로 전환하고 역스크롤·기준 위치 변경을 반영한다', () => {
	const disconnect = vi.fn()
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect = disconnect
		},
	)
	let callback: FrameRequestCallback | undefined
	vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => {
		callback = fn
		return 1
	})
	vi.stubGlobal('cancelAnimationFrame', vi.fn())
	let positions = [-600, 60, 700]
	const rect = vi
		.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
		.mockImplementation(function (this: HTMLElement) {
			const index = Number(this.getAttribute('aria-label'))
			return { top: positions[index] ?? 0 } as DOMRect
		})
	const cards = [0, 1, 2].map((index) => ({
		id: String(index),
		caption: { title: String(index) },
		ratio: '1:1' as const,
		display: <div>도판</div>,
	}))
	try {
		const { container, rerender, unmount } = render(
			<GuidelineStickyContainer cards={cards} mode="switch" top={32} />,
		)
		const active = () =>
			container.querySelector('[data-active-card]')?.getAttribute('data-active-card')
		expect(active()).toBe('0')
		rerender(<GuidelineStickyContainer cards={cards} mode="switch" top={80} />)
		expect(active()).toBe('1')
		positions = [-1200, -500, 70]
		act(() => {
			window.dispatchEvent(new Event('scroll'))
			callback?.(0)
		})
		expect(active()).toBe('2')
		positions = [-600, 100, 800]
		act(() => {
			window.dispatchEvent(new Event('scroll'))
			callback?.(0)
		})
		expect(active()).toBe('0')
		unmount()
		expect(disconnect).toHaveBeenCalled()
	} finally {
		rect.mockRestore()
		vi.unstubAllGlobals()
	}
})
