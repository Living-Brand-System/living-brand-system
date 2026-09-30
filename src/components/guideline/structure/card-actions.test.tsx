import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { GuidelineCardActions } from './card-actions'
import { GuidelineCardActionsPlayground } from './card-actions-playground'

vi.mock('next/image', () => ({
	default: ({ fill: _fill, alt, ...props }: Record<string, unknown>) => (
		// biome-ignore lint/performance/noImgElement: next/image 테스트 대역입니다.
		<img alt={String(alt)} {...props} />
	),
}))

it('토글 상태는 카드별로 독립적이고 배지·링크·버튼은 각 의미대로 동작한다', () => {
	const { container } = render(<GuidelineCardActionsPlayground />)
	expect(
		container.querySelector('[data-position="start"] button, [data-position="start"] a'),
	).toBeNull()
	expect(
		container.querySelector(
			'[data-position="end"] [data-slot="badge"], [data-position="end"] [data-slot="toggle-group"]',
		),
	).toBeNull()
	expect(
		container.querySelectorAll('[data-position="center"] [data-slot="toggle-group"]'),
	).toHaveLength(2)
	const group = screen.getByLabelText('center 표시 방식')
	const plate = group.querySelector('[data-slot="guideline-card-toggle-backplate"]')
	expect(plate).not.toBeNull()
	fireEvent.click(within(group).getByRole('radio', { name: 'On' }))
	expect(container.querySelectorAll('[data-slot="mock-grid-overlay"]')).toHaveLength(1)
	expect(group.querySelector('[data-slot="guideline-card-toggle-backplate"]')).toBe(plate)
	fireEvent.click(within(group).getByRole('radio', { name: 'On' }))
	expect(within(group).getByRole('radio', { name: 'On' })).toHaveAttribute('aria-checked', 'true')
	fireEvent.click(within(group).getByRole('radio', { name: 'Off' }))
	expect(container.querySelector('[data-slot="mock-grid-overlay"]')).toBeNull()
	fireEvent.click(screen.getByRole('button', { name: '이미지 크기 전환' }))
	expect(screen.getByAltText('크기 전환 예시')).toHaveStyle({ transform: 'scale(0.3)' })
	expect(screen.getByRole('img', { name: '금지' }).tagName).toBe('SPAN')
	expect(screen.getAllByRole('link', { name: '컨테이너선 다운로드' })[0]).toHaveAttribute(
		'download',
	)
	expect(screen.getByRole('link', { name: '원본 이미지 열기' })).not.toHaveAttribute('download')
})

it('복사 완료는 2초 뒤 아이콘으로 돌아가고 재복사하면 시간을 다시 센다', async () => {
	vi.useFakeTimers()
	const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: { writeText: vi.fn().mockResolvedValue(undefined) },
	})
	const { unmount } = render(
		<GuidelineCardActions end={{ kind: 'copy', label: '테스트 복사', value: 'HD' }} />,
	)
	try {
		const button = screen.getByRole('button', { name: '테스트 복사' })
		await act(async () => {
			fireEvent.click(button)
		})
		expect(button).toHaveTextContent('Copied')
		act(() => vi.advanceTimersByTime(1500))
		await act(async () => {
			fireEvent.click(button)
		})
		act(() => vi.advanceTimersByTime(1999))
		expect(button).toHaveTextContent('Copied')
		act(() => vi.advanceTimersByTime(1))
		expect(button).not.toHaveTextContent('Copied')
		expect(button.querySelector('svg')).not.toBeNull()
		await act(async () => {
			fireEvent.click(button)
		})
		unmount()
		expect(vi.getTimerCount()).toBe(0)
	} finally {
		unmount()
		if (original) Object.defineProperty(navigator, 'clipboard', original)
		else Reflect.deleteProperty(navigator, 'clipboard')
		vi.useRealTimers()
	}
})
