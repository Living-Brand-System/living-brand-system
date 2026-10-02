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
