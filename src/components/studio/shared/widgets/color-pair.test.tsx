import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'
import { ColorPairWidget, type ColorPairWidgetProps } from './color-pair'

vi.mock('@/features/template-core/hooks/use-published-brand-color-pairs', () => ({
	usePublishedBrandColorPairs: () => [
		{ id: 'pair-1', label: '네이비', foreground: '#ffffff', background: '#002c5f' },
	],
}))

afterEach(cleanup)

const color = (id: string, extra: Partial<ControllerControlDefinition> = {}) =>
	({ id, label: id, kind: 'color', defaultValue: null, ...extra }) as ControllerControlDefinition

function renderPair(props: Partial<ColorPairWidgetProps>) {
	const onChange = vi.fn()
	const controls = props.controls ?? { foreground: color('line'), background: color('fill') }
	render(
		<ColorPairWidget
			cluster={{
				id: 'color',
				title: 'Color',
				role: 'palette',
				widget: 'color-pair',
				members: { foreground: 'line', background: 'fill' },
			}}
			controls={controls}
			values={{ line: '#000000', fill: '#ffffff' }}
			onChange={onChange}
			{...props}
		/>,
	)
	return onChange
}

describe('ColorPairWidget', () => {
	it('자유 색이면 브랜드 조합을 골라 두 멤버에 쓴다', () => {
		const onChange = renderPair({})
		fireEvent.click(screen.getByRole('radio', { name: '네이비' }))
		expect(onChange).toHaveBeenCalledWith('line', '#ffffff')
		expect(onChange).toHaveBeenCalledWith('fill', '#002c5f')
	})

	it('런타임이 전경을 펼치면 펼친 값을 그대로 쓴다', () => {
		const onChange = renderPair({
			spread: (foreground, background) => ({
				line: foreground,
				ray: foreground,
				fill: background,
			}),
		})
		fireEvent.click(screen.getByRole('radio', { name: '네이비' }))
		expect(onChange).toHaveBeenCalledWith('ray', '#ffffff')
	})

	it('색 선택지끼리면 허용 조합만 스와치로 만들고 면을 먼저 바꾼다', () => {
		const select = (
			id: string,
			options: { value: string; label: string; colors: string[] }[],
		) =>
			({
				id,
				label: id,
				kind: 'select',
				defaultValue: null,
				options,
			}) as ControllerControlDefinition
		const onChange = renderPair({
			controls: {
				foreground: select('line', [{ value: 'w', label: '흰 선', colors: ['#ffffff'] }]),
				background: select('fill', [{ value: 'n', label: '남색 면', colors: ['#002c5f'] }]),
			},
		})
		fireEvent.click(screen.getByRole('radio', { name: '남색 면 · 흰 선' }))
		expect(onChange.mock.calls).toEqual([
			['fill', 'n'],
			['line', 'w'],
		])
	})

	it('허용 색으로 좁혀진 칸이 있으면 스와치 대신 행으로 둔다', () => {
		renderPair({
			controls: {
				foreground: color('line', { values: ['#000000', '#ffffff'] }),
				background: color('fill'),
			},
		})
		expect(screen.queryByRole('radio', { name: '네이비' })).toBeNull()
		expect(screen.getByRole('radiogroup', { name: 'line' })).toBeTruthy()
	})
})
