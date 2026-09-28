import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GuidelineGridPlayground } from '../structure/grid-playground'
import { GuidelineStickyPlayground } from '../structure/sticky-playground'
import { CorporateIdentityReference } from './corporate-identity'
import { DigitalPublicationsReference } from './digital-publications'
import { IconographyReference } from './iconography'
import { InfographicsReference } from './infographics'
import { KeyVisualsReference } from './key-visuals'
import { LayoutsReference } from './layouts'
import { PhysicalPublicationsReference } from './physical-publications'
import { TypographyReference } from './typography'

vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))
afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

it.each(
	[
		CorporateIdentityReference,
		DigitalPublicationsReference,
		IconographyReference,
		InfographicsReference,
		KeyVisualsReference,
		LayoutsReference,
		PhysicalPublicationsReference,
		TypographyReference,
		GuidelineGridPlayground,
		GuidelineStickyPlayground,
	].map((Page) => [Page.name, Page] as const),
)('%s는 섹션을 중첩하거나 개별 패딩 래퍼로 감싸지 않는다', (_name, Page) => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	const { container } = render(<Page />)
	const sections = [...container.querySelectorAll('[data-slot="guideline-section"]')]
	expect(sections.length).toBeGreaterThan(1)
	const parent = sections[0].parentElement
	for (const section of sections) {
		expect(section.parentElement).toBe(parent)
		expect(section.querySelector('[data-slot="guideline-section"]')).toBeNull()
		expect(section.firstElementChild).toHaveAttribute('data-slot', 'guideline-section-heading')
		const heading = section.querySelector('h2, h3')
		expect(heading?.tagName).toBe(
			section.getAttribute('data-hierarchy') === 'sub' ? 'H3' : 'H2',
		)
	}
})
