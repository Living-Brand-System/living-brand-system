import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useActiveSectionAnchor } from '@/features/guideline/hooks/use-guideline-section-navigation'
import type { GetGuidelineNavigationOutput } from '@/features/guideline/services/get-guideline-navigation.service'
import { GuidelineSideNavigation } from './guideline-side-navigation'

vi.mock('next/navigation', () => ({
	usePathname: () => '/guideline/guidelines/lbs-structure',
}))

vi.mock('@/features/guideline/hooks/use-guideline-section-navigation', () => ({
	scrollToGuidelineSection: vi.fn(),
	useActiveSectionAnchor: vi.fn((anchors: string[]) => anchors[0] ?? null),
}))

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

const chapters: GetGuidelineNavigationOutput['chapters'] = [
	{
		id: 1,
		title: 'Guidelines',
		topics: [
			{
				id: 2,
				title: 'LBS Structure',
				href: '/guideline/guidelines/lbs-structure',
				sections: [
					{
						id: 'naming-definition',
						headingLevel: 2,
						parentSectionId: null,
						anchor: 'naming-definition',
						title: 'Naming definition',
						href: '/guideline/guidelines/lbs-structure#naming-definition',
					},
					{
						id: 'japanese',
						headingLevel: 3,
						parentSectionId: 'naming-definition',
						anchor: 'japanese',
						title: 'Japanese',
						href: '/guideline/guidelines/lbs-structure#japanese',
					},
				],
			},
			{
				id: 5,
				title: 'Identity',
				href: '/guideline/guidelines/identity',
				sections: [
					{
						id: 'identity-details',
						headingLevel: 2,
						parentSectionId: null,
						anchor: 'identity-details',
						title: 'Identity details',
						href: '/guideline/guidelines/identity#identity-details',
					},
				],
			},
		],
	},
]

describe('GuidelineSideNavigation', () => {
	it('TOC는 depth 2까지만 표시하고 보이는 섹션만 위치 추적한다', () => {
		const { container } = render(
			<TooltipProvider>
				<SidebarProvider>
					<GuidelineSideNavigation chapters={chapters} />
				</SidebarProvider>
			</TooltipProvider>,
		)

		expect(screen.getByRole('navigation', { name: '가이드라인 목차' })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: 'Guidelines' }).closest('li')).toHaveAttribute(
			'data-depth',
			'0',
		)
		expect(screen.getByRole('link', { name: 'LBS Structure' }).closest('li')).toHaveAttribute(
			'data-depth',
			'1',
		)
		expect(screen.getByRole('link', { name: 'Naming definition' })).toHaveAttribute(
			'aria-current',
			'location',
		)
		expect(
			screen.getByRole('link', { name: 'Naming definition' }).closest('li'),
		).toHaveAttribute('data-depth', '2')
		expect(screen.queryByRole('link', { name: 'Japanese' })).not.toBeInTheDocument()
		expect(container.querySelector('[data-depth="3"]')).toBeNull()
		expect(useActiveSectionAnchor).toHaveBeenCalledWith(['naming-definition'])
		expect(screen.queryByRole('link', { name: 'Identity details' })).not.toBeInTheDocument()
		expect(container.querySelector('[data-slot="guideline-side-navigation"]')).toHaveClass(
			'md:w-[265px]',
		)
	})
})
