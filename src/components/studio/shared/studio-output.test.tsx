import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StudioOutput } from './studio-output'

afterEach(cleanup)

describe('StudioOutput.Actions', () => {
	it('결과가 한 장이면 저장 하나, 여러 장이면 선택·전체 저장으로 그린다', () => {
		const run = vi.fn()
		const { rerender } = render(
			<StudioOutput.Actions save={{ canExport: true, run }} busy={false} />,
		)
		fireEvent.click(screen.getByRole('button', { name: '저장' }))
		expect(run).toHaveBeenCalledOnce()

		rerender(
			<StudioOutput.Actions
				save={{ selected: { canExport: false, run }, all: { canExport: true, run } }}
				busy={false}
			/>,
		)
		expect(screen.getByRole('button', { name: '선택 저장' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '전체 저장' })).toBeEnabled()
	})

	it('내보내는 중에는 저장을 막는다', () => {
		render(<StudioOutput.Actions save={{ canExport: true, run: vi.fn() }} busy />)
		expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
	})
})
