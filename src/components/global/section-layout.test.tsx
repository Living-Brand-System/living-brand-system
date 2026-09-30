import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SectionLayout } from './section-layout'

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

describe('SectionLayout', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({
				addEventListener: vi.fn(),
				matches: false,
				removeEventListener: vi.fn(),
			})),
		)
	})

	it('workspace는 데스크톱 외부 스크롤을 제거한다', () => {
		const { container } = render(
			<SectionLayout variant="workspace">
				<div>Studio</div>
			</SectionLayout>,
		)

		// 🔴 상단 여백은 셸이 아니라 본문 안쪽이 갖는다 — 그래야 본문이 헤더 밑으로 흘러간다.
		expect(container.querySelector('[data-slot="section-scroll-container"]')).not.toHaveClass(
			'xl:pt-(--global-header-height)',
		)
		expect(container.querySelector('main')).toHaveClass(
			'pt-[50px]',
			'xl:pt-(--global-header-height)',
		)
		expect(container.querySelector('[data-slot="section-scroll-container"]')).toHaveClass(
			'lg:overflow-hidden',
		)
	})

	it('nav가 없으면 사이드바 셸과 모바일 트리거를 그리지 않는다', () => {
		const { container } = render(
			<SectionLayout variant="workspace">
				<div>Studio</div>
			</SectionLayout>,
		)

		expect(container.querySelector('[data-slot="sidebar-wrapper"]')).toBeNull()
		expect(container.querySelector('[data-slot="sidebar-trigger"]')).toBeNull()
	})

	it('nav가 있으면 사이드바 셸이 nav를 감싼다', () => {
		const { container } = render(
			<SectionLayout nav={<nav data-testid="section-nav" />}>
				<div>Docs</div>
			</SectionLayout>,
		)

		const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]')
		expect(wrapper).not.toBeNull()
		expect(wrapper?.querySelector('[data-testid="section-nav"]')).not.toBeNull()
	})
})
