import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type { ControllerGroupDefinition } from '@/modules/studio-controller/controller-definition'
import { StudioShell, type StudioSurface } from './studio-shell'

const groups = (label: string): ControllerGroupDefinition[] => [
	{
		id: 'shape',
		title: 'Shape',
		role: 'form',
		controls: [{ id: label, kind: 'toggle', label, defaultValue: false }],
	},
]
const policy: StudioPanelPolicy = { basic: ['form'] }
const surface = (identity: string, label: string): StudioSurface => ({
	selection: { title: '프로파일', onReset: () => {} },
	output: <p>Output</p>,
	canvas: <p>Canvas</p>,
	panel: {
		identity,
		composition: {
			slots: arrangeStudioPanel({ groups: groups(label) }, policy, {}),
			values: {},
			onChange: () => {},
		},
	},
})
const panel = () => screen.getByRole('complementary', { name: '편집 도구' })

it('같은 대상이면 내용이 바뀌어도 패널은 같은 인스턴스이고, 대상이 바뀌면 새로 시작한다', () => {
	const { rerender } = render(<StudioShell surface={surface('a', 'Use')} />)
	const first = panel()

	// 같은 대상 안의 변화 — 패널·레일은 그대로 남는다(갈래마다 패널을 따로 그리면 여기서 새로 마운트됐다).
	rerender(<StudioShell surface={surface('a', 'Mirror')} />)
	expect(panel()).toBe(first)
	expect(screen.getByRole('radiogroup', { name: 'Mirror' })).toBeInTheDocument()

	// 프로파일 교체 — 위젯 내부 상태·탭 선택이 이어지지 않게 새로 시작한다.
	rerender(<StudioShell surface={surface('b', 'Mirror')} />)
	expect(panel()).not.toBe(first)
})
