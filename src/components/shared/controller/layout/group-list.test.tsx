import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, expect, it } from 'vitest'
import { Controller } from '../index'

afterEach(cleanup)

function GroupListExample({ middle = true }: { middle?: boolean }) {
	const [value, setValue] = useState('원본')
	return (
		<Controller.GroupList>
			<Controller.Group title="첫 그룹">
				<Controller.Field label="제목">
					<Controller.Input
						value={value}
						onChange={(event) => setValue(event.target.value)}
					/>
				</Controller.Field>
				<Controller.Row label="값">0.2</Controller.Row>
			</Controller.Group>
			{middle && (
				<Controller.Group title="중간 그룹" collapsible={false}>
					<Controller.Row label="중간 값">0.5</Controller.Row>
				</Controller.Group>
			)}
			<Controller.Group title="마지막 그룹">
				<Controller.Row label="마지막 값">1</Controller.Row>
			</Controller.Group>
		</Controller.GroupList>
	)
}

it('그룹 제거·접기 후에도 목록 간격과 입력값을 유지한다', async () => {
	const user = userEvent.setup()
	const { container, rerender } = render(<GroupListExample />)
	const list = container.querySelector('[data-slot="controller-group-list"]')
	// 간격은 gap이 아니라 각 상자의 위 여백이다 — 생기고 빠지는 그룹이 높이로 펼쳐지고 접힌다.
	expect(list).toHaveClass('-mt-2')
	expect(list).not.toHaveClass('gap-3', 'pb-3')
	const first = list?.firstElementChild
	expect(first).toHaveAttribute('data-slot', 'controller-presence-item')
	expect(first).toHaveClass('pt-3')
	const content = first?.querySelector('[data-slot="controller-group-content"]')
	expect(content).toHaveStyle({ clipPath: 'inset(-2px -20px)' })
	expect(content?.querySelector('[data-slot="controller-presence-item"]')).toHaveClass('pt-1.5')
	await user.click(screen.getByRole('textbox', { name: '제목' }))
	await user.clear(screen.getByRole('textbox', { name: '제목' }))
	await user.type(screen.getByRole('textbox', { name: '제목' }), '수정')
	await user.click(screen.getByRole('button', { name: '첫 그룹' }))
	await waitFor(() => expect(content).toHaveStyle({ height: '0px', opacity: '0' }))
	expect(list?.children).toHaveLength(3)
	rerender(<GroupListExample middle={false} />)
	// 빠진 그룹은 접히는 모션이 끝난 뒤 사라진다.
	await waitFor(() => expect(list?.children).toHaveLength(2))
	fireEvent.click(screen.getByRole('button', { name: '첫 그룹' }))
	const input = await screen.findByRole('textbox', { name: '제목' })
	expect(input).toHaveValue('수정')
	await user.tab()
	expect(input).toHaveFocus()
})
