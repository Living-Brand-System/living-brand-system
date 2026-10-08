import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioRail, StudioRailIcon } from './studio-rail'

afterEach(cleanup)

it('Active·Idle은 키보드로 접근하고 Disabled는 포커스와 실행에서 제외한다', async () => {
	const user = userEvent.setup()
	const select = vi.fn()
	const blocked = vi.fn()
	render(
		<StudioRail>
			<StudioRailIcon icon="basic" label="Basic" state="active" aria-controls="basic-panel" />
			<StudioRailIcon icon="presets" label="Presets" state="disabled" onClick={blocked} />
			<StudioRailIcon icon="adjustment" label="Adjustment" onClick={select} />
		</StudioRail>,
	)
	const active = screen.getByRole('button', { name: 'Basic' })
	const disabled = screen.getByRole('button', { name: 'Presets' })
	const idle = screen.getByRole('button', { name: 'Adjustment' })
	expect(active).toHaveAttribute('data-state', 'active')
	expect(active).toHaveAttribute('aria-pressed', 'true')
	expect(active).toHaveAttribute('aria-controls', 'basic-panel')
	expect(idle).toHaveAttribute('data-state', 'idle')
	expect(idle).toHaveAttribute('aria-pressed', 'false')
	expect(disabled).toBeDisabled()
	await user.tab()
	expect(active).toHaveFocus()
	await user.tab()
	expect(idle).toHaveFocus()
	await user.keyboard('{Enter}')
	expect(select).toHaveBeenCalledOnce()
	await user.click(disabled)
	expect(blocked).not.toHaveBeenCalled()
})
