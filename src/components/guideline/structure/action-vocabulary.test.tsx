import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { GuidelineActionVocabularyPlayground } from './action-vocabulary-playground'

it('END 복사와 항목 복사의 대상을 구분하고 실패·색상 선택·초기화를 처리한다', async () => {
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
	const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
	const writeText = vi.fn().mockResolvedValue(undefined)
	Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
	const { container, unmount } = render(
		<GuidelineActionVocabularyPlayground
			colors={{
				'HD HERITAGE GREEN': '#00af41',
				'HD DISCOVERY BLUE': '#003087',
				'HD ECO GREEN': '#73d75a',
			}}
		/>,
	)
	try {
		fireEvent.click(screen.getByRole('button', { name: '브랜드명 복사' }))
		await waitFor(() =>
			expect(screen.getByRole('button', { name: '브랜드명 복사' })).toHaveTextContent(
				'Copied',
			),
		)
		expect(writeText).toHaveBeenLastCalledWith('HD현대')
		const copyItem = screen.getByRole('button', { name: 'HERITAGE GREEN 색상값 복사' })
		expect(copyItem.querySelector('svg')).toBeNull()
		fireEvent.mouseMove(copyItem, { clientX: 100, clientY: 120 })
		expect(screen.getByText('Copy to clipboard')).toHaveStyle({ left: '112px', top: '132px' })
		fireEvent.mouseMove(copyItem, { clientX: 150, clientY: 160 })
		expect(screen.getByText('Copy to clipboard')).toHaveStyle({ left: '162px', top: '172px' })
		fireEvent.click(copyItem)
		await waitFor(() => expect(writeText).toHaveBeenLastCalledWith('#00af41'))
		expect(document.querySelector('[data-slot="copy-cursor-hint"]')).toHaveTextContent('Copied')
		fireEvent.mouseLeave(copyItem)
		expect(document.querySelector('[data-slot="copy-cursor-hint"]')).toBeNull()
		fireEvent.click(screen.getByRole('button', { name: '모든 색상값 복사' }))
		await waitFor(() =>
			expect(writeText).toHaveBeenLastCalledWith(
				'HERITAGE GREEN: #00af41\nDISCOVERY BLUE: #003087\nECO GREEN: #73d75a',
			),
		)
		writeText.mockRejectedValueOnce(new Error('denied'))
		fireEvent.click(screen.getByRole('button', { name: '브랜드명 복사' }))
		await waitFor(() => expect(screen.getByText('복사 실패 · 다시 시도하세요')).toBeVisible())
		const group = screen.getByRole('group', { name: '배경색' })
		const blue = within(group).getByRole('button', { name: 'DISCOVERY BLUE' })
		fireEvent.click(blue)
		expect(blue).toHaveAttribute('aria-pressed', 'true')
		expect(blue).toHaveStyle({ opacity: '1' })
		const frame = group.closest('[data-slot="guideline-card-display"]') as HTMLElement
		expect(frame.style.getPropertyValue('--guideline-display-background')).toBe('#003087')
		fireEvent.change(screen.getByLabelText('배경색 직접 입력'), {
			target: { value: '#123456' },
		})
		expect(frame.style.getPropertyValue('--guideline-display-background')).toBe('#123456')
		expect(blue).toHaveAttribute('aria-pressed', 'false')
		expect(blue).toHaveStyle({ opacity: '0.3' })
		fireEvent.click(screen.getByRole('button', { name: '배경색 초기화' }))
		expect(frame.style.getPropertyValue('--guideline-display-background')).toBe('#00af41')
		expect(
			container.querySelector('[data-position="end"] [data-slot="toggle-group"]'),
		).toBeNull()
		const breadcrumb = screen.getByRole('navigation', { name: 'CI 조합 단계' })
		expect(within(breadcrumb).getByText('해외지사')).toHaveAttribute('aria-current', 'page')
		fireEvent.click(within(breadcrumb).getByRole('button', { name: '본사' }))
		expect(within(breadcrumb).queryByText('해외지사')).toBeNull()
		expect(within(breadcrumb).getByText('본사')).toHaveAttribute('aria-current', 'page')
		fireEvent.click(screen.getByRole('button', { name: 'CI 조합 초기화' }))
		expect(within(breadcrumb).getByText('해외지사')).toHaveAttribute('aria-current', 'page')
		fireEvent.click(screen.getByRole('radio', { name: 'Bold' }))
		expect(screen.getByRole('radio', { name: 'Bold' })).toHaveAttribute('aria-checked', 'true')
	} finally {
		unmount()
		if (original) Object.defineProperty(navigator, 'clipboard', original)
		else Reflect.deleteProperty(navigator, 'clipboard')
		if (fonts) Object.defineProperty(document, 'fonts', fonts)
		else Reflect.deleteProperty(document, 'fonts')
		vi.unstubAllGlobals()
	}
})
