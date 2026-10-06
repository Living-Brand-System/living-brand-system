import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LandingHero } from './landing-hero'

// 셰이더는 jsdom에서 돌지 않는다 — 배경층이 셰이더를 세우라고 했는지(active)만 본다.
vi.mock('@/components/shared/page-hero', () => ({
	PageHero: ({ active }: { active: boolean }) => (
		<div data-slot="page-hero" data-active={String(active)} />
	),
}))

let report: (visible: boolean) => void = () => {}
class FakeIntersectionObserver {
	constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
		report = (visible) => callback([{ isIntersecting: visible }])
	}
	observe() {}
	disconnect() {}
}
vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
afterEach(() => vi.clearAllMocks())

it('히어로 자리가 화면을 벗어나면 배경층을 감추고 셰이더를 내린다', () => {
	const { container } = render(
		<LandingHero size="screen" fade="down">
			<h1>Brand Guideline</h1>
		</LandingHero>,
	)
	const backdrop = container.querySelector('[data-slot="landing-hero-backdrop"]')
	const shader = () => container.querySelector('[data-slot="page-hero"]')
	expect(backdrop).not.toHaveClass('opacity-0')
	expect(shader()).toHaveAttribute('data-active', 'true')

	act(() => report(false))
	expect(backdrop).toHaveClass('opacity-0')
	expect(shader()).toHaveAttribute('data-active', 'false')

	// 다시 보이면 되살린다.
	act(() => report(true))
	expect(backdrop).not.toHaveClass('opacity-0')
	expect(shader()).toHaveAttribute('data-active', 'true')
})

it('배경층은 히어로 자리가 위로 밀려난 만큼 함께 올라간다 — 목차 열 뒤에서 잘리지 않게', async () => {
	const { container } = render(
		<div data-testid="scroller" style={{ overflowY: 'auto' }}>
			<LandingHero size="screen" fade="down">
				<h1>Brand Guideline</h1>
			</LandingHero>
		</div>,
	)
	const backdrop = container.querySelector('[data-slot="landing-hero-backdrop"]') as HTMLElement
	const place = container.querySelector('[data-slot="landing-hero"]') as HTMLElement
	const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
	place.getBoundingClientRect = () => ({ top: -240 }) as DOMRect
	act(() => {
		container.querySelector('[data-testid="scroller"]')?.dispatchEvent(new Event('scroll'))
	})
	await act(frame)
	expect(backdrop.style.transform).toBe('translate3d(0, -240px, 0)')

	// 되튕김으로 아래로 내려온 값은 따라가지 않는다.
	place.getBoundingClientRect = () => ({ top: 30 }) as DOMRect
	act(() => {
		container.querySelector('[data-testid="scroller"]')?.dispatchEvent(new Event('scroll'))
	})
	await act(frame)
	expect(backdrop.style.transform).toBe('translate3d(0, 0px, 0)')
})
