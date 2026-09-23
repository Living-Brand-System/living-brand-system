import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import { GlobalHeader, type NavigationHeaderUpdates } from './global-header'

let pathname = ''
// 헤더는 마운트 때 /api/users/me를 묻는다 — 테스트가 그 답을 정한다.
let sessionUser: { email: string } | null = null
const push = vi.fn()

vi.stubGlobal(
	'ResizeObserver',
	class {
		disconnect() {}
		observe() {}
		unobserve() {}
	},
)

vi.mock('next/navigation', () => ({
	usePathname: () => pathname,
	useRouter: () => ({ push }),
}))

function renderHeader(updates?: NavigationHeaderUpdates) {
	return render(
		createElement(
			SidebarProvider,
			{ defaultOpen: false },
			createElement(GlobalHeader, {
				guidelineChapters: [
					{
						id: 1,
						topics: [],
						title: 'Foundations',
					},
				],
				updates,
			}),
		),
	)
}

describe('GlobalHeader', () => {
	beforeEach(() => {
		pathname = '/studio/graphic'
		push.mockReset()
		localStorage.clear()
		sessionUser = null
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ json: async () => ({ user: sessionUser }), ok: true })),
		)
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({
				addEventListener: vi.fn(),
				matches: false,
				removeEventListener: vi.fn(),
			})),
		)
	})

	afterEach(cleanup)

	it('로그인하면 Log in 대신 Account와 Logout 둘이 선다', async () => {
		sessionUser = { email: 'someone@plus-ex.com' }
		renderHeader()

		const desktop = document.querySelector<HTMLElement>(
			'[data-slot="navigation-header-desktop"]',
		) as HTMLElement
		expect(await within(desktop).findByRole('link', { name: 'Account' })).toHaveAttribute(
			'href',
			'/account',
		)
		expect(within(desktop).getByRole('button', { name: 'Logout' })).toBeInTheDocument()
		expect(within(desktop).queryByRole('link', { name: 'Log in' })).toBeNull()
	})

	it('메가 메뉴 없이 직접 링크와 current·update 상태를 표시한다', async () => {
		renderHeader({ guideline: true, image: true })

		const header = document.querySelector('[data-slot="navigation-header"]')
		expect(header).toHaveClass('bg-header-background')
		expect(header).not.toHaveClass('border-b', 'border-border')
		const desktop = document.querySelector<HTMLElement>(
			'[data-slot="navigation-header-desktop"]',
		)
		expect(desktop).not.toBeNull()
		const navigation = within(desktop as HTMLElement).getByRole('navigation', {
			name: '주요 메뉴',
		})
		const links = within(navigation)

		// 🔴 이 단언이 「Payload 주소가 헤더에 노출되지 않는다」를 지키는 유일한 검사기다.
		expect(
			await within(desktop as HTMLElement).findByRole('link', { name: 'Log in' }),
		).toHaveAttribute('href', '/login')
		expect(within(desktop as HTMLElement).queryByRole('link', { name: 'Login' })).toBeNull()
		expect(links.getByRole('link', { name: /Guideline/ })).toHaveAttribute('href', '/guideline')
		expect(links.getByRole('link', { name: 'Template' })).toHaveAttribute(
			'href',
			'/studio/template',
		)
		expect(links.getByRole('link', { name: /Image/ })).toHaveAttribute('href', '/studio/image')
		expect(links.getByRole('link', { name: 'Graphic' })).toHaveAttribute(
			'href',
			'/studio/graphic',
		)
		expect(links.getByRole('link', { name: 'MCP' })).toHaveAttribute('href', '/studio/mcp')
		expect(links.getByRole('link', { name: 'Review' })).toHaveAttribute(
			'href',
			'/studio/review',
		)
		expect(links.getByRole('link', { name: 'Assets' })).toHaveAttribute(
			'href',
			'/studio/assets',
		)
		expect(links.getByRole('link', { name: 'Graphic' })).toHaveAttribute('aria-current', 'page')
		expect(
			within(links.getByRole('link', { name: /Guideline/ })).getByText('Update'),
		).toBeVisible()
		expect(within(links.getByRole('link', { name: /Image/ })).getByText('Update')).toBeVisible()
		expect(screen.queryByRole('button', { name: 'Studio' })).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: '메뉴 닫기' })).not.toBeInTheDocument()
	})

	it('데스크톱 세퍼레이터에 Figma 규격의 높이를 준다', () => {
		renderHeader()

		const separator = document.querySelector<HTMLElement>(
			'[data-slot="navigation-header-separator"] [data-slot="separator"]',
		)
		expect(separator).toHaveClass('h-full')
	})

	it('검색과 Chat의 열린 상태를 각 트리거에 반영한다', () => {
		renderHeader()

		const desktop = document.querySelector<HTMLElement>(
			'[data-slot="navigation-header-desktop"]',
		)
		expect(desktop).not.toBeNull()
		const searchTrigger = within(desktop as HTMLElement).getByRole('button', {
			name: '가이드라인 검색',
		})
		const chatTrigger = within(desktop as HTMLElement).getByRole('button', { name: 'Chat' })

		expect(searchTrigger).toHaveAttribute('aria-expanded', 'false')
		fireEvent.click(searchTrigger)
		expect(searchTrigger).toHaveAttribute('aria-expanded', 'true')
		expect(screen.getByRole('dialog', { name: '가이드라인 검색' })).toBeVisible()

		expect(chatTrigger).toHaveAttribute('aria-expanded', 'false')
		fireEvent.click(chatTrigger)
		expect(chatTrigger).toHaveAttribute('aria-expanded', 'true')
	})

	it('Assets 경로에서는 Assets만 current로 표시한다', () => {
		pathname = '/studio/assets'
		renderHeader()

		const desktop = document.querySelector<HTMLElement>(
			'[data-slot="navigation-header-desktop"]',
		)
		expect(desktop).not.toBeNull()
		expect(
			within(desktop as HTMLElement).getByRole('link', { name: 'Assets' }),
		).toHaveAttribute('aria-current', 'page')
		expect(
			within(desktop as HTMLElement).getByRole('link', { name: 'Graphic' }),
		).not.toHaveAttribute('aria-current')
	})

	it('그룹 링크의 체이서가 호버한 링크 폭으로 이동한다', () => {
		renderHeader()

		const graphic = screen.getByRole('link', { name: 'Graphic' })
		const template = screen.getByRole('link', { name: 'Template' })
		const group = graphic.closest<HTMLElement>('[data-slot="navigation-header-link-group"]')

		expect(group).not.toBeNull()
		const chaser = () =>
			group?.querySelector<HTMLElement>('[data-slot="navigation-header-link-chaser"]')
		expect(chaser()).toHaveAttribute('data-target-index', '2')

		fireEvent.mouseEnter(template)
		expect(chaser()).toHaveAttribute('data-target-index', '0')

		fireEvent.mouseLeave(template)
		expect(chaser()).toHaveAttribute('data-target-index', '2')
	})

	it('컴팩트 메뉴를 헤더 흐름 안에서 펼치고 접는다', () => {
		renderHeader({ graphic: true })

		const compact = document.querySelector<HTMLElement>(
			'[data-slot="navigation-header-compact"]',
		)
		expect(compact).not.toBeNull()
		const compactView = within(compact as HTMLElement)
		const menuTrigger = compactView.getByRole('button', { name: '메뉴' })

		expect(menuTrigger).toHaveAttribute('aria-expanded', 'false')
		expect(compactView.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument()

		fireEvent.click(menuTrigger)

		expect(menuTrigger).toHaveAttribute('aria-expanded', 'true')
		const navigation = compactView.getByRole('navigation', { name: '주요 메뉴' })
		expect(navigation.closest('[data-slot="navigation-header-compact-body"]')).toHaveAttribute(
			'id',
			'navigation-header-compact-menu',
		)
		expect(within(navigation).getByRole('link', { name: /Graphic/ })).toHaveAttribute(
			'aria-current',
			'page',
		)
		expect(
			within(within(navigation).getByRole('link', { name: /Graphic/ })).getByText('Update'),
		).toBeVisible()

		fireEvent.click(menuTrigger)
		expect(menuTrigger).toHaveAttribute('aria-expanded', 'false')
		expect(compactView.queryByRole('navigation', { name: '주요 메뉴' })).not.toBeInTheDocument()
	})
})
