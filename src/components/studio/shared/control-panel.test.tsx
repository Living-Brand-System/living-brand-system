import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import {
	arrangeStudioPanel,
	type ControllerCluster,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import {
	type ControllerGroupDefinition,
	type ControllerValues,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'
import { ControlPanel } from './control-panel'

afterEach(cleanup)
// ── 패널 컴포지션(docs/10 §3.7) ────────────────────────────────────────────────

const groups: readonly ControllerGroupDefinition[] = [
	{
		id: 'shape',
		title: 'Shape',
		role: 'form',
		controls: [
			{
				id: 'kind',
				kind: 'select',
				label: 'Kind',
				defaultValue: 'line',
				options: [
					{ value: 'line', label: 'Line' },
					{ value: 'dot', label: 'Dot' },
				],
				variant: 'segmented',
			},
		],
	},
	{
		id: 'detail',
		title: 'Detail',
		role: 'tuning',
		controls: [
			{ id: 'gap', kind: 'range', label: 'Gap', defaultValue: 4, min: 0, max: 10, step: 1 },
			{
				id: 'dotSize',
				kind: 'range',
				label: 'Dot Size',
				defaultValue: 2,
				min: 1,
				max: 5,
				step: 1,
				visibleWhen: { control: 'kind', equals: 'dot' },
			},
		],
	},
	{
		id: 'dimming',
		title: 'Dimming',
		role: 'overlay',
		controls: [{ id: 'dimmer', kind: 'toggle', label: 'Use', defaultValue: false }],
	},
]
const policy: StudioPanelPolicy = { fixed: ['overlay'], basic: ['form'], adjustment: ['tuning'] }

function ComposedPanel({ values }: { values: ControllerValues }) {
	return (
		<ControlPanel
			compositions={[
				{
					slots: arrangeStudioPanel({ groups }, policy, values),
					values,
					onChange: () => {},
				},
			]}
		/>
	)
}

it('빈 프리셋 보기는 숨기고, 탭을 옮겨도 고정 영역과 탭 본문을 지킨다', () => {
	const values = createControllerValues(groups)
	const { container, rerender } = render(<ComposedPanel values={values} />)
	expect(screen.queryByRole('button', { name: 'Presets' })).toBeNull()
	expect(container.querySelector('[data-slot="studio-preset-list"]')).toBeNull()
	const basic = screen.getByRole('radiogroup', { name: 'Kind' })
	fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))
	expect(screen.getByRole('radiogroup', { name: 'Use' })).toBeVisible()
	expect(screen.queryByRole('radiogroup', { name: 'Kind' })).toBeNull()
	fireEvent.click(screen.getByRole('button', { name: 'Basic' }))
	// 탭은 숨길 뿐 다시 그리지 않는다 — 같은 DOM이다.
	expect(screen.getByRole('radiogroup', { name: 'Kind' })).toBe(basic)

	rerender(
		<ControlPanel
			compositions={[
				{
					slots: arrangeStudioPanel({ groups }, { basic: ['form'] }, values),
					values,
					onChange: () => {},
				},
			]}
		/>,
	)
	expect(screen.queryByRole('button', { name: 'Adjustment' })).toBeNull()
	rerender(<ControlPanel />)
	expect(screen.getByRole('button', { name: 'Basic' })).toBeDisabled()
})

it('조건이 바뀌면 컨트롤이 접히며 빠지고, 내용 영역만 다시 그려 고정 영역은 그대로다', async () => {
	const values = createControllerValues(groups)
	const { container, rerender } = render(<ComposedPanel values={{ ...values, kind: 'dot' }} />)
	fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))
	expect(screen.getByRole('slider', { name: 'Dot Size' })).toBeInTheDocument()
	const fixed = container.querySelector('[data-slot="studio-control-fixed"]')
	rerender(<ComposedPanel values={{ ...values, kind: 'line' }} />)
	await waitFor(() => expect(screen.queryByRole('slider', { name: 'Dot Size' })).toBeNull())
	// 구조 서명이 같은 고정 영역은 같은 DOM이다 — 다시 그리지 않았다.
	expect(container.querySelector('[data-slot="studio-control-fixed"]')).toBe(fixed)
})

it('묶음은 레지스트리 위젯으로 그리고, 등록되지 않은 위젯은 경고하고 빼놓는다', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	const clusters: ControllerCluster[] = [
		{
			id: 'pair',
			title: 'Color',
			role: 'palette',
			widget: 'color-pair',
			members: { gate: 'dimmer' },
		},
		{ id: 'cam', title: 'Camera', role: 'palette', widget: 'camera', members: { gate: 'gap' } },
	]
	const values = createControllerValues(groups)
	render(
		<ControlPanel
			compositions={[
				{
					slots: arrangeStudioPanel({ groups, clusters }, { basic: ['palette'] }, values),
					values,
					onChange: () => {},
					widgets: { 'color-pair': ({ cluster }) => <p>{`위젯 ${cluster.title}`}</p> },
				},
			]}
		/>,
	)
	expect(screen.getByText('위젯 Color')).toBeInTheDocument()
	expect(warn).toHaveBeenCalledWith(expect.stringContaining('camera'))
	warn.mockRestore()
})

it('extras는 계약 슬롯을 대체하지 않고 같은 목록 뒤에 이어 붙는다', () => {
	const values = createControllerValues(groups)
	render(
		<ControlPanel
			compositions={[
				{
					slots: arrangeStudioPanel({ groups }, policy, values),
					values,
					onChange: () => {},
				},
			]}
			extras={{ fixed: <section data-slot="controller-group">생성 버튼 자리</section> }}
		/>,
	)
	const fixed = document.querySelector('[data-slot="studio-control-fixed"]') as HTMLElement
	const list = fixed.querySelector('[data-slot="controller-group-list"]') as HTMLElement
	// 계약 슬롯의 Dimming 그룹 다음, 같은 목록 안에 선다 — 간격(상자 위 여백)과 펼침이 이어진다.
	expect(within(list).getByRole('radiogroup', { name: 'Use' })).toBeInTheDocument()
	expect(within(list).getByText('생성 버튼 자리')).toBeInTheDocument()
	expect(list.children).toHaveLength(2)
})
