import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ControllerInput } from './input'
import { ControllerStack } from './stack'

afterEach(cleanup)

const items = ['가로', '세로', '배율'].map((label) => ({
	id: label,
	label,
	icon: <span>↔</span>,
	children: <ControllerInput defaultValue="0" />,
}))

it.each([
	1, 2, 3,
])('%i개 스택은 원래 이름으로 입력할 수 있고 3개에서만 텍스트 라벨을 숨긴다', async (count) => {
	const user = userEvent.setup()
	const { container } = render(
		<TooltipProvider>
			<ControllerStack items={items.slice(0, count)} />
		</TooltipProvider>,
	)
	expect(screen.getAllByRole('textbox')).toHaveLength(count)
	expect(container.querySelectorAll('label .sr-only')).toHaveLength(count === 3 ? 3 : 0)
	await user.tab()
	if (count === 3) expect(await screen.findByRole('tooltip')).toHaveTextContent('가로')
	await user.click(within(container).getByText('가로'))
	expect(screen.getByRole('textbox', { name: '가로' })).toHaveFocus()
	await user.type(screen.getByRole('textbox', { name: '가로' }), '5')
	expect(screen.getByRole('textbox', { name: '가로' })).toHaveValue('05')
})

it('빈 스택과 4개 스택은 거부한다', () => {
	expect(() => render(<ControllerStack items={[]} />)).toThrow('1~3개')
	expect(() =>
		render(<ControllerStack items={[...items, { ...items[0], id: 'extra' }]} />),
	).toThrow('1~3개')
})
