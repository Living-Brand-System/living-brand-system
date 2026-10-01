import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ControlPanel } from './control-panel'

afterEach(cleanup)
it('빈 프리셋 보기는 숨기고 고정 액션과 탭별 입력 상태를 유지한다', () => {
	const { container, rerender } = render(
		<ControlPanel
			fixed={<button type="button">생성</button>}
			basic={<input aria-label="Prompt" defaultValue="" />}
			adjustment={<p>조정</p>}
		/>,
	)
	expect(screen.queryByRole('button', { name: 'Presets' })).toBeNull()
	expect(container.querySelector('[data-slot="studio-preset-list"]')).toBeNull()
	fireEvent.change(screen.getByRole('textbox'), { target: { value: '보존할 입력' } })
	fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))
	expect(screen.getByRole('button', { name: '생성' })).toBeVisible()
	expect(screen.queryByRole('textbox')).toBeNull()
	fireEvent.click(screen.getByRole('button', { name: 'Basic' }))
	expect(screen.getByRole('textbox')).toHaveValue('보존할 입력')
	rerender(<ControlPanel basic={<p>기본만</p>} />)
	expect(screen.queryByRole('button', { name: 'Adjustment' })).toBeNull()
	expect(screen.getByText('기본만')).toBeVisible()
	rerender(<ControlPanel />)
	expect(screen.getByRole('button', { name: 'Basic' })).toBeDisabled()
})
