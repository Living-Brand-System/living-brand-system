import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { TextSlotInput } from './text-slot-input'

afterEach(cleanup)

const definition = {
	id: 'title',
	kind: 'text' as const,
	label: '제목',
	defaultValue: '',
	maxLength: 20,
}

it.each([
	1, 3,
])('텍스트는 라벨과 입력이 한 표면이며 키보드로 접근한다 (maxLines=%s)', async (maxLines) => {
	const onChange = vi.fn()
	const { container } = render(
		<TextSlotInput
			definition={definition}
			input={{ format: 'free', maxLines }}
			value="제목"
			onChange={onChange}
		/>,
	)
	const input = screen.getByRole('textbox', { name: '제목' })
	const field = input.closest('[data-slot="controller-field"]')
	expect(field).not.toBeNull()
	expect(field).toHaveClass('bg-muted', 'focus-within:ring-2')
	expect(input).toHaveClass('bg-transparent')
	expect(input).toHaveAttribute('maxlength', '20')
	expect(container.querySelector('label')).toHaveAttribute('for', input.id)
	await userEvent.tab()
	expect(input).toHaveFocus()
	fireEvent.change(input, { target: { value: '수정한 제목' } })
	expect(onChange).toHaveBeenCalledWith('수정한 제목')
	fireEvent.change(input, {
		target: {
			value: Array(maxLines + 1)
				.fill('줄')
				.join('\n'),
		},
	})
	if (maxLines > 1) expect(onChange).toHaveBeenCalledTimes(1)
})

it.each(['readonly', 'disabled'] as const)('%s 입력은 값을 바꾸지 않는다', (availability) => {
	const onChange = vi.fn()
	render(
		<TextSlotInput
			definition={{ ...definition, availability }}
			input={{ format: 'free', maxLines: 1 }}
			value="고정 제목"
			onChange={onChange}
		/>,
	)
	if (availability === 'readonly') {
		expect(screen.queryByRole('textbox')).toBeNull()
		expect(screen.getByText('고정 제목')).toBeInTheDocument()
	} else {
		const input = screen.getByRole('textbox', { name: '제목' })
		expect(input).toBeDisabled()
		fireEvent.change(input, { target: { value: '변경' } })
	}
	expect(onChange).not.toHaveBeenCalled()
})

it('이메일 형식 오류를 유지한다', () => {
	render(
		<TextSlotInput
			definition={definition}
			input={{ format: 'email', maxLines: 1 }}
			value="잘못된 주소"
			onChange={() => {}}
		/>,
	)
	expect(screen.getByRole('alert')).toHaveTextContent('이메일 형식이 아니에요.')
})
