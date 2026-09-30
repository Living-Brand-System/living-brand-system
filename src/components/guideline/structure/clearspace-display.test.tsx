import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { GuidelineClearspaceDisplay } from './clearspace-display'

it('Off로 시작하고 카드별 On 상태가 독립적이며 로고는 유지된다', () => {
	const { container } = render(
		<>
			<GuidelineClearspaceDisplay logoSrc="/logo.png" gridSrc="/guide.svg" alt="첫 로고" />
			<GuidelineClearspaceDisplay logoSrc="/logo.png" gridSrc="/guide.svg" alt="둘째 로고" />
		</>,
	)
	expect(container.querySelectorAll('[data-slot="clearspace-overlay"]')).toHaveLength(0)
	const first = within(screen.getByRole('radiogroup', { name: '첫 로고 가이드' }))
	fireEvent.click(first.getByRole('radio', { name: 'On' }))
	expect(container.querySelectorAll('[data-slot="clearspace-overlay"]')).toHaveLength(1)
	expect(screen.getByAltText('첫 로고')).toBeVisible()
	expect(
		within(screen.getByRole('radiogroup', { name: '둘째 로고 가이드' })).getByRole('radio', {
			name: 'Off',
		}),
	).toHaveAttribute('aria-checked', 'true')
	fireEvent.click(first.getByRole('radio', { name: 'Off' }))
	expect(container.querySelectorAll('[data-slot="clearspace-overlay"]')).toHaveLength(0)
})
