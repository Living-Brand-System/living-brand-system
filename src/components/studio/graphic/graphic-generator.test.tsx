import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { resolveGraphicStudioOutput } from '@/features/graphic-generation/domain/graphic-studio-manifest'
import flutedGlassRuntimeManifest from '@/features/graphic-generation/graphic-runtimes/fluted-glass/definition'
import { toFlutedGlassInput } from '@/features/graphic-generation/graphic-runtimes/fluted-glass/model'
import forwardStraightRuntimeManifest, {
	FORWARD_STRAIGHT_DEFAULT_INPUT,
} from '@/features/graphic-generation/graphic-runtimes/forward-straight/definition'
import { createForwardStraightScene } from '@/features/graphic-generation/graphic-runtimes/forward-straight/model'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'
import { GraphicGenerator } from './graphic-generator'

const browseMocks = vi.hoisted(() => ({
	fetchCanvasStudioConfigs: vi.fn(async () => [] as unknown[]),
}))
vi.mock(
	'@/features/graphic-generation/services/list-canvas-studio-configs.client',
	() => browseMocks,
)

const forwardStraightConfig = {
	...forwardStraightRuntimeManifest,
	output: resolveGraphicStudioOutput(forwardStraightRuntimeManifest),
} satisfies GraphicStudioConfig

const flutedGlassConfig = {
	...flutedGlassRuntimeManifest,
	output: resolveGraphicStudioOutput(flutedGlassRuntimeManifest),
} satisfies GraphicStudioConfig

const mocks = vi.hoisted(() => {
	const raster = {
		kind: 'raster' as const,
		source: {
			canvas: {} as HTMLCanvasElement,
			render: vi.fn(),
			restore: vi.fn(),
		},
	}
	const preview = {
		artifacts: { raster },
		destroy: vi.fn(),
		getViewport: vi.fn(() => ({ width: 800, height: 600 })),
		resize: vi.fn(),
		update: vi.fn(),
	}
	const shaderPreview = {
		destroy: vi.fn(),
		getViewport: vi.fn(() => ({ width: 800, height: 600 })),
		resize: vi.fn(),
		update: vi.fn(),
		artifacts: {
			raster,
			video: {
				kind: 'video' as const,
				source: {
					canvas: {} as HTMLCanvasElement,
					renderFrame: vi.fn(),
					restore: vi.fn(),
				},
			},
		},
	}
	const canvasFramesToMp4 = vi.fn(async () => new Blob(['mp4'], { type: 'video/mp4' }))
	const state = {
		onInputChange: undefined as
			| ((input: typeof FORWARD_STRAIGHT_DEFAULT_INPUT) => boolean)
			| undefined,
		preview,
		createPreview: vi.fn(),
		shaderPreview,
		createShaderPreview: vi.fn(
			async (_options: { container: HTMLElement; input: ControllerValues }) => shaderPreview,
		),
		canvasFramesToMp4,
		resizeObserverCallback: undefined as ResizeObserverCallback | undefined,
		resizeObserverCount: 0,
	}
	state.createPreview.mockImplementation(
		(options: {
			onInputChange?: (input: typeof FORWARD_STRAIGHT_DEFAULT_INPUT) => boolean
		}) => {
			state.onInputChange = options.onInputChange
			return preview
		},
	)
	return state
})

vi.mock('@/features/graphic-generation/graphic-runtimes/forward-straight/runtime.client', () => ({
	createForwardStraightRuntime: mocks.createPreview,
	default: {
		type: 'p5',
		async mount({
			values,
			onChange,
		}: {
			values: ControllerValues
			onChange: (controlId: string, value: unknown) => boolean
		}) {
			const origin = values.origin as { x: number; y: number }
			const preview = mocks.createPreview({
				input: { ...values, origin: { x: (origin.x + 1) / 2, y: (origin.y + 1) / 2 } },
				onInputChange: (next: typeof FORWARD_STRAIGHT_DEFAULT_INPUT) =>
					onChange('origin', {
						x: next.origin.x * 2 - 1,
						y: next.origin.y * 2 - 1,
					}),
			})
			return {
				...preview,
				update(next: ControllerValues) {
					const nextOrigin = next.origin as { x: number; y: number }
					preview.update({
						...next,
						origin: { x: (nextOrigin.x + 1) / 2, y: (nextOrigin.y + 1) / 2 },
					})
				},
			}
		},
	},
}))

vi.mock('@/features/graphic-generation/graphic-runtimes/fluted-glass/runtime.client', () => ({
	createFlutedGlassRuntime: mocks.createShaderPreview,
	default: {
		type: 'shader',
		mount: ({ container, values }: { container: HTMLElement; values: ControllerValues }) =>
			mocks.createShaderPreview({ container, input: values }),
	},
}))

vi.mock('@/features/studio-export/adapters/canvas-frames-to-mp4.mediabunny.client', () => ({
	canvasFramesToMp4: mocks.canvasFramesToMp4,
}))

beforeEach(() => {
	vi.clearAllMocks()
	mocks.onInputChange = undefined
	mocks.resizeObserverCallback = undefined
	mocks.resizeObserverCount = 0
	vi.stubGlobal(
		'ResizeObserver',
		class {
			constructor(callback: ResizeObserverCallback) {
				mocks.resizeObserverCallback = callback
				mocks.resizeObserverCount += 1
			}
			observe() {}
			disconnect() {}
		},
	)
})

afterEach(() => {
	vi.useRealTimers()
	cleanup()
	vi.unstubAllGlobals()
})

describe('GraphicGenerator', () => {
	it('Shader 계약도 Forward Straight 변환 없이 공용 text·color·range primitive를 그린다', async () => {
		const config = {
			studio: 'graphic',
			id: 'shader-demo',
			version: 1,
			name: 'Shader Demo',
			type: 'shader',
			artifacts: { raster: {} },
			output: { formats: [] },
			controller: {
				groups: [
					{
						id: 'values',
						title: 'Values',
						controls: [
							{
								id: 'caption',
								kind: 'text',
								label: 'Caption',
								defaultValue: '',
								multiline: true,
								maxLength: 20,
							},
							{
								id: 'color',
								kind: 'color',
								label: 'Color',
								defaultValue: null,
							},
							{
								id: 'intensity',
								kind: 'range',
								label: 'Intensity',
								defaultValue: 0.5,
								min: 0,
								max: 1,
								step: 0.1,
							},
						],
					},
				],
			},
		} satisfies GraphicStudioConfig

		render(createElement(GraphicGenerator, { config: config }))

		expect(screen.getByLabelText('Caption')).toHaveAttribute('maxlength', '20')
		expect(screen.getByLabelText('Color 색상 선택')).toBeInTheDocument()
		expect(screen.getByRole('slider', { name: 'Intensity' })).toHaveAttribute(
			'aria-valuenow',
			'0.5',
		)
		expect(await screen.findByRole('alert')).toHaveTextContent('지원하지 않는 그래픽 런타임')
	})

	it('P5 Definition을 Controller primitive로 그리고 변경값을 캔버스에 전달한다', async () => {
		const user = userEvent.setup()
		render(createElement(GraphicGenerator, { config: forwardStraightConfig }))

		expect(screen.getByLabelText('선 색상 색상 선택')).toBeInTheDocument()
		expect(screen.getByRole('slider', { name: '열 간격' })).toHaveAttribute(
			'aria-valuenow',
			'40',
		)
		const gap = screen.getByRole('slider', { name: '열 간격' })
		gap.focus()
		await user.keyboard('{ArrowRight}')

		await waitFor(() =>
			expect(mocks.preview.update).toHaveBeenLastCalledWith(
				expect.objectContaining({ columnGap: 41 }),
			),
		)
		// 좌·우 어느 목록에도 없는 축은 창작자 화면에 없다 — 선언은 남아 admin에서 조정한다.
		expect(screen.queryByRole('slider', { name: '원근 압축' })).toBeNull()
	})

	it('🔴 축은 세 층으로 갈린다 — 왼쪽·오른쪽·admin 전용', () => {
		const { container } = render(
			createElement(GraphicGenerator, { config: forwardStraightConfig }),
		)
		const panelOf = (slot: string) =>
			container.querySelector<HTMLElement>(`[data-slot="${slot}"]`) ??
			(() => {
				throw new Error(`패널이 없다: ${slot}`)
			})()
		const left = panelOf('studio-workspace-left-panel')
		const right = panelOf('studio-workspace-sidebar')

		// 왼쪽 — 이 런타임의 큰 축은 색뿐이다.
		expect(within(left).getByLabelText('선 색상 색상 선택')).toBeInTheDocument()
		expect(within(left).getByLabelText('배경 색상 색상 선택')).toBeInTheDocument()

		// 오른쪽 — 공용 4축(밀도·속도·기준점·두께). 정지 그래픽이라 속도는 없다.
		expect(within(right).getByRole('slider', { name: '열 간격' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '기준점 두께' })).toBeInTheDocument()

		// admin 전용 — 선언은 남아 있지만 창작자 화면에는 없다.
		expect(screen.queryByRole('slider', { name: '선 길이' })).toBeNull()
		expect(screen.queryByRole('slider', { name: '여백' })).toBeNull()
		expect(screen.queryByRole('slider', { name: '두께 감쇠 거리' })).toBeNull()
		// 「고급 설정」으로 접는 장치는 없다 — 접는 것이 아니라 층을 나눈 것이다.
		expect(screen.queryByRole('button', { name: /고급/ })).not.toBeInTheDocument()
	})

	it('선언이 없는 런타임은 전부 왼쪽이다 — 정하지 않은 런타임의 화면이 비면 안 된다', () => {
		const { controller, ...rest } = forwardStraightConfig
		const { left: _left, ...controllerWithoutLeft } = controller
		const config = {
			...rest,
			controller: controllerWithoutLeft,
		} as unknown as GraphicStudioConfig

		const { container } = render(createElement(GraphicGenerator, { config }))
		const left = container.querySelector<HTMLElement>(
			'[data-slot="studio-workspace-left-panel"]',
		)
		if (!left) throw new Error('왼쪽 패널이 없다')

		expect(within(left).getByRole('slider', { name: '기준점 두께' })).toBeInTheDocument()
		expect(within(left).getByRole('slider', { name: '원근 압축' })).toBeInTheDocument()
	})

	it('Raster Artifact가 있는 Graphic은 공통 PNG adapter를 실행할 수 있다', async () => {
		const config = {
			...forwardStraightRuntimeManifest,
			output: {
				...resolveGraphicStudioOutput(forwardStraightRuntimeManifest),
				formats: ['png'],
			},
		} satisfies GraphicStudioConfig

		render(createElement(GraphicGenerator, { config: config }))

		await waitFor(() => expect(mocks.createPreview).toHaveBeenCalledOnce())
		expect(screen.getByText('PNG')).toBeInTheDocument()
		await waitFor(() => expect(screen.getByRole('button', { name: '내보내기' })).toBeEnabled())
	})

	it('Shader Definition을 WebGL preview와 MP4 Export UI에 연결한다', async () => {
		const { container, unmount } = render(
			createElement(GraphicGenerator, { config: flutedGlassConfig }),
		)

		await waitFor(() => expect(mocks.createShaderPreview).toHaveBeenCalledOnce())
		// 기본 모양은 스윕이다 — 배선이 어긋나면 다른 셰이더가 뜬다.
		expect(
			toFlutedGlassInput(mocks.createShaderPreview.mock.lastCall?.[0].input ?? {}).family,
		).toBe('sweep')

		const left = container.querySelector<HTMLElement>(
			'[data-slot="studio-workspace-left-panel"]',
		)
		const right = container.querySelector<HTMLElement>('[data-slot="studio-workspace-sidebar"]')
		if (!left || !right) throw new Error('좌우 패널이 둘 다 있어야 한다')

		// 왼쪽은 색 조합과 형태뿐이다.
		expect(within(left).getByText('Shape')).toBeInTheDocument()
		expect(within(left).getByText('Style')).toBeInTheDocument()
		expect(within(left).getByRole('button', { name: 'Ray Palette' })).toBeInTheDocument()
		// 🔑 오른쪽 축은 **종류가 서로 달라야** 읽힌다 — 빛·짜임·결·굴절·틀·기준점.
		expect(within(right).getByRole('slider', { name: '광선 강도' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '광선 연속성' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '속도' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '빛무리 크기' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '줄 굵기' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '결 흐름' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '확대' })).toBeInTheDocument()
		expect(within(right).getByRole('slider', { name: '기울기' })).toBeInTheDocument()
		expect(within(right).getByText('Position')).toBeInTheDocument()
		// 🔴 세웠다가 사용자가 「체감 불가」로 내린 축들 — 픽셀차가 있어도 창작자는 알아보지 못했다.
		//    선언은 남아 있어 manager가 Payload에서 조정한다. 다시 올리지 말 것.
		for (const axis of [
			'광선 밀도',
			'블룸 강도',
			'시작 시점',
			'빔 세기',
			'빔 폭',
			'굴절',
			'유리 반짝임',
			'모서리 어둡기',
		]) {
			expect(screen.queryByRole('slider', { name: axis }), axis).toBeNull()
		}
		// 모양의 정체를 이루는 값과 마스터 시계에 딸린 속도는 admin 전용으로 남는다.
		expect(screen.queryByRole('slider', { name: '광선 회전' })).toBeNull()
		// 🔴 「Sweep」은 왼쪽 모양의 이름이기도 하다 — 그 제목이 오른쪽에 뜨면 같은 말이 두 뜻이 된다.
		expect(screen.queryByRole('button', { name: 'Sweep' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Glass Motion' })).toBeNull()
		// 남은 컨트롤이 없는 그룹은 그 쪽 패널에서 제목째 사라진다.
		expect(screen.queryByRole('button', { name: 'Beam' })).toBeNull()
		expect(screen.getByRole('spinbutton', { name: 'Width' })).toHaveValue(1920)
		expect(screen.getByRole('spinbutton', { name: 'Height' })).toHaveValue(1080)
		expect(screen.getByRole('combobox', { name: 'FPS' })).toHaveTextContent('30')
		expect(screen.getByRole('spinbutton', { name: 'Duration' })).toHaveValue(5)
		await waitFor(() => expect(screen.getByRole('button', { name: '내보내기' })).toBeEnabled())

		// 🔑 `속도`가 마스터 시계다 — 이 하나가 모든 움직임을 함께 늘리고 줄인다.
		fireEvent.keyDown(screen.getByRole('slider', { name: '속도' }), { key: 'ArrowRight' })
		await waitFor(() =>
			expect(mocks.shaderPreview.update).toHaveBeenLastCalledWith(
				expect.objectContaining({ speed: 0.73 }),
			),
		)

		unmount()
		expect(mocks.shaderPreview.destroy).toHaveBeenCalledOnce()
	})

	it('VideoControls 변경값을 MP4 ExportRequest에 연결한다', async () => {
		const user = userEvent.setup()
		const createObjectURL = vi.fn(() => 'blob:fluted-glass')
		Object.defineProperty(URL, 'createObjectURL', {
			configurable: true,
			value: createObjectURL,
		})
		Object.defineProperty(URL, 'revokeObjectURL', {
			configurable: true,
			value: vi.fn(),
		})
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		render(createElement(GraphicGenerator, { config: flutedGlassConfig }))
		await waitFor(() => expect(mocks.createShaderPreview).toHaveBeenCalledOnce())

		const width = screen.getByRole('spinbutton', { name: 'Width' })
		fireEvent.change(width, { target: { value: '1280' } })
		fireEvent.blur(width)
		const height = screen.getByRole('spinbutton', { name: 'Height' })
		fireEvent.change(height, { target: { value: '720' } })
		fireEvent.blur(height)
		const duration = screen.getByRole('spinbutton', { name: 'Duration' })
		fireEvent.change(duration, { target: { value: '10' } })
		fireEvent.blur(duration)
		const fps = screen.getByRole('combobox', { name: 'FPS' })
		fps.focus()
		await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
		await user.click(screen.getByRole('button', { name: '내보내기' }))

		await waitFor(() =>
			expect(mocks.canvasFramesToMp4).toHaveBeenCalledWith(
				expect.objectContaining({
					canvas: mocks.shaderPreview.artifacts.video.source.canvas,
					spec: expect.objectContaining({
						width: 1280,
						height: 720,
						fps: 60,
						durationSeconds: 10,
					}),
				}),
			),
		)
		expect(createObjectURL).toHaveBeenCalledOnce()
	})

	it('출력 사이즈 비율을 프리뷰 영역에 맞춰 반영한다', async () => {
		render(createElement(GraphicGenerator, { config: flutedGlassConfig }))
		await waitFor(() => expect(mocks.createShaderPreview).toHaveBeenCalledOnce())
		const observerCount = mocks.resizeObserverCount

		const width = screen.getByRole('spinbutton', { name: 'Width' })
		fireEvent.change(width, { target: { value: '800' } })
		fireEvent.blur(width)
		const height = screen.getByRole('spinbutton', { name: 'Height' })
		fireEvent.change(height, { target: { value: '800' } })
		fireEvent.blur(height)
		await waitFor(() => expect(mocks.resizeObserverCount).toBeGreaterThan(observerCount))

		act(() => {
			mocks.resizeObserverCallback?.(
				[
					{
						contentRect: { width: 1000, height: 800 },
					} as ResizeObserverEntry,
				],
				{} as ResizeObserver,
			)
		})

		expect(mocks.shaderPreview.resize).toHaveBeenLastCalledWith(800, 800)
	})

	it('등록된 id와 type이 일치하지 않으면 런타임을 실행하지 않는다', async () => {
		render(
			createElement(GraphicGenerator, {
				config: { ...forwardStraightConfig, type: 'shader' },
			}),
		)

		expect(await screen.findByRole('alert')).toHaveTextContent('지원하지 않는 그래픽 런타임')
		expect(mocks.createPreview).not.toHaveBeenCalled()
	})

	it('런타임이 명시한 origin Pad에만 캔버스 비율을 연결한다', async () => {
		const config = {
			...forwardStraightConfig,
			controller: {
				groups: forwardStraightRuntimeManifest.controller.groups.map((group) =>
					group.id === 'position'
						? {
								...group,
								controls: [
									...group.controls,
									{
										id: 'offset',
										kind: 'pad' as const,
										label: 'Offset',
										defaultValue: { x: 0, y: 0 },
									},
								],
							}
						: group,
				),
			},
		} satisfies GraphicStudioConfig

		render(createElement(GraphicGenerator, { config: config }))
		await waitFor(() =>
			expect(screen.getByRole('slider', { name: '기준점' })).toHaveStyle({
				aspectRatio: '1.3333333333333333',
			}),
		)
		expect(screen.getByRole('slider', { name: 'Offset' }).style.aspectRatio).toBe('')
	})

	it('readonly control은 캔버스 직접 조작으로도 변경하지 않는다', async () => {
		const config = {
			...forwardStraightConfig,
			controller: {
				groups: forwardStraightRuntimeManifest.controller.groups.map((group) =>
					group.id === 'position'
						? {
								...group,
								controls: group.controls.map((control) => ({
									...control,
									availability: 'readonly' as const,
								})),
							}
						: group,
				),
			},
		} satisfies GraphicStudioConfig

		render(createElement(GraphicGenerator, { config: config }))
		await waitFor(() => expect(mocks.createPreview).toHaveBeenCalledOnce())
		expect(
			mocks.onInputChange?.({
				...FORWARD_STRAIGHT_DEFAULT_INPUT,
				origin: { x: 0.6, y: 0.4 },
			}),
		).toBe(false)

		await Promise.resolve()
		expect(mocks.preview.update).not.toHaveBeenCalled()
	})

	it('캔버스의 입력 변경을 같은 Context를 통해 Pad에 되돌린다', async () => {
		render(createElement(GraphicGenerator, { config: forwardStraightConfig }))
		await waitFor(() => expect(mocks.createPreview).toHaveBeenCalledOnce())

		mocks.onInputChange?.({
			...FORWARD_STRAIGHT_DEFAULT_INPUT,
			origin: { x: 0.6, y: 0.4 },
		})

		await waitFor(() =>
			expect(screen.getByRole('slider', { name: '기준점' })).toHaveAttribute(
				'aria-valuenow',
				'20',
			),
		)
	})

	it('현재 Controller 값과 화면 크기로 SVG를 다운로드한다', async () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(new Date('2026-09-10T03:00:00Z'))
		const createObjectURL = vi.fn((_blob: Blob) => 'blob:forward-straight')
		const revokeObjectURL = vi.fn()
		Object.defineProperties(URL, {
			createObjectURL: { configurable: true, value: createObjectURL },
			revokeObjectURL: { configurable: true, value: revokeObjectURL },
		})
		const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

		const { unmount } = render(
			createElement(GraphicGenerator, { config: forwardStraightConfig }),
		)

		await waitFor(() => expect(mocks.createPreview).toHaveBeenCalledOnce())
		fireEvent.keyDown(screen.getByRole('slider', { name: '기준점' }), { key: 'ArrowRight' })
		await waitFor(() =>
			expect(mocks.preview.update).toHaveBeenLastCalledWith(
				expect.objectContaining({ origin: { x: 0.525, y: 0.5 } }),
			),
		)
		const width = screen.getByRole('spinbutton', { name: 'Width' })
		fireEvent.change(width, { target: { value: '640' } })
		fireEvent.blur(width)
		fireEvent.click(screen.getByRole('button', { name: '내보내기' }))
		await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce())

		const blob = createObjectURL.mock.calls[0]?.[0] as Blob
		expect(blob).toMatchObject({ type: 'image/svg+xml' })
		const svg = await new Promise<string>((resolve) => {
			const reader = new FileReader()
			reader.onload = () => resolve(String(reader.result))
			reader.readAsText(blob)
		})
		const expected = createForwardStraightScene(
			{ ...FORWARD_STRAIGHT_DEFAULT_INPUT, origin: { x: 0.525, y: 0.5 } },
			{ width: 640, height: 600 },
		)
		expect(svg).toContain('width="640" height="600"')
		expect(svg.split('<line').length - 1).toBe(expected.dashes.length)
		expect(svg).toContain(`x1="${expected.dashes[0].x1.toFixed(2)}"`)
		expect(click.mock.instances[0]).toMatchObject({
			download: 'Forward-Straight-20260910-120000.svg',
			href: 'blob:forward-straight',
		})
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:forward-straight')

		unmount()
		expect(mocks.preview.destroy).toHaveBeenCalledOnce()
	})

	it('Change 브라우저에서 Graphic을 교체하고 새 계약의 기본값으로 초기화한다', async () => {
		// 교체 후보 목록은 패널이 열릴 때 /api/graphic-profiles에서 온다.
		browseMocks.fetchCanvasStudioConfigs.mockResolvedValue([
			forwardStraightConfig,
			flutedGlassConfig,
		])
		render(createElement(GraphicGenerator, { config: forwardStraightConfig }))
		await waitFor(() => expect(mocks.createPreview).toHaveBeenCalledOnce())
		const gap = screen.getByRole('slider', { name: '열 간격' })
		fireEvent.keyDown(gap, { key: 'ArrowRight' })
		await waitFor(() => expect(gap).toHaveAttribute('aria-valuenow', '41'))

		const trigger = screen.getByRole('button', { name: '그래픽 변경' })
		expect(trigger.closest('[data-slot="controller-header"]')).not.toBeNull()
		fireEvent.click(trigger)
		const panel = screen.getByRole('dialog', { name: 'Graphic Profiles' })
		const forwardCard = await within(panel).findByRole('button', {
			name: new RegExp(forwardStraightRuntimeManifest.name),
		})
		const shaderCard = within(panel).getByRole('button', {
			name: new RegExp(flutedGlassRuntimeManifest.name),
		})
		expect(forwardCard).toHaveAttribute('aria-current', 'true')

		fireEvent.click(shaderCard)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		await waitFor(() => expect(mocks.createShaderPreview).toHaveBeenCalledOnce())
		expect(mocks.preview.destroy).toHaveBeenCalledOnce()

		fireEvent.click(screen.getByRole('button', { name: '그래픽 변경' }))
		fireEvent.click(
			await within(screen.getByRole('dialog', { name: 'Graphic Profiles' })).findByRole(
				'button',
				{ name: new RegExp(forwardStraightRuntimeManifest.name) },
			),
		)

		await waitFor(() => expect(mocks.createPreview).toHaveBeenCalledTimes(2))
		expect(screen.getByRole('slider', { name: '열 간격' })).toHaveAttribute(
			'aria-valuenow',
			'40',
		)
	})
})
