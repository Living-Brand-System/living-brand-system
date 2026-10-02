import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ControllerRenderer } from '@/components/shared/controller-renderer'
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
// useId가 렌더마다 다른 id를 준다 — 구조만 비교한다.
const normalize = (html: string) => html.replace(/_r_[0-9a-z]+_/g, 'ID')

function ComposedPanel({ values }: { values: ControllerValues }) {
	return (
		<ControlPanel
			composition={{
				slots: arrangeStudioPanel({ groups }, policy, values),
				values,
				onChange: () => {},
			}}
		/>
	)
}

it('조건 없는 매니페스트를 컴포지션으로 그리면 지금 JSX 조립과 같은 결과다', () => {
	const values = createControllerValues(groups)
	const byGroup = (id: string) => [
		groups.find((group) => group.id === id) as ControllerGroupDefinition,
	]
	const { container: explicit } = render(
		<ControlPanel
			fixed={
				<ControllerRenderer
					groups={byGroup('dimming')}
					values={values}
					onChange={() => {}}
				/>
			}
			basic={
				<ControllerRenderer groups={byGroup('shape')} values={values} onChange={() => {}} />
			}
			adjustment={
				<ControllerRenderer
					groups={[
						{
							...byGroup('detail')[0],
							controls: byGroup('detail')[0].controls.slice(0, 1),
						},
					]}
					values={values}
					onChange={() => {}}
				/>
			}
		/>,
	)
	const explicitHtml = normalize(explicit.innerHTML)
	cleanup()
	const { container: composed } = render(<ComposedPanel values={values} />)
	expect(normalize(composed.innerHTML)).toBe(explicitHtml)
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
			composition={{
				slots: arrangeStudioPanel({ groups, clusters }, { basic: ['palette'] }, values),
				values,
				onChange: () => {},
				widgets: { 'color-pair': ({ cluster }) => <p>{`위젯 ${cluster.title}`}</p> },
			}}
		/>,
	)
	expect(screen.getByText('위젯 Color')).toBeInTheDocument()
	expect(warn).toHaveBeenCalledWith(expect.stringContaining('camera'))
	warn.mockRestore()
})
