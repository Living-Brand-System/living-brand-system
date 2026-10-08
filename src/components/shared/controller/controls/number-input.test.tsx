import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControllerNumberInput } from './number-input'

afterEach(cleanup)

function Harness({ accept = true, onCommit = vi.fn(), onInvalid = vi.fn() }) {
	const [value, setValue] = useState(0.5)
	return (
		<ControllerNumberInput
			aria-label="X"
			value={value}
			isValid={(next) => next >= -1 && next <= 1}
			onInvalid={onInvalid}
			onCommit={(next) => {
				onCommit(next)
				// 바깥이 거부하면 값이 그대로다 — 칸도 직전 값으로 남아야 한다.
				if (accept) setValue(next)
			}}
		/>
	)
}

const type = (input: HTMLElement, text: string) => {
	fireEvent.change(input, { target: { value: text } })
	fireEvent.blur(input)
}

describe('ControllerNumberInput', () => {
	it('🔴 칸을 비우면 0으로 덮지 않고 직전 값으로 돌아간다', () => {
		const onCommit = vi.fn()
		render(<Harness onCommit={onCommit} />)
		const input = screen.getByLabelText('X') as HTMLInputElement
		type(input, '')
		expect(onCommit).not.toHaveBeenCalled()
		expect(input.value).toBe('0.5')
	})

	it('범위 밖이면 되돌리고 이유를 알릴 기회를 준다', () => {
		const onInvalid = vi.fn()
		render(<Harness onInvalid={onInvalid} />)
		const input = screen.getByLabelText('X') as HTMLInputElement
		type(input, '3')
		expect(onInvalid).toHaveBeenCalledOnce()
		expect(input.value).toBe('0.5')
	})

	it('떠날 때 한 번 반영하고 칸이 새 값을 보여 준다', () => {
		const onCommit = vi.fn()
		render(<Harness onCommit={onCommit} />)
		const input = screen.getByLabelText('X') as HTMLInputElement
		type(input, '-0.25')
		expect(onCommit).toHaveBeenCalledWith(-0.25)
		expect(input.value).toBe('-0.25')
	})

	it('바깥이 거부하면 칸은 직전 값으로 남는다', () => {
		render(<Harness accept={false} />)
		const input = screen.getByLabelText('X') as HTMLInputElement
		type(input, '0.75')
		expect(input.value).toBe('0.5')
	})
})
