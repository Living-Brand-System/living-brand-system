import {
	act,
	cleanup,
	fireEvent,
	renderHook,
	render as rtlRender,
	screen,
	waitFor,
	within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ComponentProps, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import type {
	GraphicRuntimeManifest,
	GraphicStudioConfig,
} from '@/features/graphic-generation/domain/graphic-studio-config'
import {
	graphicRuntimeManifests,
	resolveGraphicStudioOutput,
} from '@/features/graphic-generation/domain/graphic-studio-manifest'
import forwardStraightRuntimeManifest from '@/features/graphic-generation/graphic-runtimes/forward-straight/definition'
import {
	CAMERA_AZIMUTHS,
	CAMERA_ELEVATIONS,
} from '@/features/image-generation/domain/camera-control'
import type { ImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import { useTemplateExport } from '@/features/studio-export/hooks/use-template-export'
import type { TemplateSessionPatch } from '@/features/template-customization/domain/template-session-patch'
import {
	deriveTemplateStudioConfig,
	type PublishedHtmlTemplate,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import {
	TemplateAuthoringHandoffProvider,
	useTemplateAuthoringHandoff,
} from '@/features/template-customization/providers/template-authoring-handoff'
import { TemplateStudioProvider } from '@/features/template-customization/providers/template-studio-provider'
import type { TemplateRasterArtifactProducer } from '@/features/template-customization/runtime/template-runtime.client'
import type { GetCreateNavigationOutput } from '@/features/template-customization/services/get-create-navigation.service'
import { useShellLocked } from '@/hooks/use-shell-lock'
import { TemplateGenerator as TemplateGeneratorView } from './template-generator'
import { TemplateWorkspace } from './template-workspace'

const mocks = vi.hoisted(() => ({
	canExportTemplate: vi.fn(() => true),
	captureGraphicFrame: vi.fn(() => 'data:image/png;base64,graphic'),
	destroyGraphicPreview: vi.fn(),
	exportTemplate: vi.fn(),
	mountGraphicPreview: vi.fn(),
	push: vi.fn(),
	requestImageGeneration: vi.fn(),
	resizeGraphicPreview: vi.fn(),
	resizeObserverCallback: undefined as ResizeObserverCallback | undefined,
	templateArtifact: undefined as TemplateRasterArtifactProducer | undefined,
	templateVectorArtifact: undefined as (() => Promise<unknown>) | undefined,
	updateGraphicPreview: vi.fn(),
}))

vi.mock('@/features/studio-export/hooks/use-export', () => ({
	useExport: () => ({
		canExport: mocks.canExportTemplate,
		exporting: null,
		error: null,
		run: (request: { format: string }) => mocks.exportTemplate(request.format),
	}),
}))
const browseMocks = vi.hoisted(() => ({
	fetchCreateNavigation: vi.fn(async () => [] as unknown[]),
}))
vi.mock(
	'@/features/template-customization/services/get-create-navigation.client',
	() => browseMocks,
)

const sampleMocks = vi.hoisted(() => ({
	fetchSampleImages: vi.fn(async () => [] as unknown[]),
}))
vi.mock('@/features/template-customization/services/list-sample-images.client', () => sampleMocks)

vi.mock('@/features/template-core/services/template-editor-options.client', async (original) => ({
	...(await original<object>()),
	requestPublishedBrandColors: async () => [{ hex: '#002c5f' }, { hex: '#ffffff' }],
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mocks.push }),
}))
vi.mock('@/features/image-generation/services/generate-image.client', () => ({
	requestImageGeneration: mocks.requestImageGeneration,
}))
vi.mock('@/features/graphic-generation/runtime/client/graphic-runtime.client', () => ({
	loadGraphicRuntimeAdapter: async (config: GraphicRuntimeManifest) => ({
		type: config.type,
		mount: mocks.mountGraphicPreview,
	}),
}))

const template: PublishedHtmlTemplate = {
	kind: 'html',
	id: 1,
	name: '테스트 템플릿',
	html: '<div>미리보기</div>',
	nodeConfigs: {},
	width: 400,
	height: 300,
	templateVersion: '2026-07-29T00:00:00.000Z',
}

const navigationCategories: GetCreateNavigationOutput['categories'] = [
	{
		id: 1,
		title: '카드',
		slug: 'cards',
		templates: [
			{
				id: 1,
				name: '테스트 템플릿',
				slug: 'test-template',
				href: '/studio/template/test-template',
			},
			{
				id: 2,
				name: '두 번째 템플릿',
				slug: 'second-template',
				href: '/studio/template/second-template',
			},
		],
	},
]

const imageConfigs = [createImageConfig(11), createImageConfig(7)]
const effectiveGraphicConfigs = graphicRuntimeManifests.map((manifest) => ({
	...manifest,
	output: resolveGraphicStudioOutput(manifest),
}))

/**
 * 런타임을 이름으로 집는다.
 *
 * 🔴 `effectiveGraphicConfigs[0]`으로 집으면 카탈로그가 늘거나 줄 때 조용히 다른 런타임을 가리킨다 —
 *    Fluted 넷을 하나로 합치면서 첫 항목이 forward-straight에서 fluted-glass로 바뀌어 세 테스트가
 *    함께 죽었다(2026-09-03).
 */
function graphicConfigOf(id: string) {
	const found = effectiveGraphicConfigs.find((config) => config.id === id)
	if (!found) throw new Error(`그래픽 런타임 fixture가 없습니다: ${id}`)
	return found
}

function TemplateGenerator({
	imageConfigs: providedImageConfigs = imageConfigs,
	graphicConfigs: providedGraphicConfigs = effectiveGraphicConfigs,
	...props
}: Omit<ComponentProps<typeof TemplateGeneratorView>, 'config' | 'template'> & {
	template: PublishedHtmlTemplate
	imageConfigs?: readonly ImageStudioConfig[]
	graphicConfigs?: readonly GraphicStudioConfig[]
}) {
	return (
		<TooltipProvider>
			<TemplateGeneratorView
				{...props}
				config={deriveTemplateStudioConfig(
					props.template,
					providedImageConfigs,
					providedGraphicConfigs,
				)}
			/>
		</TooltipProvider>
	)
}

function FeatureMutationProbe() {
	const { images, background } = useTemplateStudio()
	const image = images.states['1:1']
	return (
		<>
			<span data-testid="image-line">{String(image?.featureValues.lineColor)}</span>
			<span data-testid="background-line">
				{String(background.state.featureValues.lineColor)}
			</span>
			<button
				type="button"
				onClick={() => images.updateFeature('1:1', 'lineColor', 'invalid')}
			>
				invalid image feature
			</button>
			<button
				type="button"
				onClick={() => images.updateFeature('1:1', 'lineColor', '#00ff00')}
			>
				valid image feature
			</button>
			<button type="button" onClick={() => background.updateFeature('lineColor', '#00ff00')}>
				background feature
			</button>
		</>
	)
}

/** 챗 자리를 대신해 편집안을 통로에 밀어 넣는다 — 실제 챗은 이 `send`를 부른다. */
function AuthoringProbe({
	templateId,
	patch,
}: {
	templateId: number
	patch: TemplateSessionPatch
}) {
	const { send } = useTemplateAuthoringHandoff()
	return (
		<button type="button" onClick={() => send({ templateId, patch })}>
			send patch
		</button>
	)
}

function GraphicMutationProbe() {
	const { background } = useTemplateStudio()
	return (
		<>
			<span data-testid="graphic-config">{background.state.graphicConfigId}</span>
			<span data-testid="graphic-perspective">
				{String(background.state.graphicValues.perspectiveGamma)}
			</span>
			<button type="button" onClick={() => background.updateGraphic('perspectiveGamma', 2.5)}>
				update graphic
			</button>
			<button
				type="button"
				onClick={() => background.updateGraphic('perspectiveGamma', 'invalid')}
			>
				invalid graphic
			</button>
			<button type="button" onClick={() => background.selectGraphicConfig('secondary')}>
				select secondary graphic
			</button>
		</>
	)
}

function TemplateOutputProbe() {
	const exporting = useTestTemplateExport()
	return (
		<>
			<span data-testid="template-output-format">{exporting.format ?? 'none'}</span>
			<span data-testid="template-output-formats">
				{exporting.formats.join(',') || 'none'}
			</span>
			<button type="button" onClick={exporting.run}>
				export unsupported svg
			</button>
		</>
	)
}

function useTestTemplateExport() {
	const { canvas, config, execution } = useTemplateStudio()
	return useTemplateExport({
		artifact: canvas.artifact,
		capability: config.output,
		metadata: {
			fileName: template.name,
			width: config.template.exportOption.canvas.width,
			height: config.template.exportOption.canvas.height,
			maxScale: config.template.exportOption.maxScale,
			controller: {
				groups: config.controller.groups,
				values: execution.controllerValues,
			},
		},
	})
}

function BackgroundTypeMutationProbe() {
	const { background } = useTemplateStudio()
	return (
		<>
			<span data-testid="background-type">{background.state.type}</span>
			<button type="button" onClick={() => background.selectType('graphic')}>
				select graphic background
			</button>
			<button type="button" onClick={() => background.selectType('invalid')}>
				select invalid background
			</button>
			<button type="button" onClick={() => background.update({ type: 'graphic' } as never)}>
				patch graphic background
			</button>
		</>
	)
}

function VideoArtifactProbe() {
	const { background, canvas } = useTemplateStudio()
	return (
		<>
			<span data-testid="video-artifact">{canvas.videoArtifact ? 'video' : 'none'}</span>
			<button type="button" onClick={() => background.selectType('graphic')}>
				select graphic background
			</button>
		</>
	)
}

function GraphicCaptureProbe() {
	const { background, canvas } = useTemplateStudio()
	useEffect(() => {
		mocks.templateArtifact = canvas.artifact
		mocks.templateVectorArtifact = canvas.vectorArtifact
		canvas.registerGraphicFrame(mocks.captureGraphicFrame)
		return () => {
			mocks.templateArtifact = undefined
			mocks.templateVectorArtifact = undefined
			canvas.registerGraphicFrame(null)
		}
	}, [canvas])
	return (
		<>
			<button type="button" onClick={() => background.selectType('graphic')}>
				select graphic for export
			</button>
			<button type="button" onClick={() => canvas.registerGraphicFrame(null)}>
				unregister graphic frame
			</button>
		</>
	)
}

function ImageRaceProbe() {
	const { images } = useTemplateStudio()
	const state = images.states['1:1']
	return (
		<>
			<span data-testid="slot-profile">{state?.profileId}</span>
			<span data-testid="slot-generating">{String(state?.generating)}</span>
			<span data-testid="slot-image-profile">
				{state?.image?.kind === 'generated' ? state.image.profileId : 'none'}
			</span>
			<button type="button" onClick={() => void images.generate('1:1')}>
				start slot generation
			</button>
			<button type="button" onClick={() => images.selectProfile('1:1', 7)}>
				select slot profile
			</button>
			<button type="button" onClick={() => images.update('1:1', { profileId: 7 } as never)}>
				patch slot profile
			</button>
			<button
				type="button"
				onClick={() => {
					images.selectProfile('1:1', 7)
					void images.generate('1:1')
				}}
			>
				race slot profile
			</button>
		</>
	)
}

/**
 * 컨트롤은 **레이어를 고른 그때만** 나온다(사용자 지시, 2026-09-10) — 슬롯 컨트롤을 보는
 * 테스트는 먼저 레이어 패널에서 그 레이어를 고른다.
 */
/** 판 클릭 = 움직임 없는 pointerdown/up 쌍. 끌기와 가르므로 click 하나로는 안 된다. */
function clickCanvas(element: Element) {
	fireEvent.pointerDown(element, { clientX: 10, clientY: 10 })
	fireEvent.pointerUp(element, { clientX: 10, clientY: 10 })
}

type LayerKind = 'text' | 'image' | 'vector' | 'background'

/** 🔑 라벨이 아니라 종류로 집는다 — 이름에 개수가 붙어(Text3) 라벨 일치로는 못 찾는다. */
function layerGroupRow(kind: LayerKind) {
	const row =
		screen
			.queryByRole('region', { name: 'Layers' })
			?.querySelector(`[data-slot="template-layer-group"][data-kind="${kind}"]`) ??
		screen.queryByRole('button', {
			name: (
				{
					text: 'Text',
					image: 'Image',
					vector: 'Symbol',
					background: 'Background',
				} as const
			)[kind],
		})
	if (!row) throw new Error(`레이어 묶음을 찾지 못했습니다: ${kind}`)
	return row
}

/**
 * 그 묶음이 **골라진 상태로 만든다.** 🔴 무조건 누르면 안 된다 — 첫 묶음은 처음부터 골라져 있어
 * (사용자 지시, 2026-09-29) 한 번 더 누르면 오히려 풀린다.
 */
function selectLayerGroup(kind: LayerKind) {
	const row = layerGroupRow(kind)
	fireEvent.click(row)
}

function selectLayer(label: string) {
	const group =
		label === 'Background'
			? 'Background'
			: label.startsWith('배경')
				? 'Image'
				: ['Title', 'Years', 'Slogan'].includes(label)
					? 'Text'
					: label
	const layers = screen.queryByRole('region', { name: 'Layers' })
	fireEvent.click(
		layers
			? within(layers).getByRole('button', { name: group })
			: screen.getByRole('button', { name: label }),
	)
}

function openImageColors() {
	const adjustment = screen.queryByRole('button', { name: 'Adjustment' })
	if (adjustment) fireEvent.click(adjustment)
	const custom = screen.queryByRole('radio', { name: 'Custom' })
	if (custom) fireEvent.click(custom)
}

describe('TemplateGenerator', () => {
	beforeEach(() => {
		// 🔴 임시 저장은 자리가 하나뿐이라 테스트끼리 샌다.
		window.localStorage.clear()
		vi.clearAllMocks()
		mocks.captureGraphicFrame.mockReturnValue('data:image/png;base64,graphic')
		mocks.canExportTemplate.mockReturnValue(true)
		mocks.mountGraphicPreview.mockResolvedValue({
			captureFrame: mocks.captureGraphicFrame,
			artifacts: { raster: { source: { withSurface: () => mocks.captureGraphicFrame() } } },
			destroy: mocks.destroyGraphicPreview,
			getViewport: () => ({ width: 400, height: 300 }),
			resize: mocks.resizeGraphicPreview,
			update: mocks.updateGraphicPreview,
		})
		sampleMocks.fetchSampleImages.mockResolvedValue([])
		mocks.resizeObserverCallback = undefined
		mocks.templateArtifact = undefined
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: ResizeObserverCallback) {
					mocks.resizeObserverCallback = callback
				}
				observe() {}
				disconnect() {}
			},
		)
	})
	afterEach(() => {
		cleanup()
		vi.unstubAllGlobals()
	})

	it('편집 취소는 이미지·설정을 복원하고 늦은 생성 결과를 무시한다', async () => {
		const source = {
			...template,
			html: '<div data-node-id="photo" data-image-carrier=""></div>',
			nodeConfigs: { photo: { imageInput: { profileId: 7 } } },
		}
		const config = deriveTemplateStudioConfig(source, imageConfigs, effectiveGraphicConfigs)
		const { result } = renderHook(useTemplateStudio, {
			wrapper: ({ children }) => (
				<TemplateStudioProvider config={config} template={source} categoryTitle="카드">
					{children}
				</TemplateStudioProvider>
			),
		})
		const sample = {
			id: 12,
			name: '기존 이미지',
			alt: '',
			url: '/original.png',
			thumbnailUrl: '/original.png',
			lineArt: false,
			group: '',
			width: null,
			height: null,
		}
		act(() => {
			result.current.images.selectSampleImage('photo', sample)
			result.current.images.update('photo', {
				prompt: '원래 프롬프트',
				transform: { x: 10, y: 20, scale: 2, rotate: 0 },
			})
		})
		const original = result.current.images.states.photo
		let finish!: (value: unknown) => void
		mocks.requestImageGeneration.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					finish = resolve
				}),
		)
		act(() => result.current.editing.begin('photo'))
		act(() => {
			result.current.layers.select('background')
			result.current.images.update('photo', { prompt: '새 프롬프트' })
		})
		expect(result.current.layers.selectedId).toBe('photo')
		let pending!: Promise<void>
		act(() => {
			pending = result.current.images.generate('photo')
		})
		expect(result.current.editing.busy).toBe(true)
		act(() => result.current.editing.complete())
		expect(result.current.editing.targetId).toBe('photo')
		act(() => result.current.editing.cancel())
		expect(result.current.images.states.photo).toEqual(original)
		act(() => result.current.editing.begin('photo'))
		await act(async () => {
			finish({ generatedImages: [{ id: 99, url: '/late.png' }] })
			await pending
		})
		expect(result.current.images.states.photo).toEqual(original)
		act(() =>
			result.current.images.selectSampleImage('photo', {
				...sample,
				id: 13,
				url: '/replacement.png',
			}),
		)
		expect(result.current.images.states.photo.transform).toBeUndefined()
		act(() => result.current.editing.reset())
		expect(result.current.images.states.photo.image?.url).toBe('/replacement.png')
		act(() => result.current.editing.cancel())
		expect(result.current.images.states.photo).toEqual(original)
	})

	it('배경 편집은 디밍을 보존하며 교체하고 실패 후 재시도·완료할 수 있다', async () => {
		const config = deriveTemplateStudioConfig(template, imageConfigs, effectiveGraphicConfigs)
		const { result } = renderHook(useTemplateStudio, {
			wrapper: ({ children }) => (
				<TemplateStudioProvider config={config} template={template} categoryTitle="카드">
					{children}
				</TemplateStudioProvider>
			),
		})
		act(() => result.current.editing.begin('background'))
		act(() => {
			result.current.background.selectType('image')
			result.current.background.update({
				dimmer: true,
				dimmerOpacity: 0.6,
				imageMode: 'generate',
				prompt: '산과 바다',
			})
			result.current.background.selectSampleImage({
				id: 12,
				name: '원본',
				alt: '',
				url: '/original.png',
				thumbnailUrl: '/original.png',
				lineArt: false,
				group: '',
				width: null,
				height: null,
			})
		})
		mocks.requestImageGeneration.mockRejectedValueOnce(new Error('실패'))
		await act(async () => result.current.background.generate())
		expect(result.current.background.state).toMatchObject({
			prompt: '산과 바다',
			dimmerOpacity: 0.6,
			image: { url: '/original.png' },
			generating: false,
			error: expect.any(String),
		})
		mocks.requestImageGeneration.mockResolvedValueOnce({
			generatedImages: [{ id: 13, url: '/new.png' }],
		})
		await act(async () => result.current.background.generate())
		act(() => result.current.background.update({ imageMode: 'preset' }))
		expect(result.current.background.state).toMatchObject({
			prompt: '산과 바다',
			dimmerOpacity: 0.6,
			image: { url: '/new.png' },
			error: null,
		})
		act(() => result.current.editing.complete())
		expect(result.current.editing.targetId).toBeNull()
		expect(result.current.background.state.image?.url).toBe('/new.png')
	})

	it('공통 Studio 작업대에서 템플릿을 내보낸다', () => {
		const { container } = render(<TemplateGenerator categoryTitle="카드" template={template} />)

		expect(container.querySelector('[data-slot="studio-layout-workspace"]')).not.toBeNull()
		// 사이드바는 높이만 가두고 overflow는 잠그지 않는다 — 자산 브라우저 패널이 캔버스 위로 나가야 한다.
		const workspaceSidebar = container.querySelector('[data-slot="studio-sidebar"]')
		expect(workspaceSidebar).toHaveClass('h-full')
		expect(workspaceSidebar).not.toHaveClass('lg:overflow-hidden')
		expect(container.querySelector('[data-slot="studio-layout-canvas"]')).toHaveClass(
			'lg:h-full',
			'lg:min-h-0',
		)
		expect(container.querySelector('[data-slot="studio-sidebar"]')).not.toBeNull()
		// 🔑 페이지 선택은 **왼쪽 패널의 위 블록**이 소유한다 — 오른쪽 헤더가 아니다.
		const left = container.querySelector('[data-slot="studio-layout-selection"]')
		expect(left).not.toBeNull()
		expect(
			within(left as HTMLElement).getByRole('button', { name: '템플릿 변경' }),
		).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '저장' }))

		// 포맷 셀렉트 기본값인 PNG 요청이 공통 useExport로 전달된다.
		expect(mocks.exportTemplate).toHaveBeenCalledWith('png')
	})

	it('공통 Export 판정이 거부하면 Format이 있어도 내보내기 버튼을 잠근다', () => {
		mocks.canExportTemplate.mockReturnValue(false)
		render(<TemplateGenerator categoryTitle="카드" template={template} />)

		expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
	})

	it('UI는 Effective Config 포맷을 표시하고 Template adapter가 없는 요청은 실행 직전 차단한다', () => {
		const derived = deriveTemplateStudioConfig(template, imageConfigs, effectiveGraphicConfigs)
		const config = { ...derived, output: { ...derived.output, formats: ['svg'] as const } }
		render(
			<TemplateStudioProvider config={config} template={template} categoryTitle="카드">
				<TemplateOutputProbe />
			</TemplateStudioProvider>,
		)

		expect(screen.getByTestId('template-output-format')).toHaveTextContent('svg')
		expect(screen.getByTestId('template-output-formats')).toHaveTextContent('svg')
		fireEvent.click(screen.getByRole('button', { name: 'export unsupported svg' }))
		expect(mocks.exportTemplate).not.toHaveBeenCalled()
	})

	it('Raster Artifact producer는 export 실행 시점의 그래픽 프레임을 합성한다', () => {
		mocks.captureGraphicFrame.mockReturnValue('/graphic-frame.png')
		render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(template, imageConfigs, effectiveGraphicConfigs)}
				template={template}
				categoryTitle="카드"
			>
				<GraphicCaptureProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'select graphic for export' }))
		const artifact = mocks.templateArtifact?.()
		mocks.captureGraphicFrame.mockReturnValue('/newest-graphic-frame.png')
		mocks.templateArtifact?.()

		expect(mocks.captureGraphicFrame).toHaveBeenCalledTimes(2)
		expect(artifact).toMatchObject({
			kind: 'raster',
			source: { withSurface: expect.any(Function) },
		})
	})

	/**
	 * 🔴 벡터도 그래픽 배경을 굳혀 실어야 한다. 예전에는 벡터만 이걸 건너뛰어(「래스터 프레임이 판
	 * 전체를 이미지로 덮어 인쇄용 벡터의 목적을 없앤다」) PDF·SVG에서 배경이 통째로 사라졌다.
	 * 래스터와 벡터가 **같은 합성 HTML**을 쓰는 것이 그 재발을 막는 불변식이다.
	 */
	it('Vector Artifact producer도 export 실행 시점의 그래픽 프레임을 합성한다', () => {
		mocks.captureGraphicFrame.mockReturnValue('/graphic-frame.png')
		render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(template, imageConfigs, effectiveGraphicConfigs)}
				template={template}
				categoryTitle="카드"
			>
				<GraphicCaptureProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'select graphic for export' }))
		mocks.captureGraphicFrame.mockClear()
		void mocks.templateVectorArtifact?.()

		expect(mocks.captureGraphicFrame).toHaveBeenCalledTimes(1)
	})

	/**
	 * 🔴 **내보내기는 미리보기와 같은 조건으로 판단한다.** 캔버스는 고른 그래픽 설정이 있을 때만
	 * 셰이더를 그리므로, 목록이 비면 화면에도 그래픽이 없다. 그때 프레임을 요구하면 **모든 형식의
	 * 내보내기가 영구 차단된다** — 창작자가 고칠 방법이 없는 「막힌 실패」다.
	 */
	it('그릴 그래픽이 없으면 차단하지 않는다', () => {
		render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(template, imageConfigs, [])}
				template={template}
				categoryTitle="카드"
			>
				<GraphicCaptureProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'select graphic for export' }))
		fireEvent.click(screen.getByRole('button', { name: 'unregister graphic frame' }))

		expect(() => mocks.templateArtifact?.()).not.toThrow()
	})

	/**
	 * 🔴 캡처가 등록되기 전에 내보내면 배경이 조용히 빠진 판이 나간다. 창작자가 「미리보기를 기다렸다
	 * 다시」로 고칠 수 있는 사유이므로 거부하고 알린다 — 조용한 누락이 이 작업의 고치는 대상이다.
	 */
	it('그래픽 프레임이 없으면 내보내기를 거부한다', () => {
		render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(template, imageConfigs, effectiveGraphicConfigs)}
				template={template}
				categoryTitle="카드"
			>
				<GraphicCaptureProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'select graphic for export' }))
		fireEvent.click(screen.getByRole('button', { name: 'unregister graphic frame' }))

		// 🔑 두 producer 모두 `exportHtml()`을 본문 진입 전에 평가하므로 **동기로** 던진다.
		//    `useExport`의 try가 그것을 잡아 message를 화면에 띄운다.
		expect(() => mocks.templateArtifact?.()).toThrow('미리보기가 준비된 뒤')
		expect(() => mocks.templateVectorArtifact?.()).toThrow('미리보기가 준비된 뒤')
	})

	it('출력 캔버스 비율을 작업 영역에 맞춰 프리뷰에 반영한다', () => {
		const { container } = render(<TemplateGenerator categoryTitle="카드" template={template} />)

		act(() => {
			mocks.resizeObserverCallback?.(
				[{ contentRect: { width: 1000, height: 600 } } as ResizeObserverEntry],
				{} as ResizeObserver,
			)
		})

		const preview = container.querySelector<HTMLElement>('[data-slot="template-preview"]')
		// 잰 값은 **안쪽 상자**다 — 400×300을 1000×600에 맞추면 세로가 먼저 차서 배율 2가 된다.
		expect(preview).toHaveStyle({ width: '800px', height: '600px' })
		/*
		 * 🔴 강조선이 나갈 자리는 판을 줄여서가 아니라 무대의 여백으로 만든다 — 줄이는 쪽으로 하면
		 *    가운데 정렬이 남는 자리를 반씩 나누는데, 아래는 바 예약 덕에 남아돌고 위만 빠듯해진다.
		 */
		expect(preview?.parentElement?.className).toContain('p-1')
	})

	it('아이덴티티 카드의 Change로 연 자산 브라우저에서 고른 템플릿 작업대로 이동한다', async () => {
		// 목록은 패널이 열릴 때 /api/templates에서 온다 — 페이지는 카테고리 이름만 싣는다.
		browseMocks.fetchCreateNavigation.mockResolvedValue(navigationCategories)
		render(<TemplateGenerator categoryTitle="카드" template={template} />)

		// 카드가 현재 템플릿 이름과 카테고리를 보여준다.
		expect(screen.getByText('테스트 템플릿')).toBeInTheDocument()
		expect(screen.getByText('카드')).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '템플릿 변경' }))
		const panel = screen.getByRole('dialog', { name: 'Templates' })
		fireEvent.click(await within(panel).findByRole('button', { name: /두 번째 템플릿/ }))

		expect(mocks.push).toHaveBeenCalledWith('/studio/template/second-template')
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('개방된 이미지 슬롯에서 생성한 이미지를 미리보기에 합성한다', async () => {
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 5, url: '/api/generated-images/file/bg.png' }],
		})
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					// 이미지 슬롯 노드는 임포트가 캐리어로 마킹한 표면이다 — compose는 캐리어 전용.
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)

		selectLayerGroup('image')

		fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '파스텔 배경' } })
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		expect(mocks.requestImageGeneration).toHaveBeenCalledWith({
			prompt: '파스텔 배경',
			count: 1,
			profileId: 7,
			aspectRatio: '1:1', // 박스가 없으면 선택된 Config의 기본 비율
			imageSize: '2K',
		})
		await waitFor(() =>
			expect(container.innerHTML).toContain('/api/generated-images/file/bg.png'),
		)
	})

	it('이미지 슬롯 Dimming은 슬롯에 합성되고, 컨트롤이 없는 Preset에서는 걸리지 않는다', async () => {
		const user = userEvent.setup()
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)
		const dimmer = () => container.querySelector<HTMLElement>('[data-image-dimmer]')

		selectLayerGroup('image')
		expect(dimmer()).toBeNull()

		await user.click(
			within(screen.getByRole('radiogroup', { name: 'Use' })).getByRole('radio', {
				name: 'On',
			}),
		)
		await waitFor(() => expect(dimmer()?.style.backgroundColor).toBe('rgba(0, 0, 0, 0.2)'))

		await user.click(screen.getByRole('radio', { name: 'Preset' }))
		await waitFor(() => expect(dimmer()).toBeNull())
	})

	it('중첩 편집 동안 트리 밖의 셸 헤더를 잠그고, 취소하면 푼다', async () => {
		const user = userEvent.setup()
		function ShellHeader() {
			return <nav aria-label="셸" inert={useShellLocked()} />
		}
		render(
			<>
				<ShellHeader />
				<TemplateGenerator
					categoryTitle="카드"
					template={{
						...template,
						html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
						nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
					}}
				/>
			</>,
		)
		const header = () => screen.getByRole('navigation', { name: '셸' })
		expect(header()).not.toHaveAttribute('inert')

		selectLayerGroup('image')
		expect(header()).toHaveAttribute('inert')

		await user.click(screen.getByRole('button', { name: '취소' }))
		expect(header()).not.toHaveAttribute('inert')
	})

	it('심볼 색은 브랜드 색 스와치로 고르고, Custom은 열지 않는다', async () => {
		const user = userEvent.setup()
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME"><img data-node-id="3:1" data-figma-type="VECTOR" data-name="Logo" src="/logo.svg"></div>',
					nodeConfigs: {
						'3:1': {
							creator: {
								access: 'editable',
								visibility: { defaultVisible: true, allowToggle: true },
							},
							vectorColor: '#112233',
						},
					},
				}}
			/>,
		)

		selectLayerGroup('vector')
		const swatch = await screen.findByRole('radio', { name: /색상 #002c5f$/ })
		expect(screen.getByRole('radio', { name: 'Custom' })).toBeDisabled()

		await user.click(swatch)

		expect(swatch).toBeChecked()
		await waitFor(() =>
			expect(
				container.querySelector<HTMLElement>('[data-node-id="3:1"]')?.style.backgroundColor,
			).toBe('rgb(0, 44, 95)'),
		)
	})

	// 슬롯의 첫 화면은 Generate다 — Preset으로 옮기는 패치가 세션 상태에 닿지 않으면 세그먼트가 움직이지 않는다.
	it('이미지 슬롯의 Image Type을 Preset으로 옮기면 샘플 이미지 카드가 나온다', async () => {
		const user = userEvent.setup()
		render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)

		selectLayerGroup('image')

		await user.click(screen.getByRole('radio', { name: 'Preset' }))

		expect(screen.getByRole('radio', { name: 'Preset' })).toHaveAttribute(
			'aria-checked',
			'true',
		)
		await waitFor(() => expect(sampleMocks.fetchSampleImages).toHaveBeenCalled())
		expect(screen.queryByRole('button', { name: '이미지 생성' })).not.toBeInTheDocument()
	})

	it('저작 config의 imageColorize를 이미지 교체 시 재적용한다', async () => {
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 5, url: '/api/generated-images/file/bg.png' }],
		})
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: {
						'1:1': { imageInput: { profileId: 7 }, imageColorize: { line: '#ff0000' } },
					},
				}}
			/>,
		)

		selectLayerGroup('image')

		fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '파스텔 배경' } })
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		// 호출부가 imageColorize를 깔지 않으면 컬러 치환(마스크 오버레이)이 사라진다 — 그 스프레드를 잡는다.
		await waitFor(() => {
			expect(
				container.querySelector('[data-slot="studio-layout-canvas"]')?.innerHTML,
			).toContain('mask-image')
			expect(container.innerHTML).toContain('rgb(255, 0, 0)')
		})
	})

	it('Image Config가 color-adjustment를 지원하지 않으면 Template 값 override를 적용하지 않는다', async () => {
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 5, url: '/api/generated-images/file/plain.png' }],
		})
		const baseConfig = createImageConfig(7)
		const noColorConfig: ImageStudioConfig = {
			...baseConfig,
			image: {
				...baseConfig.image,
				features: baseConfig.image.features.filter(
					(feature) => feature.type !== 'color-adjustment',
				),
			},
		}
		const { container } = render(
			<TemplateGenerator
				imageConfigs={[noColorConfig]}
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: {
						'1:1': {
							imageInput: { profileId: 7 },
							imageColorize: { line: '#ff0000' },
						},
					},
				}}
			/>,
		)

		selectLayerGroup('image')

		fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '원본 이미지' } })
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		await waitFor(() =>
			expect(container.innerHTML).toContain('/api/generated-images/file/plain.png'),
		)
		expect(
			container.querySelector('[data-slot="studio-layout-canvas"]')?.innerHTML,
		).not.toContain('mask-image')
	})

	it('프로파일을 바꾸면 선택된 Image Config의 feature UI로 즉시 교체한다', async () => {
		const user = userEvent.setup()
		const colorConfig = createImageConfig(11)
		const plainBase = createImageConfig(7)
		const plainConfig: ImageStudioConfig = {
			...plainBase,
			image: {
				...plainBase.image,
				features: plainBase.image.features.filter(
					(feature) => feature.type !== 'color-adjustment',
				),
			},
		}
		const { container } = render(
			<TemplateGenerator
				imageConfigs={[colorConfig, plainConfig]}
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: {} } },
				}}
			/>,
		)

		selectLayer('배경')
		const slot = container.querySelector<HTMLElement>('[data-slot="studio-layout-workspace"]')
		expect(slot).not.toBeNull()
		if (!slot) return
		openImageColors()
		expect(
			within(slot).getByLabelText(/^(Line Color|Foreground) 색상 선택$/),
		).toBeInTheDocument()

		fireEvent.click(screen.getByRole('button', { name: '이미지 프로파일 변경' }))
		if (!screen.queryByRole('combobox', { name: 'Image' }))
			fireEvent.click(screen.getByRole('button', { name: '이미지 프로파일 변경' }))
		screen.getByRole('combobox', { name: 'Image' }).focus()
		await user.keyboard('{ArrowDown}')
		await user.click(screen.getByRole('option', { name: '프로파일 7' }))

		await waitFor(() =>
			expect(within(slot).queryByLabelText(/^(Line Color|Foreground) 색상 선택$/)).toBeNull(),
		)
	})

	it('일괄 텍스트 색은 브랜드 색에서 고르고, 만졌을 때만 모든 텍스트 슬롯에 합성한다', async () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1" style="color:#1a1a1a">TITLE</p><p data-node-id="t2" style="color:#1a1a1a">YEARS</p>',
					nodeConfigs: {
						t1: { input: { label: 'Title' } },
						t2: { input: { label: 'Years' } },
					},
				}}
			/>,
		)

		selectLayerGroup('text')

		// 만지기 전 — 저작 색 유지.
		expect(container.innerHTML).not.toContain('rgb(0, 44, 95)')

		// 정본 밖 색을 열지 않는다 — Custom은 잠겨 있다.
		expect(screen.getByRole('radio', { name: 'Custom' })).toBeDisabled()
		fireEvent.click(await screen.findByRole('radio', { name: '텍스트 색상 #002c5f' }))

		const preview = container.querySelector('[data-slot="studio-layout-canvas"]')
		expect(preview?.querySelectorAll('p[style*="rgb(0, 44, 95)"]').length).toBe(2)
	})

	it('챗이 보낸 편집안이 캔버스까지 반영된다 — 두 트리를 잇는 유일한 통로다', () => {
		const { container } = render(
			<TemplateAuthoringHandoffProvider>
				<AuthoringProbe templateId={1} patch={{ text: { t1: '바뀐 제목' } }} />
				<TemplateGenerator
					categoryTitle="카드"
					template={{
						...template,
						html: '<p data-node-id="t1">TITLE</p>',
						nodeConfigs: { t1: { input: { label: 'Title' } } },
					}}
				/>
			</TemplateAuthoringHandoffProvider>,
		)
		const canvas = () => container.querySelector('[data-slot="studio-layout-canvas"]')
		expect(canvas()?.textContent).toContain('TITLE')

		fireEvent.click(screen.getByRole('button', { name: 'send patch' }))
		expect(canvas()?.textContent).toContain('바뀐 제목')
	})

	it('🔴 이미지 슬롯 프롬프트는 사이드바를 거치지 않고 곧바로 생성까지 돈다', () => {
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 9, url: '/api/generated-images/file/x.png' }],
		})
		render(
			<TemplateAuthoringHandoffProvider>
				<AuthoringProbe
					templateId={1}
					patch={{ images: { '1:1': { prompt: '컨테이너선 라인아트' } } }}
				/>
				<TemplateGenerator
					categoryTitle="카드"
					template={{
						...template,
						html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
						nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
					}}
				/>
			</TemplateAuthoringHandoffProvider>,
		)
		expect(mocks.requestImageGeneration).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'send patch' }))

		// 🔑 프롬프트를 인자로 넘기므로 세션 상태 반영을 기다리지 않고 같은 tick에 돈다.
		expect(mocks.requestImageGeneration).toHaveBeenCalledWith(
			expect.objectContaining({ prompt: '컨테이너선 라인아트', profileId: 7 }),
		)
	})

	it('🔴 다른 템플릿용 편집안은 집어 가지 않는다 — 슬롯 id가 겹치면 조용히 엉뚱한 값이 든다', () => {
		const { container } = render(
			<TemplateAuthoringHandoffProvider>
				<AuthoringProbe templateId={999} patch={{ text: { t1: '다른 템플릿' } }} />
				<TemplateGenerator
					categoryTitle="카드"
					template={{
						...template,
						html: '<p data-node-id="t1">TITLE</p>',
						nodeConfigs: { t1: { input: { label: 'Title' } } },
					}}
				/>
			</TemplateAuthoringHandoffProvider>,
		)
		fireEvent.click(screen.getByRole('button', { name: 'send patch' }))
		const canvas = container.querySelector('[data-slot="studio-layout-canvas"]')
		expect(canvas?.textContent).toContain('TITLE')
		expect(canvas?.textContent).not.toContain('다른 템플릿')
	})

	/**
	 * 🔴 레이어 패널은 **일러스트레이터·피그마처럼 모든 레이어를 평평히 보여 주지 않는다.**
	 * text·image·CI·background의 몇 개의 큰 묶음으로 묶고 그 아래에 레이어 이름을 늘어놓는다
	 * (사용자 지시, 2026-09-10).
	 * 🔴 **묶음 머리글은 클릭되지 않는다 — hover만 된다.** 고르는 것은 자식이다.
	 * 🔴 묶음 순서는 고정이고 배경이 마지막이다. 묶음은 겹침에서 한 자리를 갖지 않으므로(텍스트와
	 * 이미지가 z에서 엇갈린다) 겹침 순서로 정렬할 수 없다 — 대신 모든 템플릿에서 목록이 같다.
	 */
	it('레이어 목록은 묶음과 하위를 모두 보여 주고, 둘 다 누를 수 있다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html:
						'<div data-node-id="i1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>' +
						'<p data-node-id="t1">TITLE</p><p data-node-id="t2">YEARS</p>' +
						'<p data-node-id="t3">SLOGAN</p>',
					nodeConfigs: {
						i1: { imageInput: { profileId: 7 } },
						t1: { input: { label: 'Title' } },
						t2: { input: { label: 'Years' } },
						t3: { input: { label: 'Slogan' } },
					},
				}}
			/>,
		)
		const panel = container.querySelector(
			'[data-slot="studio-layout-selection"]',
		) as HTMLElement
		const textOf = (selector: string) =>
			Array.from(panel.querySelectorAll(selector), (element) => element.textContent)

		expect(textOf('[data-slot="template-layer-group"]')).toEqual([
			'Text',
			'Symbol',
			'Image',
			'Background',
		])
		expect(screen.getByRole('button', { name: 'Symbol' })).toBeDisabled()
	})

	it('판의 텍스트를 클릭하면 텍스트 묶음이 선택되고 누른 것만 밝아진다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html:
						'<div data-node-id="i1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>' +
						'<p data-node-id="t1">TITLE</p><p data-node-id="t2">YEARS</p>',
					nodeConfigs: {
						i1: { imageInput: { profileId: 7 } },
						t1: { input: { label: 'Title' } },
						t2: { input: { label: 'Years' } },
					},
				}}
			/>,
		)
		const titles = () =>
			Array.from(
				container.querySelectorAll(
					'[data-slot="studio-sidebar"] [data-slot="controller-group"]',
				),
			).map((group) => group.querySelector('span')?.textContent?.trim())
		const node = (nodeId: string) =>
			container.querySelector(`[data-node-id="${nodeId}"]`) as Element

		// 첫 묶음(Text)이 이미 골라져 있으므로, 다른 것을 눌러 옮겨지는지로 본다.
		clickCanvas(node('i1'))
		expect(titles()).toContain('Generate')
		expect(titles()).not.toContain('Text')

		// 🔑 선택은 텍스트 전체지만 판에서 밝아지는 것은 **누른 하나**다.
		// 🔴 jsdom은 모든 rect가 0이라 그대로 두면 강조가 0개로 나온다 — 이 단언에만 자를 세운다.
		const rect = vi
			.spyOn(Element.prototype, 'getBoundingClientRect')
			.mockReturnValue({ left: 0, top: 0, width: 400, height: 300 } as DOMRect)
		try {
			clickCanvas(node('t2'))
			expect(titles()).toContain('Text')
			expect(
				container.querySelectorAll('[data-slot="template-slot-highlight"]'),
			).toHaveLength(1)
		} finally {
			rect.mockRestore()
		}
	})

	it('슬롯이 아닌 자리를 누르면 배경이 선택된다 — 예외 분기 없이', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1">TITLE</p>',
					nodeConfigs: { t1: { input: { label: 'Title' } } },
				}}
			/>,
		)
		const titles = () =>
			Array.from(
				container.querySelectorAll(
					'[data-slot="studio-sidebar"] [data-slot="controller-group"]',
				),
			).map((group) => group.querySelector('span')?.textContent?.trim())

		clickCanvas(container.querySelector('[data-background-type]') as Element)

		expect(titles()).toContain('Background')
		expect(titles()).not.toContain('Text')
	})

	/**
	 * 🔴 판에서 글자를 누르면 **우측 입력칸에 커서까지** 간다(사용자 지시, 2026-09-29).
	 * 커서가 판이 아니라 컨트롤러에 생기는 것이 이 스튜디오의 규칙이라, 이 한 걸음이 없으면
	 * 누른 뒤 손이 한 번 더 가야 한다.
	 */
	it('판의 글자를 누르면 그 슬롯의 입력칸에 커서가 간다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1">TITLE</p><p data-node-id="t2">YEARS</p>',
					nodeConfigs: {
						t1: { input: { label: 'Title' } },
						t2: { input: { label: 'Years' } },
					},
				}}
			/>,
		)
		const inputOf = (nodeId: string) =>
			container
				.querySelector(`[data-text-slot="${nodeId}"]`)
				?.querySelector('input, textarea')

		clickCanvas(container.querySelector('[data-node-id="t2"]') as Element)

		expect(document.activeElement).toBe(inputOf('t2'))
		expect(document.activeElement).not.toBe(inputOf('t1'))
		// 🔴 커서는 글자 **끝**이다 — 맨 앞이면 누르자마자 친 글자가 기존 글자 앞에 끼어든다.
		const focused = document.activeElement as HTMLInputElement
		expect(focused.selectionStart).toBe(focused.value.length)
		expect(focused.value.length).toBeGreaterThan(0)
	})

	/**
	 * 🔴 **새로고침 정도는 버틴다**(사용자 지시, 2026-09-29) — 값이 브라우저 메모리에만 있으면
	 * 실수로 새로고침한 사람이 작업을 통째로 잃는다.
	 */
	it('넣은 값을 임시 저장했다가 다시 열 때 되살린다', async () => {
		const props = {
			categoryTitle: '카드',
			userId: '7',
			template: {
				...template,
				html: '<p data-node-id="t1">TITLE</p>',
				nodeConfigs: { t1: { input: { label: 'Title' } } },
			},
		} as const

		const first = render(<TemplateGenerator {...props} />)
		const input = () => screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement
		fireEvent.change(input(), { target: { value: '되살아나라' } })
		// 저장은 값이 멈춘 뒤에 한 번만 일어난다.
		await waitFor(() => expect(window.localStorage.getItem('lbs.templateDraft')).not.toBeNull())
		first.unmount()

		render(<TemplateGenerator {...props} />)

		expect(input().value).toBe('되살아나라')
		fireEvent.click(screen.getByRole('button', { name: /^Reset$/ }))
		expect(input().value).toBe('TITLE')
		await waitFor(() =>
			expect(window.localStorage.getItem('lbs.templateDraft')).not.toContain('되살아나라'),
		)
	})

	// 🔴 공용 PC에서 남의 초안이 내 화면에 뜨면 안 된다.
	it('다른 계정으로 열면 남의 초안을 되살리지 않는다', async () => {
		const template2 = {
			...template,
			html: '<p data-node-id="t1">TITLE</p>',
			nodeConfigs: { t1: { input: { label: 'Title' } } },
		}
		const first = render(
			<TemplateGenerator categoryTitle="카드" userId="7" template={template2} />,
		)
		fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
			target: { value: '내 것' },
		})
		await waitFor(() => expect(window.localStorage.getItem('lbs.templateDraft')).not.toBeNull())
		first.unmount()

		render(<TemplateGenerator categoryTitle="카드" userId="8" template={template2} />)

		expect((screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement).value).not.toBe(
			'내 것',
		)
	})

	/**
	 * 🔴 지나가는 자리를 옅게 비춘다 — **지금 누르면 무엇이 잡히는지**를 먼저 보여 준다
	 * (사용자 지시, 2026-09-29). 배경은 뺀다: 판 어디에 있든 늘 켜져 있어 알려 주는 것이 없다.
	 */
	it('슬롯 위를 지나면 미리 비추고, 배경 위에서는 비추지 않는다', () => {
		const rect = vi
			.spyOn(Element.prototype, 'getBoundingClientRect')
			.mockReturnValue({ left: 0, top: 0, width: 400, height: 300 } as DOMRect)
		try {
			const { container } = render(
				<TemplateGenerator
					categoryTitle="카드"
					template={{
						...template,
						html: '<p data-node-id="t1">TITLE</p>',
						nodeConfigs: { t1: { input: { label: 'Title' } } },
					}}
				/>,
			)
			const hovers = () => container.querySelectorAll('[data-slot="template-slot-hover"]')

			expect(hovers()).toHaveLength(0)

			fireEvent.pointerOver(container.querySelector('[data-node-id="t1"]') as Element)
			expect(hovers()).toHaveLength(1)

			// 배경(슬롯이 아닌 자리)에서는 뜨지 않는다.
			fireEvent.pointerOver(container.querySelector('[data-background-type]') as Element)
			expect(hovers()).toHaveLength(0)
		} finally {
			rect.mockRestore()
		}
	})

	// 🔴 판에서 같은 것을 다시 눌러도 풀리지 않는다 — 조작이 죽은 것처럼 보이면 안 된다.
	it('판에서 같은 것을 다시 눌러도 선택이 풀리지 않는다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1">TITLE</p>',
					nodeConfigs: { t1: { input: { label: 'Title' } } },
				}}
			/>,
		)
		const titles = () =>
			Array.from(
				container.querySelectorAll(
					'[data-slot="studio-sidebar"] [data-slot="controller-group"]',
				),
			).map((group) => group.querySelector('span')?.textContent?.trim())
		const text = container.querySelector('[data-node-id="t1"]') as Element

		clickCanvas(text)
		clickCanvas(text)

		expect(titles()).toContain('Text')
	})

	// 🔴 끌기는 선택이 아니다 — 그래픽 핸들을 끌고 놓은 것이 선택으로 읽히면 조작이 서로를 잡아먹는다.
	it('끌어서 놓으면 선택이 바뀌지 않는다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1">TITLE</p>',
					nodeConfigs: { t1: { input: { label: 'Title' } } },
				}}
			/>,
		)
		const titles = () =>
			Array.from(
				container.querySelectorAll(
					'[data-slot="studio-sidebar"] [data-slot="controller-group"]',
				),
			).map((group) => group.querySelector('span')?.textContent?.trim())

		// 배경으로 옮겨 둔 뒤, 텍스트 위에서 **끌면** 그대로 배경이어야 한다.
		clickCanvas(container.querySelector('[data-background-type]') as Element)
		expect(titles()).toContain('Background')

		const text = container.querySelector('[data-node-id="t1"]') as Element
		fireEvent.pointerDown(text, { clientX: 10, clientY: 10 })
		fireEvent.pointerUp(text, { clientX: 60, clientY: 40 })

		expect(titles()).toContain('Background')
		expect(titles()).not.toContain('Text')
	})

	it('Image 묶음은 첫 슬롯을 편집하고 다른 묶음 선택을 잠근다', () => {
		render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html:
						'<div data-node-id="i1" data-figma-type="FRAME" data-name="배경 A" data-image-carrier=""></div>' +
						'<div data-node-id="i2" data-figma-type="FRAME" data-name="배경 B" data-image-carrier=""></div>',
					nodeConfigs: {
						i1: { imageInput: { profileId: 7 } },
						i2: { imageInput: { profileId: 7 } },
					},
				}}
			/>,
		)

		selectLayer('Image')
		expect(screen.getByRole('region', { name: '선택한 레이어 편집' })).toBeInTheDocument()
		expect(screen.getByRole('group', { name: '배경 A' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Text' })).toBeDisabled()
	})

	/**
	 * 🔴 **평소에는 컨트롤이 하나도 없고, 레이어를 고른 그때만 그 레이어의 컨트롤이 나온다**
	 * (사용자 지시, 2026-09-10).
	 * 🔴 선택은 `focus`와 별개다. `focus`는 「지금 만지는 자리」라 입력칸에 커서가 들어가면
	 * 섹션(`section:text`)으로 바뀐다 — 그것을 선택으로 읽으면 **글자를 치는 순간 컨트롤이
	 * 통째로 사라진다.** 그래서 글자를 친 뒤에도 남아 있는지를 함께 잠근다.
	 */
	it('컨트롤은 묶음을 고른 그때만 나오고, 값을 만져도 풀리지 않는다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1">TITLE</p><p data-node-id="t2">YEARS</p>',
					nodeConfigs: {
						t1: { input: { label: 'Title' } },
						t2: { input: { label: 'Years' } },
					},
				}}
			/>,
		)
		const titles = () =>
			Array.from(container.querySelectorAll('[data-slot="controller-group"]')).map((group) =>
				group.querySelector('span')?.textContent?.trim(),
			)

		// 🔴 아무것도 고르지 않았으면 레이어 목록만 있다.
		expect(screen.getByRole('region', { name: 'Layers' })).toBeInTheDocument()
		expect(titles()).toContain('Text')

		// Text 묶음을 고르면 텍스트 슬롯이 **함께** 나온다 — 선택 단위가 묶음이라서다.
		// 🔴 캔버스가 같은 컨테이너에 있어 판의 글자까지 잡힌다 — 사이드바로 좁혀서 본다.
		selectLayerGroup('text')
		const sidebar = () =>
			container.querySelector('[data-slot="studio-sidebar"]')?.textContent ?? ''
		expect(titles()).toContain('Text')
		expect(sidebar()).toContain('YEARS')
		expect(sidebar()).toContain('TITLE')

		// 🔴 그 컨트롤을 만져도 선택이 풀리지 않는다 — `focus`를 선택으로 읽으면 여기서 사라진다.
		const input = screen.getByDisplayValue('YEARS')
		fireEvent.focus(input)
		fireEvent.change(input, { target: { value: 'YEARS 2' } })
		expect(titles()).toContain('Text')
		expect(sidebar()).toContain('YEARS 2')

		// 같은 묶음을 다시 누르면 선택이 풀리고 컨트롤도 사라진다.
		selectLayer('Title')
		expect(titles()).toContain('Text')
	})

	it('묶음을 고르면 그 섹션이 곧바로 활성화된다 — Text는 슬롯 여럿, Background는 노드 없음', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1">TITLE</p><p data-node-id="t2">YEARS</p>',
					nodeConfigs: {
						t1: { input: { label: 'Title' } },
						t2: { input: { label: 'Years' } },
					},
				}}
			/>,
		)

		const groups = () =>
			Array.from(container.querySelectorAll('[data-slot="controller-group"]'))
		const named = (title: string) =>
			groups().find((group) => group.querySelector('span')?.textContent?.trim() === title)

		// 🔴 Text와 Background는 이제 동시에 뜰 수 없다 — 한 번에 한 묶음만 고르므로 차례로 본다.
		selectLayer('Title')
		expect(named('Text')).toHaveAttribute('data-active', 'true')
		// 🔴 전에는 이 둘이 활성화되지 않았다 — 대상이 슬롯 하나로 고정돼 있었다.
		fireEvent.click(named('Text')?.querySelector('span') as Element)
		expect(named('Text')).toHaveAttribute('data-active', 'true')

		// 한 번에 한 묶음만 고르므로 Text와 Background는 동시에 뜨지 않는다.
		selectLayerGroup('background')
		expect(named('Text')).toBeUndefined()
		// 🔴 배경은 집을 노드가 없다 — 도화지를 집는다(`kind: 'canvas'`). 그래도 활성 면이 켜진다.
		//    전에는 대상이 슬롯 하나로 고정돼 있어 이것이 안 됐다.
		expect(named('Background')).toHaveAttribute('data-active', 'true')
	})

	it('입력칸에서 포커스가 빠져도 활성 섹션이 꺼지지 않는다 — 다음 대상이 덮어쓸 뿐이다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<p data-node-id="t1">TITLE</p><p data-node-id="t2">YEARS</p>',
					nodeConfigs: {
						t1: { input: { label: 'Title' } },
						t2: { input: { label: 'Years' } },
					},
				}}
			/>,
		)

		const textGroup = () =>
			Array.from(container.querySelectorAll('[data-slot="controller-group"]')).find(
				(group) => group.querySelector('span')?.textContent?.trim() === 'Text',
			)
		const fieldOf = (slotId: string) =>
			container.querySelector(
				`[data-text-slot="${slotId}"] textarea, [data-text-slot="${slotId}"] input`,
			) as HTMLElement

		selectLayerGroup('text')
		fireEvent.focus(fieldOf('t1'))
		expect(textGroup()).toHaveAttribute('data-active', 'true')

		/*
		 * 🔴 다음 대상을 누르는 클릭은 mousedown(blur)과 click 사이에 한 프레임을 둔다. 전에는 그
		 *    사이에 활성 섹션이 비어 회색 띠가 꺼졌다 켜지면서 패널이 깜빡였다(사용자 지적, 2026-09-30).
		 */
		fireEvent.blur(fieldOf('t1'))
		expect(textGroup()).toHaveAttribute('data-active', 'true')

		// 같은 묶음 안의 다른 글자로 옮겨도 교체만 일어난다.
		fireEvent.focus(fieldOf('t2'))
		expect(textGroup()).toHaveAttribute('data-active', 'true')
	})

	it('Background 섹션은 노드가 아니라 도화지를 집고, 면 없이 테두리만 그린다', () => {
		const { container } = render(<TemplateGenerator categoryTitle="카드" template={template} />)

		selectLayerGroup('background')
		const groups = Array.from(container.querySelectorAll('[data-slot="controller-group"]'))
		const background = groups.find(
			(group) => group.querySelector('span')?.textContent?.trim() === 'Background',
		)
		fireEvent.click(background?.querySelector('span') as Element)

		const overlays = container.querySelectorAll<HTMLElement>(
			'[data-slot="template-slot-highlight"]',
		)
		expect(overlays).toHaveLength(1)
		/*
		 * 캔버스 상자에서 **테두리 굵기만큼 밖으로** 넓힌 크기다 — 잴 것이 없고(노드가 아니므로
		 * getBoundingClientRect를 안 쓴다) 도화지 자신의 테두리는 판 밖에 그려진다.
		 */
		const line = 'max(1px, calc(1px / (1 * var(--preview-scale, 1))))'
		expect(overlays[0].style.width).toBe(`calc(400px + 2 * ${line})`)
		expect(overlays[0].style.left).toBe(`calc(0px - ${line})`)
		/*
		 * 🔴 강조선이 판 밖으로 나가므로 **자르는 상자 밖**에 있어야 한다 — 안에 두면 도화지를
		 *    고른 순간 네 변의 선이 통째로 사라진다.
		 */
		const clipped = container.querySelector('[data-slot="template-click-area"]')
		expect(clipped?.contains(overlays[0])).toBe(false)
		// 🔑 도화지 전체를 집을 때는 구별할 형제가 없다 — 면을 깔면 콘텐츠만 탁해진다.
		expect(overlays[0].style.backgroundColor).toBe('')
		expect(overlays[0].style.border).toContain('solid')
	})

	it('사용자 Line Color가 이미지 교체 시 colorize의 line을 갈아끼운다', async () => {
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 5, url: '/api/generated-images/file/bg.png' }],
		})
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: {
						'1:1': { imageInput: { profileId: 7 }, imageColorize: { line: '#ff0000' } },
					},
				}}
			/>,
		)

		selectLayerGroup('image')

		openImageColors()
		fireEvent.change(screen.getByLabelText(/^(Line Color|Foreground) 색상 선택$/), {
			target: { value: '#00ff00' },
		})
		fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '파스텔 배경' } })
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		await waitFor(() => {
			expect(
				container.querySelector('[data-slot="studio-layout-canvas"]')?.innerHTML,
			).toContain('mask-image')
			expect(container.innerHTML).toContain('rgb(0, 255, 0)') // 사용자 색이 저작 line을 대체
		})
	})

	// 색 치환은 라인 아트에만 뜻이 있다 — 샘플은 선화로 표시된 것만 열고 사진은 그대로 얹는다.
	it.each([
		{ lineArt: true, label: '선화 샘플은 색 치환을 받는다', colorized: true },
		{ lineArt: false, label: '선화가 아닌 샘플은 그대로 얹는다', colorized: false },
	])('$label', async ({ colorized, lineArt }) => {
		const user = userEvent.setup()
		sampleMocks.fetchSampleImages.mockResolvedValue([
			{
				id: 11,
				name: '도면 A',
				alt: '도면 A',
				url: '/api/sample-images/file/drawing.png',
				thumbnailUrl: '/api/sample-images/file/drawing-320x240.png',
				lineArt,
			},
		])
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: {
						'1:1': { imageInput: { profileId: 7 }, imageColorize: { line: '#ff0000' } },
					},
				}}
			/>,
		)

		selectLayerGroup('image')

		await user.click(screen.getByRole('radio', { name: 'Preset' }))
		await user.click(await screen.findByRole('button', { name: /도면 A/ }))

		await waitFor(() =>
			expect(container.innerHTML).toContain('/api/sample-images/file/drawing.png'),
		)
		expect(container.innerHTML.includes('rgb(255, 0, 0)')).toBe(colorized)
		// 치환이 열린 상태에는 그 색을 바꿀 손잡이도 함께 있어야 한다 — 판정과 UI가 갈리면 손잡이 없는 색이 된다.
		openImageColors()
		expect(screen.queryByLabelText(/^(Line Color|Foreground) 색상 선택$/) !== null).toBe(
			colorized,
		)
	})

	it('자산 브라우저가 분류 태그로 샘플 이미지를 거른다', async () => {
		const user = userEvent.setup()
		// 분류 목록은 값에서 역산한다 — 분류 테이블이 없으므로 빈 값은 어느 태그에도 안 걸린다.
		sampleMocks.fetchSampleImages.mockResolvedValue([
			{
				id: 11,
				name: '엔진 A',
				alt: '',
				url: '/a.png',
				thumbnailUrl: '/a.png',
				lineArt: true,
				group: '엔진',
			},
			{
				id: 12,
				name: '선박 B',
				alt: '',
				url: '/b.png',
				thumbnailUrl: '/b.png',
				lineArt: true,
				group: '선박',
			},
			{
				id: 13,
				name: '미분류 C',
				alt: '',
				url: '/c.png',
				thumbnailUrl: '/c.png',
				lineArt: true,
				group: '',
				width: null,
				height: null,
			},
		])
		render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)

		selectLayerGroup('image')

		await user.click(screen.getByRole('radio', { name: 'Preset' }))

		// 필터를 걸기 전에는 분류가 없는 것까지 전부 보인다.
		expect(await screen.findByRole('button', { name: /엔진 A/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /선박 B/ })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /미분류 C/ })).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: '엔진' }))

		expect(screen.getByRole('button', { name: /엔진 A/ })).toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /선박 B/ })).toBeNull()
		expect(screen.queryByRole('button', { name: /미분류 C/ })).toBeNull()

		// 태그를 다시 눌러 끄면 전체로 돌아온다 — 빈 선택이 곧 전체다.
		await user.click(screen.getByRole('button', { name: '엔진' }))
		expect(screen.getByRole('button', { name: /선박 B/ })).toBeInTheDocument()
	})

	it('생성 후 transform 조작이 편집 transform으로 합성되고, 생성 전에는 비활성이다', async () => {
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 5, url: '/api/generated-images/file/bg.png' }],
		})
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier="" style="width:400px;height:300px;"></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)

		selectLayerGroup('image')

		fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))

		// 생성 전 — Transform 섹션은 닫힌 채 잠긴다(내용 미노출 + 트리거 비활성).
		expect(screen.getByRole('button', { name: 'Image Transform' })).toBeDisabled()
		expect(screen.queryByRole('slider', { name: '이미지 위치' })).toBeNull()
		fireEvent.click(screen.getByRole('button', { name: 'Basic' }))

		fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '파스텔 배경' } })
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))
		await waitFor(() =>
			expect(container.innerHTML).toContain('/api/generated-images/file/bg.png'),
		)

		fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))
		// 생성 후 — 잠금이 풀리며 저장된 열림 상태(defaultOpen)로 펼쳐진다.
		expect(screen.getByRole('button', { name: 'Image Transform' })).toBeEnabled()
		const pad = screen.getByRole('slider', { name: '이미지 위치' })
		fireEvent.keyDown(pad, { key: 'ArrowRight' })
		// 패드 0.05 × (400/2) = 10px — 어드민과 같은 compose 포맷으로 prepend된다.
		await waitFor(() =>
			expect(container.innerHTML).toContain('translate(10px, 0px) scale(1) rotate(0deg)'),
		)
	})

	it('만진 배경색이 캔버스(루트 프레임) 배경으로 합성된다', () => {
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" style="width:400px;height:300px;background-color:rgb(0,40,10)"></div>',
				}}
			/>,
		)
		const canvasOf = () =>
			container.querySelector('[data-slot="studio-layout-canvas"] [data-node-id="1:1"]')

		selectLayerGroup('background')
		// 만지기 전 — 저작 배경 유지.
		expect((canvasOf() as HTMLElement).style.backgroundColor).toBe('rgb(0, 40, 10)')

		fireEvent.change(screen.getByLabelText('Background Color 색상 선택'), {
			target: { value: '#ff0000' },
		})

		expect((canvasOf() as HTMLElement).style.backgroundColor).toBe('rgb(255, 0, 0)')
	})

	it('서버가 전달한 Image Config로 배경 이미지를 생성해 캔버스에 깐다', async () => {
		const user = userEvent.setup()
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 9, url: '/api/generated-images/file/canvas.png' }],
		})
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" style="width:400px;height:300px"></div>',
				}}
			/>,
		)

		selectLayerGroup('background')
		await user.click(
			within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
				name: 'Image',
			}),
		)
		await user.click(screen.getByRole('radio', { name: 'Generate' }))
		fireEvent.change(await screen.findByLabelText('Prompt'), { target: { value: '노을 배경' } })
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		expect(mocks.requestImageGeneration).toHaveBeenCalledWith({
			prompt: '노을 배경',
			count: 1,
			profileId: 11,
			aspectRatio: '4:3', // 캔버스 400×300에서 파생
			imageSize: '2K',
		})
		await waitFor(() => {
			const canvas = container.querySelector(
				'[data-slot="studio-layout-canvas"] [data-node-id="1:1"]',
			) as HTMLElement
			expect(canvas.style.backgroundImage).toContain('/api/generated-images/file/canvas.png')
			expect(canvas.style.backgroundSize).toBe('cover')
		})
	})

	it('배경 Image Profile 변경은 새 계약의 prompt 기본값으로 세션을 초기화한다', async () => {
		const user = userEvent.setup()
		render(
			<TemplateGenerator
				imageConfigs={[
					createImageConfig(11),
					createImageConfig(7, undefined, '고정 기본값'),
				]}
				categoryTitle="카드"
				template={template}
			/>,
		)

		selectLayerGroup('background')
		await user.click(
			within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
				name: 'Image',
			}),
		)
		await user.click(screen.getByRole('radio', { name: 'Generate' }))
		fireEvent.change(await screen.findByLabelText('Prompt'), {
			target: { value: '사용자 입력' },
		})

		if (!screen.queryByRole('combobox', { name: 'Image' }))
			fireEvent.click(screen.getByRole('button', { name: '이미지 프로파일 변경' }))
		screen.getByRole('combobox', { name: 'Image' }).focus()
		await user.keyboard('{ArrowDown}')
		await user.click(screen.getByRole('option', { name: '프로파일 7' }))

		expect(screen.getByLabelText('Prompt')).toHaveValue('고정 기본값')
	})

	it('Graphic Config의 Preview adapter를 실시간 배경으로 마운트하고 타입 전환 시 정리한다', async () => {
		const user = userEvent.setup()
		const { container } = render(
			<TemplateGenerator
				categoryTitle="카드"
				// 🔴 첫 항목이 기본으로 잡힌다 — Fluted Glass가 첫 항목이면 그것으로 「바꾸기」가
				//    무변화가 되어 재마운트를 확인할 수 없다.
				graphicConfigs={[
					graphicConfigOf('forward-straight'),
					graphicConfigOf('fluted-glass'),
				]}
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" style="width:400px;height:300px;background-color:rgb(0,40,10)"></div>',
				}}
			/>,
		)
		const canvasOf = () =>
			container.querySelector(
				'[data-slot="studio-layout-canvas"] [data-node-id="1:1"]',
			) as HTMLElement

		selectLayerGroup('background')
		await user.click(
			within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
				name: 'Graphic',
			}),
		)
		await waitFor(() => expect(mocks.mountGraphicPreview).toHaveBeenCalledOnce())
		expect(mocks.mountGraphicPreview).toHaveBeenCalledWith(
			expect.objectContaining({ values: expect.any(Object), onChange: expect.any(Function) }),
		)
		expect(mocks.resizeGraphicPreview).toHaveBeenCalledWith(400, 300)
		expect(canvasOf().style.background).toBe('transparent')
		expect(container.querySelector('[data-slot="template-graphic-background"]')).not.toBeNull()

		fireEvent.click(screen.getByRole('button', { name: '그래픽 변경' }))
		screen.getByRole('combobox', { name: 'Graphic Type' }).focus()
		await user.keyboard('{ArrowDown}')
		await user.click(screen.getByRole('option', { name: 'Fluted Glass' }))
		await waitFor(() => expect(mocks.mountGraphicPreview).toHaveBeenCalledTimes(2))
		expect(mocks.destroyGraphicPreview).toHaveBeenCalledOnce()
		fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))
		fireEvent.keyDown(screen.getByRole('slider', { name: '광선 강도' }), {
			key: 'ArrowRight',
		})
		await waitFor(() =>
			expect(mocks.updateGraphicPreview).toHaveBeenLastCalledWith(
				expect.objectContaining({ rayIntensity: 0.96 }),
			),
		)
		expect(canvasOf().style.background).toBe('transparent')

		await user.click(
			within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
				name: 'Color',
			}),
		)
		await waitFor(() => expect(mocks.destroyGraphicPreview).toHaveBeenCalledTimes(2))
		fireEvent.change(screen.getByLabelText('Background Color 색상 선택'), {
			target: { value: '#ff0000' },
		})
		expect(canvasOf().style.backgroundImage).toBe('')
		expect(canvasOf().style.backgroundColor).toBe('rgb(255, 0, 0)')

		await user.click(
			within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
				name: 'Graphic',
			}),
		)
		await waitFor(() => expect(mocks.mountGraphicPreview).toHaveBeenCalledTimes(3))
		expect(canvasOf().style.background).toBe('transparent')
	})

	it('선택한 Effective 포맷으로 내보낸다', async () => {
		const user = userEvent.setup()
		render(<TemplateGenerator categoryTitle="카드" template={template} />)

		screen.getByRole('combobox', { name: 'Format' }).focus()
		await user.keyboard('{ArrowDown}')
		await user.click(screen.getByRole('option', { name: 'PDF' }))
		fireEvent.click(screen.getByRole('button', { name: '저장' }))

		expect(mocks.exportTemplate).toHaveBeenCalledWith('pdf')
	})

	it('Image Config가 없으면 pinned과 selectable 슬롯 모두 생성 불가 이유를 보여준다', async () => {
		const pinned = render(
			<TemplateGenerator
				imageConfigs={[]}
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)

		selectLayer('배경')
		expect(screen.getByText('사용 가능한 이미지 생성 프로파일이 없습니다.')).toBeInTheDocument()
		pinned.unmount()

		render(
			<TemplateGenerator
				imageConfigs={[]}
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: {} } },
				}}
			/>,
		)

		selectLayer('배경')
		expect(screen.getByText('사용 가능한 이미지 생성 프로파일이 없습니다.')).toBeInTheDocument()
	})

	it('슬롯 박스가 있으면 가장 가까운 지원 비율을 생성 요청에 싣는다', () => {
		mocks.requestImageGeneration.mockResolvedValue({ generatedImages: [] })
		render(
			<TemplateGenerator
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" style="width:911px;height:492px;"></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)

		selectLayerGroup('image')

		expect(screen.queryByRole('combobox', { name: 'Ratio' })).not.toBeInTheDocument()
		fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '파스텔 배경' } })
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		expect(mocks.requestImageGeneration).toHaveBeenCalledWith({
			prompt: '파스텔 배경',
			count: 1,
			profileId: 7,
			aspectRatio: '16:9',
			imageSize: '2K',
		})
	})

	it.each([
		'readonly',
		'disabled',
	] as const)('prompt가 %s면 수정 없이 Admin default 그대로 생성한다', async (availability) => {
		const fixedConfig = createImageConfig(7, availability, '고정 프롬프트')
		mocks.requestImageGeneration.mockResolvedValue({ generatedImages: [] })
		render(
			<TemplateGenerator
				imageConfigs={[fixedConfig]}
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
				}}
			/>,
		)

		selectLayerGroup('image')

		if (availability === 'readonly') {
			expect(screen.getByText('고정 프롬프트')).toBeInTheDocument()
		} else {
			expect(screen.getByDisplayValue('고정 프롬프트')).toBeDisabled()
		}
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		await waitFor(() =>
			expect(mocks.requestImageGeneration).toHaveBeenCalledWith({
				prompt: '고정 프롬프트',
				count: 1,
				profileId: 7,
				aspectRatio: '1:1',
				imageSize: '2K',
			}),
		)
	})

	it.each([
		'readonly',
		'disabled',
	] as const)('Background Type이 %s면 action과 generic patch로 우회할 수 없다', (availability) => {
		const base = deriveTemplateStudioConfig(template, imageConfigs, effectiveGraphicConfigs)
		const config = {
			...base,
			controller: {
				groups: base.controller.groups.map((group) => ({
					...group,
					controls: group.controls.map((control) =>
						control.id === 'background.type' ? { ...control, availability } : control,
					),
				})),
			},
		} satisfies typeof base
		render(
			<TemplateStudioProvider config={config} template={template} categoryTitle="카드">
				<BackgroundTypeMutationProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'select graphic background' }))
		fireEvent.click(screen.getByRole('button', { name: 'select invalid background' }))
		fireEvent.click(screen.getByRole('button', { name: 'patch graphic background' }))
		expect(screen.getByTestId('background-type')).toHaveTextContent('color')
	})

	it('video artifact를 내지 않는 graphic 배경에서는 Video 경로를 열지 않는다', () => {
		// forward-straight는 vector·raster만 낸다 — 배경 타입만 보고 MP4를 Video로 돌리면 던진다.
		expect(forwardStraightRuntimeManifest.artifacts).not.toHaveProperty('video')
		render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(template, imageConfigs, [
					graphicConfigOf('forward-straight'),
				])}
				template={template}
				categoryTitle="카드"
			>
				<VideoArtifactProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'select graphic background' }))
		expect(screen.getByTestId('video-artifact')).toHaveTextContent('none')
	})

	it('이미지 생성 중 Profile action·generic patch를 막고 stale 응답을 기록하지 않는다', async () => {
		const studioTemplate: PublishedHtmlTemplate = {
			...template,
			html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
			nodeConfigs: { '1:1': { imageInput: {} } },
		}
		const configs = [
			createImageConfig(11, undefined, '첫 프롬프트'),
			createImageConfig(7, undefined, '둘째 프롬프트'),
		]
		const config = deriveTemplateStudioConfig(studioTemplate, configs, effectiveGraphicConfigs)
		let resolveFirst:
			| ((value: { generatedImages: { id: number; url: string }[] }) => void)
			| null = null
		mocks.requestImageGeneration.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveFirst = resolve
			}),
		)
		const first = render(
			<TemplateStudioProvider config={config} template={studioTemplate} categoryTitle="카드">
				<TemplateWorkspace onReset={() => {}} />
				<ImageRaceProbe />
			</TemplateStudioProvider>,
		)

		selectLayerGroup('image')

		fireEvent.click(screen.getByRole('button', { name: 'start slot generation' }))
		expect(screen.getByTestId('slot-generating')).toHaveTextContent('true')
		const editing = screen.getByRole('region', { name: '선택한 레이어 편집' })
		expect(within(editing).getByRole('button', { name: '이미지 프로파일 변경' })).toBeDisabled()
		expect(within(editing).getByRole('button', { name: '완료' })).toBeDisabled()
		fireEvent.click(screen.getByRole('button', { name: 'select slot profile' }))
		fireEvent.click(screen.getByRole('button', { name: 'patch slot profile' }))
		expect(screen.getByTestId('slot-profile')).toHaveTextContent('11')
		await act(async () => {
			resolveFirst?.({ generatedImages: [{ id: 1, url: '/generated/first.png' }] })
		})
		await waitFor(() =>
			expect(screen.getByTestId('slot-image-profile')).toHaveTextContent('11'),
		)
		first.unmount()

		let resolveRace:
			| ((value: { generatedImages: { id: number; url: string }[] }) => void)
			| null = null
		mocks.requestImageGeneration.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRace = resolve
			}),
		)
		render(
			<TemplateStudioProvider config={config} template={studioTemplate} categoryTitle="카드">
				<ImageRaceProbe />
			</TemplateStudioProvider>,
		)
		fireEvent.click(screen.getByRole('button', { name: 'race slot profile' }))
		expect(screen.getByTestId('slot-profile')).toHaveTextContent('7')
		await act(async () => {
			resolveRace?.({ generatedImages: [{ id: 2, url: '/generated/stale.png' }] })
		})
		await waitFor(() =>
			expect(screen.getByTestId('slot-generating')).toHaveTextContent('false'),
		)
		expect(screen.getByTestId('slot-image-profile')).toHaveTextContent('none')
	})

	it('완료된 이미지는 Profile 변경 후 보존하되 이전 Profile 색상 feature를 합성하지 않는다', async () => {
		const user = userEvent.setup()
		mocks.requestImageGeneration.mockResolvedValue({
			generatedImages: [{ id: 5, url: '/api/generated-images/file/preserved.png' }],
		})
		const { container } = render(
			<TemplateGenerator
				imageConfigs={[createImageConfig(11), createImageConfig(7)]}
				categoryTitle="카드"
				template={{
					...template,
					html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
					nodeConfigs: { '1:1': { imageInput: {} } },
				}}
			/>,
		)

		selectLayer('배경')
		const slot = container.querySelector<HTMLElement>('[data-slot="studio-layout-workspace"]')
		expect(slot).not.toBeNull()
		if (!slot) return

		fireEvent.change(within(slot).getByLabelText('Prompt'), {
			target: { value: '컬러 이미지' },
		})
		openImageColors()
		fireEvent.change(screen.getByLabelText('Foreground 색상 선택'), {
			target: { value: '#ff0000' },
		})
		fireEvent.click(screen.getByRole('button', { name: 'Basic' }))
		fireEvent.click(within(slot).getByRole('button', { name: '이미지 생성' }))
		await waitFor(() =>
			expect(
				container.querySelector('[data-slot="studio-layout-canvas"]')?.innerHTML,
			).toContain('mask-image'),
		)

		fireEvent.click(screen.getByRole('button', { name: '이미지 프로파일 변경' }))
		if (!screen.queryByRole('combobox', { name: 'Image' }))
			fireEvent.click(screen.getByRole('button', { name: '이미지 프로파일 변경' }))
		screen.getByRole('combobox', { name: 'Image' }).focus()
		await user.keyboard('{ArrowDown}')
		await user.click(screen.getByRole('option', { name: '프로파일 7' }))
		await waitFor(() =>
			expect(
				container.querySelector('[data-slot="studio-layout-canvas"]')?.innerHTML,
			).not.toContain('mask-image'),
		)
		expect(container.innerHTML).toContain('/api/generated-images/file/preserved.png')
	})

	it('feature action과 Template override는 Definition·availability·Background runtime 잠금을 우회하지 않는다', () => {
		const editable = createImageConfig(7)
		const studioTemplate: PublishedHtmlTemplate = {
			...template,
			html: '<div data-node-id="1:1" data-figma-type="FRAME" data-name="배경" data-image-carrier=""></div>',
			nodeConfigs: { '1:1': { imageInput: { profileId: 7 } } },
		}
		const first = render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(studioTemplate, [editable])}
				template={studioTemplate}
				categoryTitle="카드"
			>
				<FeatureMutationProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'invalid image feature' }))
		expect(screen.getByTestId('image-line')).toHaveTextContent('#000000')
		fireEvent.click(screen.getByRole('button', { name: 'valid image feature' }))
		expect(screen.getByTestId('image-line')).toHaveTextContent('#00ff00')
		fireEvent.click(screen.getByRole('button', { name: 'background feature' }))
		expect(screen.getByTestId('background-line')).toHaveTextContent('#000000')
		first.unmount()

		const readonlyConfig: ImageStudioConfig = {
			...editable,
			controller: {
				groups: editable.controller.groups.map((group) => ({
					...group,
					controls: group.controls.map((control) =>
						control.id === 'lineColor'
							? { ...control, availability: 'readonly' as const }
							: control,
					),
				})),
			},
		}
		const overrideTemplate: PublishedHtmlTemplate = {
			...studioTemplate,
			nodeConfigs: {
				'1:1': {
					imageInput: { profileId: 7 },
					imageColorize: { line: '#ff0000' },
				},
			},
		}
		render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(overrideTemplate, [readonlyConfig])}
				template={overrideTemplate}
				categoryTitle="카드"
			>
				<FeatureMutationProbe />
			</TemplateStudioProvider>,
		)
		expect(screen.getByTestId('image-line')).toHaveTextContent('#000000')
		fireEvent.click(screen.getByRole('button', { name: 'valid image feature' }))
		expect(screen.getByTestId('image-line')).toHaveTextContent('#000000')
	})

	it('Graphic update는 Definition availability를 지키고 Config 변경 시 기본값으로 초기화한다', () => {
		const readonlyGraphic: GraphicStudioConfig = {
			...forwardStraightRuntimeManifest,
			output: resolveGraphicStudioOutput(forwardStraightRuntimeManifest),
			controller: {
				groups: forwardStraightRuntimeManifest.controller.groups.map((group) => ({
					...group,
					controls: group.controls.map((control) =>
						control.id === 'perspectiveGamma'
							? { ...control, availability: 'readonly' as const }
							: control,
					),
				})),
			},
		}
		const first = render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(template, imageConfigs, [readonlyGraphic])}
				template={template}
				categoryTitle="카드"
			>
				<GraphicMutationProbe />
			</TemplateStudioProvider>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'update graphic' }))
		expect(screen.getByTestId('graphic-perspective')).toHaveTextContent('1')
		fireEvent.click(screen.getByRole('button', { name: 'invalid graphic' }))
		expect(screen.getByTestId('graphic-perspective')).toHaveTextContent('1')
		first.unmount()

		const secondary = {
			...graphicConfigOf('forward-straight'),
			id: 'secondary',
			name: 'Secondary',
		} satisfies GraphicStudioConfig
		render(
			<TemplateStudioProvider
				config={deriveTemplateStudioConfig(template, imageConfigs, [
					graphicConfigOf('forward-straight'),
					secondary,
				])}
				template={template}
				categoryTitle="카드"
			>
				<GraphicMutationProbe />
			</TemplateStudioProvider>,
		)
		fireEvent.click(screen.getByRole('button', { name: 'update graphic' }))
		expect(screen.getByTestId('graphic-perspective')).toHaveTextContent('2.5')
		fireEvent.click(screen.getByRole('button', { name: 'select secondary graphic' }))
		expect(screen.getByTestId('graphic-config')).toHaveTextContent('secondary')
		expect(screen.getByTestId('graphic-perspective')).toHaveTextContent('1')
	})
})

function createImageConfig(
	id: number,
	promptAvailability?: 'enabled' | 'readonly' | 'disabled',
	promptDefault = '',
): ImageStudioConfig {
	const ratios = ['1:1', '4:3', '16:9'] as const
	return {
		studio: 'image',
		artifacts: { raster: {}, original: {} },
		id,
		version: 1,
		name: id === 11 ? '기본 프로파일' : `프로파일 ${id}`,
		output: { formats: ['png'], original: true },
		controller: {
			groups: [
				{
					id: 'image',
					title: 'Image',
					controls: [
						{
							id: 'prompt',
							kind: 'text',
							label: 'Prompt',
							defaultValue: promptDefault,
							...(promptAvailability ? { availability: promptAvailability } : {}),
							multiline: true,
							maxLength: 250,
							placeholder: '이미지를 설명하세요',
						},
					],
				},
				{
					id: 'profile-settings',
					title: 'Profile Settings',
					controls: [
						{
							id: 'lineColor',
							kind: 'color',
							label: 'Line Color',
							defaultValue: '#000000',
						},
						{
							id: 'backgroundColor',
							kind: 'color',
							label: 'Background Color',
							defaultValue: '#ffffff',
						},
					],
				},
				{
					id: 'generation-settings',
					title: 'Setting',
					controls: [
						{
							id: 'batch',
							kind: 'select',
							label: '장수',
							defaultValue: '1',
							options: [{ value: '1', label: '1' }],
						},
						{
							id: 'ratio',
							kind: 'select',
							label: '비율',
							defaultValue: '1:1',
							options: ratios.map((value) => ({ value, label: value })),
						},
						{
							id: 'resolution',
							kind: 'select',
							label: '해상도',
							defaultValue: '2K',
							options: [{ value: '2K', label: '2K' }],
						},
					],
				},
			],
		},
		image: {
			slug: `profile-${id}`,
			features: [
				{
					type: 'color-adjustment',
					controls: { line: 'lineColor', background: 'backgroundColor' },
				},
				{
					type: 'camera-control',
					azimuths: CAMERA_AZIMUTHS,
					elevations: CAMERA_ELEVATIONS,
				},
			],
		},
	}
}

function render(ui: Parameters<typeof rtlRender>[0]) {
	return rtlRender(ui, { wrapper: TooltipProvider })
}
