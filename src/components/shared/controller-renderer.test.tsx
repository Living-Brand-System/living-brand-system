import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerGroupDefinition } from '@/modules/studio-controller/controller-definition'
import { ControllerControlRenderer, ControllerRenderer } from './controller-renderer'

afterEach(cleanup)

describe('ControllerRenderer', () => {
	it('모든 그룹을 접을 수 있고 첫 그룹만 상단 구분선을 제거한다', () => {
		const groups = [
			{
				id: 'first',
				title: 'First',
				controls: [
					{ id: 'first-value', kind: 'text', label: 'First value', defaultValue: '' },
				],
			},
			{
				id: 'second',
				title: 'Second',
				controls: [
					{ id: 'second-value', kind: 'text', label: 'Second value', defaultValue: '' },
				],
			},
		] satisfies readonly ControllerGroupDefinition[]

		const { container } = render(
			<ControllerRenderer groups={groups} values={{}} onChange={vi.fn()} />,
		)
		const renderedGroups = container.querySelectorAll('[data-slot="controller-group"]')

		expect(screen.getByRole('button', { name: 'First' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Second' })).toBeInTheDocument()
		expect(renderedGroups[0]).toHaveClass('border-t-0')
		expect(renderedGroups[1]).toHaveClass('border-t')

		fireEvent.click(screen.getByRole('button', { name: 'First' }))
		expect(screen.getByRole('button', { name: 'First' })).toHaveAttribute(
			'aria-expanded',
			'false',
		)
	})

	it('Admin presentation으로 static 그룹과 최초 닫힘을 투영한다', () => {
		const groups = [
			{ id: 'static', title: 'Static', controls: [] },
			{ id: 'closed', title: 'Closed', controls: [] },
		] satisfies readonly ControllerGroupDefinition[]

		render(
			<ControllerRenderer
				groups={groups}
				presentation={{
					groups: [
						{ groupId: 'static', collapsible: false, defaultOpen: true },
						{ groupId: 'closed', collapsible: true, defaultOpen: false },
					],
				}}
				values={{}}
				onChange={() => {}}
			/>,
		)

		expect(screen.getByText('Static').closest('section')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /Closed/ })).toHaveAttribute(
			'data-state',
			'closed',
		)
	})

	it('Published availability를 완화하지 않고 runtime 오류와 Pad 비율을 결합한다', () => {
		const onChange = vi.fn()
		const groups = [
			{
				id: 'controls',
				title: 'Controls',
				controls: [
					{
						id: 'published-readonly',
						kind: 'toggle',
						label: 'Published readonly',
						defaultValue: true,
						availability: 'readonly',
					},
					{
						id: 'runtime-disabled',
						kind: 'toggle',
						label: 'Runtime disabled',
						defaultValue: false,
					},
					{
						id: 'origin',
						kind: 'pad',
						label: 'Origin',
						defaultValue: { x: 0, y: 0 },
						aspectRatio: 1,
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]

		render(
			<ControllerRenderer
				groups={groups}
				values={{}}
				bindings={{
					'published-readonly': { availability: 'enabled' },
					'runtime-disabled': {
						availability: 'disabled',
						error: '새 계약에서 허용하지 않는 값입니다.',
					},
					origin: { padAspectRatio: 16 / 9 },
				}}
				onChange={onChange}
			/>,
		)

		const readonlyRow = screen
			.getByText('Published readonly')
			.closest('[data-slot=controller-row]')
		expect(readonlyRow).not.toBeNull()
		expect(within(readonlyRow as HTMLElement).getByText('On')).toBeInTheDocument()
		expect(within(readonlyRow as HTMLElement).queryByRole('radio')).not.toBeInTheDocument()
		const disabled = screen.getByRole('radio', { name: 'Off' })
		expect(disabled).toBeDisabled()
		fireEvent.click(disabled)
		expect(onChange).not.toHaveBeenCalled()
		expect(screen.getByRole('alert')).toHaveTextContent('새 계약에서 허용하지 않는 값입니다.')
		expect(screen.getByRole('slider', { name: 'Origin' })).toHaveStyle({
			aspectRatio: '1.7777777777777777',
		})
	})

	it('group 없이 단일 control에도 같은 runtime binding을 적용한다', () => {
		const onChange = vi.fn()
		render(
			<ControllerControlRenderer
				definition={{
					id: 'prompt',
					kind: 'text',
					label: 'Prompt',
					defaultValue: '',
					availability: 'readonly',
				}}
				value="입력 유지"
				binding={{
					availability: 'enabled',
					error: '최대 길이를 초과했습니다.',
				}}
				onChange={onChange}
			/>,
		)

		expect(screen.getByText('입력 유지')).toBeInTheDocument()
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
		expect(screen.getByRole('alert')).toHaveTextContent('최대 길이를 초과했습니다.')
	})

	it('선택지가 전부 색을 가지면 variant보다 칩 그리드가 앞선다', () => {
		// 이 분기가 뒤집히면 색 축이 조용히 드롭다운으로, 평범한 축이 칩으로 그려진다.
		const colorway = {
			id: 'colorway',
			kind: 'select' as const,
			label: '컬러',
			defaultValue: 'dark',
			variant: 'segmented' as const,
			options: [
				{ value: 'white', label: '화이트 · 연그린', colors: ['#FFFFFF', '#DCF5D2'] },
				{ value: 'dark', label: '다크그린 · 그린', colors: ['#00280A', '#007332'] },
			],
		}
		const onChange = vi.fn()
		render(<ControllerControlRenderer definition={colorway} value="dark" onChange={onChange} />)

		// 칩은 네이티브 radio input이고 segmented는 button이라 요소로 갈린다.
		expect(screen.getByRole('radio', { name: '다크그린 · 그린' })).toBeChecked()
		expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(2)
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

		cleanup()
		// 하나라도 색이 없으면 그 control의 variant가 정한 표현으로 떨어진다.
		render(
			<ControllerControlRenderer
				definition={{
					...colorway,
					options: [colorway.options[0], { value: 'dark', label: '다크그린 · 그린' }],
				}}
				value="dark"
				onChange={onChange}
			/>,
		)

		expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0)
		expect(screen.getAllByRole('radio')).toHaveLength(2)
	})
	it('그룹이 전부 색이면 한 띠로 그린다 — 조합은 행으로 쌓지 않는다', () => {
		const groups = [
			{
				id: 'palette',
				title: 'Ray Palette',
				controls: [
					{ id: 'c1', kind: 'color', label: '광선 색상 1', defaultValue: '#000000' },
					{ id: 'c2', kind: 'color', label: '광선 색상 2', defaultValue: '#ffffff' },
				],
			},
		] satisfies readonly ControllerGroupDefinition[]
		const onChange = vi.fn()

		const { container } = render(
			<ControllerRenderer groups={groups} values={{}} onChange={onChange} />,
		)
		const strip = container.querySelector<HTMLElement>('[data-slot="controller-color-strip"]')
		if (!strip) throw new Error('색 띠가 없다')

		// 칸마다 자기 control의 이름을 갖는다 — 띠가 되어도 스크린리더가 칸을 구분할 수 있어야 한다.
		expect(within(strip).getByLabelText('광선 색상 1 색상 선택')).toHaveValue('#000000')
		expect(within(strip).getByLabelText('광선 색상 2 색상 선택')).toHaveValue('#ffffff')
		// hex 글자 행은 사라진다 — 조합을 볼 때 숫자는 정보가 아니다.
		expect(screen.queryByText('#000000')).toBeNull()

		fireEvent.change(within(strip).getByLabelText('광선 색상 2 색상 선택'), {
			target: { value: '#123456' },
		})
		expect(onChange).toHaveBeenCalledWith('c2', '#123456')

		// 🔴 되돌리기는 칸을 비우지 않고 원래 색으로 채운다 — 팔레트가 없는 런타임도 같다.
		//    null은 「미설정」이라 띠가 흐린 검정이 되는데 화면에는 기본색이 그려져 띠가 거짓말을 한다.
		fireEvent.click(screen.getByRole('button', { name: /되돌리기/ }))
		expect(onChange).toHaveBeenCalledWith('c1', '#000000')
		expect(onChange).toHaveBeenCalledWith('c2', '#ffffff')
	})

	it('조합을 고르는 select이 색 칸 앞에 서면 칩이 띠를 채운다', () => {
		const groups = [
			{
				id: 'palette',
				title: 'Ray Palette',
				controls: [
					{
						id: 'palette',
						kind: 'select',
						label: '팔레트',
						defaultValue: 'green',
						options: [
							{ value: 'green', label: '그린', colors: ['#000000', '#ffffff'] },
							{ value: 'blue', label: '블루', colors: ['#001133', '#e0f2ff'] },
						],
					},
					{ id: 'c1', kind: 'color', label: '광선 색상 1', defaultValue: '#000000' },
					{ id: 'c2', kind: 'color', label: '광선 색상 2', defaultValue: '#ffffff' },
				],
			},
		] satisfies readonly ControllerGroupDefinition[]
		const onChange = vi.fn()

		const { container } = render(
			<ControllerRenderer groups={groups} values={{}} onChange={onChange} />,
		)
		// 고르기(칩)와 편집(띠)이 한 그룹에 함께 선다 — 둘 중 하나만 남기면 조합을 볼 수 없다.
		expect(container.querySelector('[data-slot="controller-color-chips"]')).not.toBeNull()
		expect(container.querySelector('[data-slot="controller-color-strip"]')).not.toBeNull()

		// 🔴 고른 조합이 칸을 **순서대로** 채운다 — 띠가 화면의 색과 어긋나면 조합을 읽을 수 없다.
		fireEvent.click(screen.getByRole('radio', { name: '블루' }))
		expect(onChange).toHaveBeenCalledWith('palette', 'blue')
		expect(onChange).toHaveBeenCalledWith('c1', '#001133')
		expect(onChange).toHaveBeenCalledWith('c2', '#e0f2ff')

		// 되돌리기는 칸을 비우지 않고 기본 조합으로 채운다 — null은 「미설정」이라 띠가 흐려진다.
		onChange.mockClear()
		fireEvent.click(screen.getByRole('button', { name: /되돌리기/ }))
		expect(onChange).toHaveBeenCalledWith('palette', null)
		expect(onChange).toHaveBeenCalledWith('c1', '#000000')
		expect(onChange).toHaveBeenCalledWith('c2', '#ffffff')
	})

	it('🔴 색 개수가 칸 수와 어긋나는 선택지는 조합이 아니다 — 채울 짝이 없다', () => {
		const groups = [
			{
				id: 'palette',
				title: 'Ray Palette',
				controls: [
					{
						id: 'palette',
						kind: 'select',
						label: '팔레트',
						defaultValue: 'green',
						options: [{ value: 'green', label: '그린', colors: ['#000000'] }],
					},
					{ id: 'c1', kind: 'color', label: '광선 색상 1', defaultValue: '#000000' },
					{ id: 'c2', kind: 'color', label: '광선 색상 2', defaultValue: '#ffffff' },
				],
			},
		] satisfies readonly ControllerGroupDefinition[]

		const { container } = render(
			<ControllerRenderer groups={groups} values={{}} onChange={vi.fn()} />,
		)
		expect(container.querySelector('[data-slot="controller-color-strip"]')).toBeNull()
	})

	it('🔴 허용 색 목록이 있는 색은 띠가 되지 않는다 — 라디오 묶음을 피커로 바꾸면 계약이 넓어진다', () => {
		const groups = [
			{
				id: 'brand',
				title: 'Brand',
				controls: [
					{
						id: 'line',
						kind: 'color',
						label: 'Line Color',
						defaultValue: '#000000',
						values: ['#000000', '#ffffff'],
					},
					{
						id: 'background',
						kind: 'color',
						label: 'Background Color',
						defaultValue: '#ffffff',
						values: ['#000000', '#ffffff'],
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]

		const { container } = render(
			<ControllerRenderer groups={groups} values={{}} onChange={vi.fn()} />,
		)

		expect(container.querySelector('[data-slot="controller-color-strip"]')).toBeNull()
		expect(screen.getByRole('radiogroup', { name: 'Line Color' })).toBeInTheDocument()
	})

	it('선택지가 전부 형태를 들면 썸네일 그리드로 그린다', () => {
		const groups = [
			{
				id: 'shape',
				title: 'Shape',
				controls: [
					{
						id: 'shape',
						kind: 'select',
						label: '모양',
						defaultValue: 'linear',
						options: [
							{ value: 'linear', label: '가로', preview: [[0, 0.5, 1, 0.5]] },
							{ value: 'vertical', label: '세로', preview: [[0.5, 0, 0.5, 1]] },
						],
					},
				],
			},
		] satisfies readonly ControllerGroupDefinition[]
		const onChange = vi.fn()

		const { container } = render(
			<ControllerRenderer groups={groups} values={{}} onChange={onChange} />,
		)
		const chips = container.querySelector<HTMLElement>('[data-slot="controller-preview-chips"]')
		if (!chips) throw new Error('썸네일 그리드가 없다')

		expect(chips).toHaveAttribute('role', 'radiogroup')
		expect(chips).toHaveAttribute('aria-label', '모양')
		// 그림은 파일이 아니라 좌표에서 나온다 — path 하나로 이어 붙여 그린다.
		expect(chips.querySelectorAll('svg path')).toHaveLength(2)
		expect(chips.querySelector('svg path')).toHaveAttribute('d', 'M0 0.5L1 0.5')

		fireEvent.click(screen.getByText('세로'))
		expect(onChange).toHaveBeenCalledWith('shape', 'vertical')
	})
})
