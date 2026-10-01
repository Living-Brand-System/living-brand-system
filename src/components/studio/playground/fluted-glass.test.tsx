import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { resolveGraphicStudioOutput } from '@/features/graphic-generation/domain/graphic-studio-manifest'
import { flutedGlassColors } from '@/features/graphic-generation/graphic-runtimes/fluted-glass/color-spectrum'
import manifest from '@/features/graphic-generation/graphic-runtimes/fluted-glass/definition'
import { createControllerValues } from '@/modules/studio-controller/controller-definition'
import { GraphicGenerator } from '../graphic/graphic-generator'
import { PlaygroundGraphicCanvas } from './graphic-canvas'

const { mount, update, destroy } = vi.hoisted(() => ({
	mount: vi.fn(),
	update: vi.fn(),
	destroy: vi.fn(),
}))
vi.mock('@/features/graphic-generation/graphic-runtimes/fluted-glass/runtime.client', () => ({
	default: { type: 'shader', mount },
}))

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	mount.mockResolvedValue({
		update,
		destroy,
		resize: vi.fn(),
		getViewport: () => ({ width: 800, height: 600 }),
		artifacts: {},
	})
})
afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

it('실제 adapter에 Type·Position을 전달하고 Reset·모드 전환 시 런타임을 정리한다', async () => {
	const user = userEvent.setup()
	const { unmount } = render(
		<TooltipProvider>
			<GraphicGenerator
				config={{ ...manifest, output: resolveGraphicStudioOutput(manifest) }}
			/>
		</TooltipProvider>,
	)
	await waitFor(() => expect(mount).toHaveBeenCalledTimes(1))
	expect(screen.getByRole('radio', { name: '스윕' })).toBeChecked()
	for (const [label, shape] of [
		['가로', 'linear'],
		['세로', 'vertical'],
		['방사', 'radial'],
	]) {
		await user.click(screen.getByRole('radio', { name: label }))
		await waitFor(() =>
			expect(mount).toHaveBeenLastCalledWith(
				expect.objectContaining({
					values: expect.objectContaining({ shape }),
				}),
			),
		)
	}
	const pad = screen.getByRole('slider', { name: 'Position' })
	pad.focus()
	await user.keyboard('{ArrowRight}')
	expect(pad).toHaveAttribute('aria-valuetext', '가로 5%, 세로 0%')
	expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ source: { x: 0.05, y: 0 } }))
	await user.click(screen.getByRole('button', { name: 'Reset' }))
	await waitFor(() =>
		expect(mount).toHaveBeenLastCalledWith(
			expect.objectContaining({
				values: {
					...createControllerValues(manifest.controller.groups),
				},
			}),
		),
	)
	expect(screen.getByRole('radio', { name: '스윕' })).toBeChecked()
	expect(screen.getByRole('slider', { name: 'Position' })).toHaveAttribute(
		'aria-valuetext',
		'가로 -45%, 세로 0%',
	)
	unmount()
	expect(destroy).toHaveBeenCalledTimes(5)
})

it('화면 종료 후 완료된 비동기 mount도 GPU 리소스를 해제한다', async () => {
	let finish!: (runtime: unknown) => void
	mount.mockReturnValue(
		new Promise((resolve) => {
			finish = resolve
		}),
	)
	const { unmount } = render(
		<PlaygroundGraphicCanvas
			manifest={manifest}
			values={createControllerValues(manifest.controller.groups)}
			width={300}
			height={300}
		/>,
	)
	await waitFor(() => expect(mount).toHaveBeenCalledTimes(1))
	unmount()
	finish({ update, destroy, resize: vi.fn() })
	await waitFor(() => expect(destroy).toHaveBeenCalledTimes(1))
	expect(update).not.toHaveBeenCalled()
})

it('상단의 Swatch/Custom이 같은 색을 공유하고 하단에는 세부 속성만 남는다', async () => {
	const user = userEvent.setup()
	const { container } = render(
		<TooltipProvider>
			<GraphicGenerator
				config={{ ...manifest, output: resolveGraphicStudioOutput(manifest) }}
			/>
		</TooltipProvider>,
	)
	await waitFor(() => expect(mount).toHaveBeenCalledTimes(1))
	const top = container.querySelector<HTMLElement>('[data-slot="studio-control-panel"]')
	const bottom = container.querySelector<HTMLElement>('[data-slot="studio-control-panel"]')
	if (!top || !bottom) throw new Error('편집 패널이 없습니다.')
	expect(within(top).getByRole('group', { name: 'Type' })).toBeInTheDocument()
	expect(within(top).getByRole('slider', { name: 'Position' })).toBeInTheDocument()
	expect(container.querySelector('[data-slot="studio-preset-list"]')).toBeNull()
	await user.click(screen.getByRole('button', { name: 'Adjustment' }))
	expect(within(bottom).queryByRole('radiogroup')).not.toBeInTheDocument()
	expect(within(bottom).getByRole('slider', { name: '광선 강도' })).toBeInTheDocument()
	await user.click(screen.getByRole('button', { name: 'Basic' }))
	expect(screen.queryByRole('radiogroup', { name: '팔레트' })).not.toBeInTheDocument()
	const color = within(screen.getByRole('group', { name: 'Color' }))
	await user.click(color.getByRole('radio', { name: '색 조합 13' }))
	expect(update).toHaveBeenLastCalledWith(
		expect.objectContaining(flutedGlassColors('#003087', '#dfe4f4')),
	)
	await user.click(color.getByRole('radio', { name: 'Custom' }))
	expect(color.getByLabelText('Foreground 색상 선택')).toHaveValue('#003087')
	fireEvent.change(color.getByLabelText('Foreground 색상 선택'), { target: { value: '#ff0000' } })
	expect(update).toHaveBeenLastCalledWith(
		expect.objectContaining(flutedGlassColors('#ff0000', '#dfe4f4')),
	)
	await user.click(color.getByRole('radio', { name: 'Swatch' }))
	expect(
		color
			.getAllByRole('radio', { name: /색 조합/ })
			.some((radio) => (radio as HTMLInputElement).checked),
	).toBe(false)
	await user.click(screen.getByRole('button', { name: 'Reset' }))
	await waitFor(() =>
		expect(mount).toHaveBeenLastCalledWith(
			expect.objectContaining({ values: createControllerValues(manifest.controller.groups) }),
		),
	)
})
