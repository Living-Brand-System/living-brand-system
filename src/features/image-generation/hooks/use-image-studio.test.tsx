import {
	act,
	cleanup,
	fireEvent,
	render,
	renderHook,
	screen,
	waitFor,
} from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import {
	deriveImageStudioConfig,
	IMAGE_STUDIO_CONTROL_IDS,
	type ImageStudioConfig,
} from '@/features/image-generation/domain/image-studio-config'
import { ImageStudioProvider } from '@/features/image-generation/providers/image-studio-provider'
import { createImageArtifacts } from '@/features/image-generation/runtime/image-artifact.client'
import { useImageExport } from '@/features/studio-export/hooks/use-image-export'
import type {
	ControllerAvailability,
	ControllerControlDefinition,
} from '@/modules/studio-controller/controller-definition'
import { useImageStudio } from './use-image-studio'

const conversionMock = vi.hoisted(() => vi.fn())
vi.mock('../runtime/reference-image/prepare-reference-image.client', () => ({
	prepareReferenceImage: conversionMock,
}))

const browseMocks = vi.hoisted(() => ({
	fetchImageStudioConfigs: vi.fn(async () => [] as unknown[]),
}))
vi.mock('@/features/image-generation/services/list-image-studio-configs.client', () => browseMocks)

const exportImageMocks = vi.hoisted(() => ({
	artifacts: vi.fn((source: { images: readonly string[]; color: unknown }) => ({
		raster: source.images.map(() => ({ kind: 'raster', source: { withSurface: vi.fn() } })),
		original: source.images.map(() => ({
			kind: 'original',
			source: { load: vi.fn(), extension: vi.fn(), mimeType: vi.fn() },
		})),
	})),
	original: vi.fn().mockResolvedValue({
		data: new Blob(),
		filename: 'hd-image-1.png',
		mimeType: 'image/png',
	}),
	png: vi.fn().mockResolvedValue({
		data: new Blob(),
		filename: 'hd-image-1.png',
		mimeType: 'image/png',
	}),
	jpeg: vi.fn().mockResolvedValue({
		data: new Blob(),
		filename: 'hd-image-1.jpg',
		mimeType: 'image/jpeg',
	}),
	execute: vi.fn().mockResolvedValue({
		data: new Blob(),
		filename: 'hd-image-1.png',
		mimeType: 'image/png',
	}),
}))

vi.mock('@/features/image-generation/runtime/image-artifact.client', () => ({
	createImageArtifacts: exportImageMocks.artifacts,
}))
vi.mock('@/features/studio-export/services/export-artifact.client', () => ({
	executeArtifactExport: exportImageMocks.execute,
	exportOriginalArtifact: exportImageMocks.original,
	exportRasterArtifactAsPng: exportImageMocks.png,
	exportRasterArtifactAsJpeg: exportImageMocks.jpeg,
}))
vi.mock('@/features/studio-export/adapters/download-export-result.client', () => ({
	downloadExportResult: vi.fn(),
}))

// 세션은 테스트마다 갈아끼운다 — 카메라 seed가 참조 유무에 따라 다른 경로로 파생되기 때문이다.
const generationMocks = vi.hoisted(() => ({ session: null as unknown }))

/** 프로파일을 교체해도 남아야 하는 사용자 산출물 — 참조 없이 프롬프트로 바로 나온 세션. */
const SESSION = {
	images: [{ src: 'blob:1', generatedImageId: 8, profileId: 5 }],
	reference: null,
	output: { aspectRatio: '2:3', imageSize: '1K' },
}

vi.mock('@/features/image-generation/hooks/use-image-generation', () => ({
	useImageGeneration: () => ({
		error: null,
		generate: vi.fn(),
		loading: false,
		requested: 4,
		selected: 0,
		session: generationMocks.session,
		setSelected: vi.fn(),
	}),
}))

function config(
	profileId: number,
	options: {
		batch?: number[]
		ratio?: ImageAspectRatio[]
		resolution?: ImageOutputSize[]
		colorAdjustment?: { line: string; background?: string }
		maxPromptLength?: number
		promptAvailability?: ControllerAvailability
		promptDefault?: string
		ratioAvailability?: ControllerAvailability
	} = {},
): ImageStudioConfig {
	const base = deriveImageStudioConfig({
		id: profileId,
		name: `프로파일 ${profileId}`,
		slug: null,
		imageModelPreset: 'openai-gpt-image-2',
		features: [
			...(options.colorAdjustment
				? [
						{
							blockType: 'colorAdjustment',
							background: Boolean(options.colorAdjustment.background),
						},
					]
				: []),
			{ blockType: 'cameraControl' },
		],
	})
	const batch = (options.batch ?? [1, 2, 3, 4]).map(String)
	const ratio = options.ratio ?? ['2:3', '16:9']
	const resolution = options.resolution ?? ['1K', '2K']

	return {
		...base,
		controller: {
			groups: base.controller.groups.map((group) => ({
				...group,
				controls: group.controls.map((control) =>
					configureControl(control, {
						...options,
						batch,
						ratio,
						resolution,
					}),
				),
			})),
		},
	}
}

/** 딥링크를 갖는 프로파일 — 기본 픽스처는 slug가 null이다. */
function withSlug(base: ImageStudioConfig, slug: string): ImageStudioConfig {
	return { ...base, image: { ...base.image, slug } }
}

function configureControl(
	control: ControllerControlDefinition,
	options: {
		batch: string[]
		ratio: ImageAspectRatio[]
		resolution: ImageOutputSize[]
		colorAdjustment?: { line: string; background?: string }
		maxPromptLength?: number
		promptAvailability?: ControllerAvailability
		promptDefault?: string
		ratioAvailability?: ControllerAvailability
	},
): ControllerControlDefinition {
	// 어드민은 색 기본값을 정하지 않지만, Provider는 계약이 준 기본값을 그대로 따라야 한다.
	if (control.kind === 'color') {
		const defaultValue =
			control.id === IMAGE_STUDIO_CONTROL_IDS.lineColor
				? options.colorAdjustment?.line
				: options.colorAdjustment?.background
		return { ...control, defaultValue: defaultValue ?? control.defaultValue }
	}
	if (control.id === IMAGE_STUDIO_CONTROL_IDS.prompt && control.kind === 'text') {
		return {
			...control,
			defaultValue: options.promptDefault ?? control.defaultValue,
			maxLength: options.maxPromptLength ?? control.maxLength,
			availability: options.promptAvailability,
		}
	}
	if (control.kind !== 'select') return control
	const values =
		control.id === IMAGE_STUDIO_CONTROL_IDS.batch
			? options.batch
			: control.id === IMAGE_STUDIO_CONTROL_IDS.ratio
				? options.ratio
				: options.resolution
	return {
		...control,
		defaultValue: values[0] ?? null,
		options: values.map((value) => ({ label: value, value })),
		...(control.id === IMAGE_STUDIO_CONTROL_IDS.ratio
			? { availability: options.ratioAvailability }
			: {}),
	}
}

function Probe() {
	const {
		config: current,
		controls,
		prompt,
		generation,
		color,
		camera,
		results,
		profiles,
	} = useImageStudio()
	// 자산 브라우저를 여는 대신 Probe가 목록을 연다 — 교체 후보가 있어야 select가 성립한다.
	const { load } = profiles.browse
	useEffect(() => {
		load()
	}, [load])
	const items = results.items
	const resultConfig = profiles.options.find((candidate) => candidate.id === items[0]?.profileId)
	const download = useImageExport({
		artifacts:
			items.length > 0
				? createImageArtifacts({
						images: items.map((item) => item.src),
						color: results.color,
					})
				: null,
		capability: resultConfig?.output ?? { formats: [], original: false },
		selected: results.selected,
		size: { width: 832, height: 1248 },
	})
	return (
		<div>
			<output data-testid="browse">{`browse:${profiles.browse.status}`}</output>
			<output data-testid="state">
				{current.name} / {generation.batch} / {generation.ratio} / {generation.resolution} /{' '}
				{prompt.value} / {results.items.length > 0 ? '결과 있음' : '결과 없음'}
			</output>
			<output data-testid="prompt-error">
				{controls.bindings.prompt?.error ?? '오류 없음'} /{' '}
				{generation.canRun ? '생성 가능' : '생성 불가'}
			</output>
			<output data-testid="color">
				{color.value
					? `${color.value.line}|${color.value.background ?? '없음'}`
					: '색 없음'}
			</output>
			<output data-testid="camera-seed">{camera.seedImage ?? '대상 없음'}</output>
			<output data-testid="result-color">
				{results.color ? results.color.line : '결과 색 없음'}
			</output>
			<output data-testid="download-format">{download.format ?? '형식 없음'}</output>
			<output data-testid="download-actions">
				{download.selected.canExport ? 'selected:on' : 'selected:off'} /{' '}
				{download.all.canExport ? 'all:on' : 'all:off'} /{' '}
				{download.original.selected.canExport
					? 'original-selected:on'
					: 'original-selected:off'}
				{' / '}
				{download.original.all.canExport ? 'original-all:on' : 'original-all:off'}
			</output>
			<button type="button" onClick={() => color.update({ line: '#ff0000' })}>
				라인 색 변경
			</button>
			<button type="button" onClick={() => prompt.setValue('드론')}>
				프롬프트 입력
			</button>
			<button type="button" onClick={() => generation.setBatch(4)}>
				4장 선택
			</button>
			<button type="button" onClick={() => generation.setRatio('16:9')}>
				16:9 선택
			</button>
			<button type="button" onClick={() => generation.setResolution('2K')}>
				2K 선택
			</button>
			<button type="button" onClick={() => profiles.select(7)}>
				교체
			</button>
			<button type="button" onClick={download.selected.run}>
				결과 저장
			</button>
			<button type="button" onClick={download.original.selected.run}>
				원본 저장
			</button>
			<button type="button" onClick={() => download.setFormat('jpeg')}>
				JPEG 선택
			</button>
		</div>
	)
}

async function renderStudio(configs: ImageStudioConfig[]) {
	// 페이지는 시작 계약 하나만 싣고 교체 후보는 자산 브라우저가 열릴 때 온다 — Probe가 그 열림을 대신한다.
	browseMocks.fetchImageStudioConfigs.mockResolvedValue(configs)
	const view = render(
		<ImageStudioProvider config={configs[0] as ImageStudioConfig}>
			<Probe />
		</ImageStudioProvider>,
	)
	await screen.findByText('browse:ready')
	return view
}

function chooseAll() {
	fireEvent.click(screen.getByRole('button', { name: '프롬프트 입력' }))
	fireEvent.click(screen.getByRole('button', { name: '4장 선택' }))
	fireEvent.click(screen.getByRole('button', { name: '16:9 선택' }))
	fireEvent.click(screen.getByRole('button', { name: '2K 선택' }))
	fireEvent.click(screen.getByRole('button', { name: '교체' }))
}

describe('ImageStudioProvider 프로파일 교체 정책', () => {
	beforeEach(() => {
		generationMocks.session = SESSION
	})
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	it('프로파일 교체는 편집값을 초기화하고 기존 생성 결과는 보존한다', async () => {
		await renderStudio([config(5), config(7)])

		chooseAll()

		expect(screen.getByTestId('state')).toHaveTextContent(
			'프로파일 7 / 1 / 2:3 / 1K / / 결과 있음',
		)
	})

	it('새 프로파일의 select 기본값을 적용한다', async () => {
		await renderStudio([
			config(5),
			config(7, { batch: [1, 2], ratio: ['2:3'], resolution: ['1K'] }),
		])

		chooseAll()

		expect(screen.getByTestId('state')).toHaveTextContent(
			'프로파일 7 / 1 / 2:3 / 1K / / 결과 있음',
		)
	})

	it('readonly select와 prompt는 새 계약 기본값으로 되돌린다', async () => {
		await renderStudio([
			config(5),
			config(7, {
				promptAvailability: 'readonly',
				promptDefault: '고정 프롬프트',
				ratioAvailability: 'readonly',
			}),
		])

		chooseAll()

		expect(screen.getByTestId('state')).toHaveTextContent(
			'프로파일 7 / 1 / 2:3 / 1K / 고정 프롬프트 / 결과 있음',
		)
	})

	it('색은 새 프로파일 기본값으로 되돌린다', async () => {
		await renderStudio([
			config(5, { colorAdjustment: { line: '#000dff', background: '#00ffd4' } }),
			config(7, { colorAdjustment: { line: '#112233' } }),
		])

		fireEvent.click(screen.getByRole('button', { name: '라인 색 변경' }))
		expect(screen.getByTestId('color')).toHaveTextContent('#ff0000|#00ffd4')
		fireEvent.click(screen.getByRole('button', { name: '교체' }))

		expect(screen.getByTestId('color')).toHaveTextContent('#112233|없음')
	})

	it('color control이 있어도 feature가 없으면 색 조정을 적용하지 않는다', async () => {
		const withColorControls = config(5, {
			colorAdjustment: { line: '#000dff', background: '#00ffd4' },
		})
		await renderStudio([
			{
				...withColorControls,
				image: { ...withColorControls.image, features: [] },
			},
		])

		expect(screen.getByTestId('color')).toHaveTextContent('색 없음')
		fireEvent.click(screen.getByRole('button', { name: '라인 색 변경' }))
		expect(screen.getByTestId('color')).toHaveTextContent('색 없음')
	})

	it('프로파일을 교체하면 주소가 그 프로파일의 딥링크가 된다', async () => {
		window.history.replaceState(null, '', '/studio/image/five')
		await renderStudio([withSlug(config(5), 'five'), withSlug(config(7), 'seven')])

		fireEvent.click(screen.getByRole('button', { name: '교체' }))

		expect(window.location.pathname).toBe('/studio/image/seven')
	})

	it('slug 없는 프로파일로 교체하면 주소를 건드리지 않는다', async () => {
		window.history.replaceState(null, '', '/studio/image/five')
		await renderStudio([withSlug(config(5), 'five'), config(7)])

		fireEvent.click(screen.getByRole('button', { name: '교체' }))

		expect(window.location.pathname).toBe('/studio/image/five')
	})

	it('프로파일 교체 후 이전 결과는 보존하되 camera seed로 열지 않는다', async () => {
		await renderStudio([config(5), config(7)])
		expect(screen.getByTestId('camera-seed')).toHaveTextContent('blob:1')

		fireEvent.click(screen.getByRole('button', { name: '교체' }))

		expect(screen.getByTestId('state')).toHaveTextContent('결과 있음')
		expect(screen.getByTestId('camera-seed')).toHaveTextContent('대상 없음')
	})

	// 고정된 참조도 프로파일 게이트를 지나야 한다 — 서버가 시드를 scenario로 조회하므로
	// 옛 프로파일의 참조를 문 채 열려 있으면 재생성 버튼이 언제나 실패한다.
	it('참조가 남은 세션도 프로파일 교체 후에는 camera seed로 열지 않는다', async () => {
		generationMocks.session = {
			images: [{ src: 'blob:2', generatedImageId: 9, profileId: 5 }],
			reference: { src: 'blob:1', generatedImageId: 8, profileId: 5 },
			output: { aspectRatio: '2:3', imageSize: '1K' },
		}
		await renderStudio([config(5), config(7)])
		expect(screen.getByTestId('camera-seed')).toHaveTextContent('blob:1')

		fireEvent.click(screen.getByRole('button', { name: '교체' }))

		expect(screen.getByTestId('camera-seed')).toHaveTextContent('대상 없음')
	})

	it('이전 결과에 새 프로파일의 색·출력 capability를 소급하지 않는다', async () => {
		const source = config(5, { colorAdjustment: { line: '#000dff' } })
		const next = {
			...config(7, { colorAdjustment: { line: '#ff0000' } }),
			output: { formats: [] as const, original: false },
		}
		await renderStudio([source, next])

		expect(screen.getByTestId('result-color')).toHaveTextContent('#000dff')
		fireEvent.click(screen.getByRole('button', { name: '교체' }))
		expect(screen.getByTestId('result-color')).toHaveTextContent('결과 색 없음')
		fireEvent.click(screen.getByRole('button', { name: '원본 저장' }))

		await waitFor(() => expect(exportImageMocks.execute).toHaveBeenCalledOnce())
		expect(exportImageMocks.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				artifact: expect.objectContaining({ kind: 'original' }),
				request: expect.objectContaining({ artifact: 'original' }),
			}),
		)
	})

	it('패키지 capability가 없으면 선택 저장만 열고 전체 저장은 잠근다', async () => {
		const source = config(5)
		await renderStudio([{ ...source, output: { ...source.output, packages: [] } }])

		expect(screen.getByTestId('download-actions')).toHaveTextContent(
			'selected:on / all:off / original-selected:on / original-all:off',
		)
	})

	it('사용자가 선택한 JPEG 형식을 ExportRequest로 전달한다', async () => {
		await renderStudio([config(5)])
		fireEvent.click(screen.getByRole('button', { name: 'JPEG 선택' }))
		fireEvent.click(screen.getByRole('button', { name: '결과 저장' }))

		await waitFor(() => expect(exportImageMocks.execute).toHaveBeenCalledOnce())
		expect(exportImageMocks.execute).toHaveBeenCalledWith(
			expect.objectContaining({
				fileName: 'hd-image-1',
				artifact: expect.objectContaining({ kind: 'raster' }),
				request: {
					artifact: 'raster',
					format: 'jpeg',
					colorProfile: { space: 'rgb', icc: 'srgb' },
					options: { quality: 90, scale: 1 },
					scope: 'selected',
				},
			}),
		)
		expect(exportImageMocks.artifacts).toHaveBeenCalledWith({
			images: ['blob:1'],
			color: null,
		})
	})

	it('교체 후 새 maxLength를 넘는 입력은 오류로 생성만 막는다', async () => {
		await renderStudio([config(5), config(7, { maxPromptLength: 1 })])

		fireEvent.click(screen.getByRole('button', { name: '프롬프트 입력' }))
		fireEvent.click(screen.getByRole('button', { name: '교체' }))

		expect(screen.getByTestId('state')).not.toHaveTextContent('드론')
		fireEvent.click(screen.getByRole('button', { name: '프롬프트 입력' }))
		expect(screen.getByTestId('state')).toHaveTextContent('/ 드론 / 결과 있음')
		expect(screen.getByTestId('prompt-error')).toHaveTextContent(
			'프롬프트가 최대 1자를 초과했습니다. / 생성 불가',
		)
	})
})

it('첨부 변환 중 생성을 막고 재선택·삭제 후 이전 결과를 버린다', async () => {
	const profile = deriveImageStudioConfig({
		id: 5,
		name: '참조',
		slug: null,
		imageModelPreset: 'openai-gpt-image-2',
		features: [{ blockType: 'referenceImage' }],
	})
	const pending: Array<(blob: Blob) => void> = []
	conversionMock.mockImplementation(() => new Promise<Blob>((resolve) => pending.push(resolve)))
	const { result, unmount } = renderHook(() => useImageStudio(), {
		wrapper: ({ children }) => (
			<ImageStudioProvider config={profile}>{children}</ImageStudioProvider>
		),
	})
	act(() => {
		result.current.prompt.setValue('제품')
		result.current.reference.attach(new File(['a'], 'a.png', { type: 'image/png' }))
	})
	expect(result.current.reference.preparing).toBe(true)
	expect(result.current.generation.canRun).toBe(false)
	act(() => result.current.reference.setEnabled(false))
	expect(result.current.generation.canRun).toBe(true)
	act(() => result.current.reference.setEnabled(true))
	expect(result.current.generation.canRun).toBe(false)
	act(() => {
		void result.current.reference.attach(new File(['b'], 'b.png', { type: 'image/png' }))
	})
	expect(conversionMock.mock.calls[0]?.[1].aborted).toBe(true)
	await act(async () => pending[1]?.(new Blob(['converted'], { type: 'image/webp' })))
	await waitFor(() => expect(result.current.reference.name).toBe('b.png'))
	expect(result.current.reference.value).toBe('data:image/webp;base64,Y29udmVydGVk')
	expect(result.current.generation.canRun).toBe(true)
	act(() => result.current.reference.clear())
	await act(async () => pending[0]?.(new Blob(['old'], { type: 'image/webp' })))
	expect(result.current.reference.value).toBeNull()
	await act(async () => {
		result.current.reference.attach(new File(['bad'], 'bad.txt', { type: 'text/plain' }))
	})
	expect(result.current.reference.error).not.toBeNull()
	expect(result.current.generation.canRun).toBe(false)
	act(() => result.current.reference.setEnabled(false))
	expect(result.current.generation.canRun).toBe(true)
	act(() => result.current.reference.setEnabled(true))
	expect(result.current.generation.canRun).toBe(false)
	unmount()
})
