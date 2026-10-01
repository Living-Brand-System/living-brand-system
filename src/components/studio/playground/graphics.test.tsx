import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
	graphicRuntimeManifests,
	resolveGraphicStudioOutput,
} from '@/features/graphic-generation/domain/graphic-studio-manifest'
import {
	type ControllerControlDefinition,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'
import { StudioLayoutPlayground } from './layout-playground'

const { mounts, update, destroy } = vi.hoisted(() => ({
	mounts: Object.fromEntries(
		[
			'fluted-glass',
			'forward-straight',
			'key-visual-formation',
			'key-visual-line',
			'key-visual-pattern',
		].map((id) => [id, vi.fn()]),
	),
	update: vi.fn(),
	destroy: vi.fn(),
}))
vi.mock('@/features/graphic-generation/graphic-runtimes/catalog/runtime.generated.client', () => ({
	graphicRuntimeCatalog: Object.fromEntries(
		Object.entries(mounts).map(([id, mount]) => [
			id,
			async () => ({ type: id === 'fluted-glass' ? 'shader' : 'p5', mount }),
		]),
	),
}))
vi.mock('@/features/graphic-generation/services/list-canvas-studio-configs.client', () => ({
	fetchCanvasStudioConfigs: async () =>
		graphicRuntimeManifests.map((m) => ({ ...m, output: resolveGraphicStudioOutput(m) })),
}))
beforeEach(() => {
	vi.clearAllMocks()
	Object.defineProperties(HTMLElement.prototype, {
		hasPointerCapture: { configurable: true, value: vi.fn(() => false) },
		scrollIntoView: { configurable: true, value: vi.fn() },
	})
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	for (const mount of Object.values(mounts))
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
	Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
	Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})

function setup() {
	const user = userEvent.setup()
	render(
		<TooltipProvider>
			<StudioLayoutPlayground />
		</TooltipProvider>,
	)

	return {
		user,
		controls: async (id: string) => {
			await screen.findByRole('button', { name: '그래픽 변경' })
			await user.click(screen.getByRole('button', { name: '그래픽 변경' }))
			const manifest = manifestOf(id)
			await user.click(await screen.findByRole('button', { name: new RegExp(manifest.name) }))
		},
	}
}

it('벡터 4종을 실제 카탈로그로 교체하며 이전 런타임을 정리하고 두 색 UI를 연결한다', async () => {
	const { user, controls } = setup()
	for (const id of [
		'key-visual-formation',
		'key-visual-line',
		'key-visual-pattern',
		'forward-straight',
	]) {
		await controls(id)
		await waitFor(() => expect(mounts[id]).toHaveBeenCalledTimes(1))
		expect(screen.getByRole('group', { name: 'Color' })).toBeInTheDocument()
	}
	expect(destroy).toHaveBeenCalledTimes(4)
	const mounted = mounts['forward-straight'].mock.calls[0][0]
	act(() => mounted.onChange('origin', { x: 0.5, y: -0.5 }))
	expect(screen.getByRole('slider', { name: 'Position' })).toHaveAttribute(
		'aria-valuetext',
		'가로 50%, 세로 -50%',
	)
	await controls('key-visual-pattern')
	await user.click(screen.getByRole('button', { name: '그래픽 변경' }))
	await user.click(screen.getByRole('button', { name: /Key Visual Formation/ }))
	expect(screen.getByText('Key Visual Formation')).toBeInTheDocument()
	await waitFor(() => expect(mounts['key-visual-formation']).toHaveBeenCalledTimes(2))
	expect(mounts['key-visual-formation'].mock.calls.at(-1)?.[0].values).toMatchObject({
		...createControllerValues(manifestOf('key-visual-formation').controller.groups),
		anchor: 'bottom',
	})
	expect(screen.queryByRole('dialog', { name: '자산 브라우저' })).not.toBeInTheDocument()
})

it('Formation 색은 허용된 면·선 조합 스와치로 고르고 두 값을 함께 바꾼다', async () => {
	const { user, controls } = setup()
	await controls('key-visual-formation')
	await waitFor(() => expect(mounts['key-visual-formation']).toHaveBeenCalledTimes(1))
	const swatches = within(screen.getByRole('radiogroup', { name: '색 조합' })).getAllByRole(
		'radio',
	)
	expect(swatches.length).toBeGreaterThan(1)
	// hex 입력 경로가 없으므로 Custom을 열지 않는다.
	expect(screen.queryByRole('radio', { name: 'Custom' })).not.toBeInTheDocument()
	// 면이 같고 선만 다른 조합을 고른다 — 면을 바꾸면 런타임이 선을 보정해 선 갱신을 가린다.
	const current = swatches.find((swatch) => (swatch as HTMLInputElement).checked)
	const plane = current?.getAttribute('aria-label')?.split(' · ')[0]
	const target = swatches.find(
		(swatch) =>
			!(swatch as HTMLInputElement).checked &&
			swatch.getAttribute('aria-label')?.startsWith(`${plane} · `),
	)
	if (!target) throw new Error('고를 조합이 없습니다.')
	const [planeLabel, lineLabel] = (target.getAttribute('aria-label') ?? '').split(' · ')
	const groups: readonly { controls: readonly ControllerControlDefinition[] }[] =
		manifestOf('key-visual-formation').controller.groups
	const definitions = groups.flatMap((group) => group.controls)
	const optionValue = (id: string, label: string) => {
		const control = definitions.find((item) => item.id === id)
		return control?.kind === 'select'
			? control.options.find((option) => option.label === label)?.value
			: undefined
	}
	await user.click(target)
	expect(update).toHaveBeenLastCalledWith(
		expect.objectContaining({
			planeColor: optionValue('planeColor', planeLabel),
			lineColor: optionValue('lineColor', lineLabel),
		}),
	)
	expect(target).toBeChecked()
})

it('Formation 네 방향·세부 값·기본 프리셋과 Reset을 연결한다', async () => {
	const view = setup()
	const { user, controls } = view
	await controls('key-visual-formation')
	await waitFor(() => expect(mounts['key-visual-formation']).toHaveBeenCalledTimes(1))
	await user.click(screen.getByRole('radio', { name: '오른쪽' }))
	expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ anchor: 'right' }))
	expect(screen.queryByText('Presets')).not.toBeInTheDocument()
	await user.click(screen.getByRole('button', { name: 'Adjustment' }))
	const steps = screen.getByRole('slider', { name: '단계' })
	steps.focus()
	await user.keyboard('{ArrowRight}')
	expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ steps: 9 }))
	await user.click(screen.getByRole('button', { name: 'Reset' }))
	await user.click(screen.getByRole('button', { name: 'Basic' }))
	await waitFor(() =>
		expect(mounts['key-visual-formation']).toHaveBeenLastCalledWith(
			expect.objectContaining({
				values: createControllerValues(
					manifestOf('key-visual-formation').controller.groups,
				),
			}),
		),
	)
	expect(screen.getByRole('radio', { name: '아래' })).toBeChecked()
})

it('Line 두 점은 독립적으로 움직이며 프로파일 교체 시 기본값을 복원한다', async () => {
	const { user, controls } = setup()
	await controls('key-visual-line')
	await waitFor(() => expect(mounts['key-visual-line']).toHaveBeenCalledTimes(1))
	const pad = screen.getByRole('application', { name: /Position/ })
	pad.focus()
	await user.keyboard('{ArrowRight} {ArrowUp}')
	let values = update.mock.calls.at(-1)?.[0]
	expect(values.path.a.x).toBeCloseTo(-0.55)
	expect(values.path.b.y).toBeCloseTo(-0.55)
	await controls('key-visual-pattern')
	await controls('key-visual-line')
	await waitFor(() => expect(mounts['key-visual-line']).toHaveBeenCalledTimes(2))
	values = mounts['key-visual-line'].mock.calls.at(-1)?.[0].values
	expect(values.path.a.x).toBeCloseTo(-0.6)
	await user.click(screen.getByRole('button', { name: 'Reset' }))
	await waitFor(() =>
		expect(mounts['key-visual-line'].mock.calls.at(-1)?.[0].values.path.a.x).toBeCloseTo(-0.6),
	)
})

it('Pattern 프리셋과 방향·시점·가변 두께가 실제 입력에 반영된다', async () => {
	const view = setup()
	const { user, controls } = view
	await controls('key-visual-pattern')
	await waitFor(() => expect(mounts['key-visual-pattern']).toHaveBeenCalledTimes(1))
	await user.click(screen.getByRole('button', { name: /^5$/ }))
	expect(update).toHaveBeenLastCalledWith(
		expect.objectContaining({
			direction: 'horizontal',
			viewpoint: 'flat',
			variableWeight: false,
			columnGap: 20,
			rowGap: 20,
		}),
	)
	await user.click(screen.getByRole('button', { name: 'Adjustment' }))
	expect(screen.getByRole('slider', { name: '가장 두꺼운 라인' })).toHaveAttribute(
		'aria-disabled',
		'true',
	)
	await user.click(screen.getByRole('button', { name: 'Basic' }))
	await user.click(screen.getByRole('radio', { name: '수직형' }))
	expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ direction: 'vertical' }))
	expect(screen.getByRole('slider', { name: 'Position' })).toHaveAttribute(
		'aria-valuetext',
		'가로 36%, 세로 100%',
	)
})

function manifestOf(id: string) {
	const manifest = graphicRuntimeManifests.find((m) => m.id === id)
	if (!manifest) throw new Error(id)
	return manifest
}
