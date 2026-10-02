import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { resolveGraphicStudioOutput } from '@/features/graphic-generation/domain/graphic-studio-manifest'
import manifest from '@/features/graphic-generation/graphic-runtimes/key-visual-pattern/definition'
import { deriveImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import {
	deriveTemplateStudioConfig,
	type PublishedHtmlTemplate,
} from '@/features/template-customization/domain/template-studio-config'
import { TemplateGenerator } from './template-generator'

const mocks = vi.hoisted(() => ({
	export: vi.fn(),
	generate: vi.fn(),
	graphicUpdate: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/features/template-core/services/template-editor-options.client', async (original) => ({
	...(await original<object>()),
	requestPublishedBrandColors: async () => [{ hex: '#007332' }, { hex: '#ffffff' }],
}))
vi.mock('@/features/image-generation/services/generate-image.client', () => ({
	requestImageGeneration: mocks.generate,
}))
vi.mock('@/features/graphic-generation/runtime/client/graphic-runtime.client', () => ({
	loadGraphicRuntimeAdapter: async () => ({
		mount: async () => ({
			update: mocks.graphicUpdate,
			resize: vi.fn(),
			destroy: vi.fn(),
			artifacts: { raster: { source: { withSurface: vi.fn() } } },
		}),
	}),
}))
vi.mock('@/features/studio-export/hooks/use-export', () => ({
	useExport: () => ({ canExport: () => true, exporting: null, error: null, run: mocks.export }),
}))

function studio(id = 1, overrides: Partial<PublishedHtmlTemplate> = {}) {
	const template: PublishedHtmlTemplate = {
		kind: 'html',
		id,
		name: `포스터 ${id}`,
		html: '<div><p data-node-id="title" data-figma-type="TEXT">원본 제목</p></div>',
		nodeConfigs: { title: { input: { label: '제목', maxLength: 20, maxLines: 1 } } },
		width: 800,
		height: 600,
		templateVersion: '2026-09-29T00:00:00.000Z',
		exportPolicy: { allowedFormats: ['png', 'jpeg'] },
		...overrides,
	}
	return {
		config: deriveTemplateStudioConfig(template, [], []),
		template,
		highlightColor: '#007332',
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
})
afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

/** 실제 `/studio/template/[slug]` 라우트처럼 발행 상세 하나로 편집기를 연다. */
function renderTemplate(data: ReturnType<typeof studio> = studio()) {
	return render(
		<TemplateGenerator
			config={data.config}
			template={data.template}
			highlightColor={data.highlightColor}
			categoryTitle="포스터"
		/>,
		{ wrapper: TooltipProvider },
	)
}

it('실제 합성 캔버스·출력에 연결하고 Reset은 텍스트·색·출력 설정을 초기화한다', async () => {
	const { container } = renderTemplate()
	const input = await screen.findByRole('textbox', { name: '제목' })
	expect(input).toHaveAttribute('maxlength', '20')
	fireEvent.change(input, { target: { value: '바꾼 제목' } })
	fireEvent.click(await screen.findByRole('radio', { name: '텍스트 색상 #007332' }))
	const preview = container.querySelector('[data-slot="template-preview"]')
	expect(preview).toHaveTextContent('바꾼 제목')
	expect(preview?.querySelector('[data-node-id="title"]')).toHaveStyle({ color: '#007332' })
	fireEvent.click(screen.getByRole('button', { name: '저장' }))
	await waitFor(() =>
		expect(mocks.export).toHaveBeenCalledWith(expect.objectContaining({ format: 'png' })),
	)
	const format = screen.getByRole('combobox', { name: 'Format' })
	fireEvent.keyDown(format, { key: 'ArrowDown' })
	fireEvent.click(await screen.findByRole('option', { name: /^JPEG$/ }))
	expect(format).toHaveTextContent('JPEG')
	fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
	expect(await screen.findByRole('textbox', { name: '제목' })).toHaveValue('원본 제목')
	expect(screen.getByRole('radio', { name: '텍스트 색상 #007332' })).not.toBeChecked()
	expect(screen.getByRole('combobox', { name: 'Format' })).toHaveTextContent('PNG')
})

it('네 가지 묶음만 표시하고 눈 아이콘은 허용된 텍스트들을 함께 숨기고 복원한다', async () => {
	const { container } = renderTemplate(
		studio(1, {
			html: '<div><p data-node-id="title">제목 원본</p><p data-node-id="subtitle">부제 원본</p><p data-node-id="fixed">고정 문구</p></div>',
			nodeConfigs: {
				title: {
					input: { label: '제목', placeholder: '서포트 설명', maxLines: 1 },
					creator: { access: 'editable', visibility: { allowToggle: true } },
				},
				subtitle: {
					input: { label: '부제', maxLines: 1 },
					creator: { access: 'editable', visibility: { allowToggle: true } },
				},
				fixed: { input: { label: '고정' }, creator: { access: 'readonly' } },
			},
		}),
	)
	await screen.findByRole('textbox', { name: '제목' })
	const panel = screen.getByRole('region', { name: 'Layers' })
	expect(panel.querySelectorAll('[data-slot="template-layer-group"]')).toHaveLength(4)
	expect(within(panel).getByRole('button', { name: /^Text$/ })).toHaveAttribute(
		'aria-pressed',
		'true',
	)
	expect(within(panel).getByRole('button', { name: /^Image$/ })).toBeDisabled()
	expect(within(panel).getByRole('button', { name: /^Symbol$/ })).toBeDisabled()
	expect(within(panel).getByRole('button', { name: 'Background 숨김' })).toBeDisabled()
	expect(screen.queryByText('서포트 설명')).not.toBeInTheDocument()
	expect(screen.queryByRole('group', { name: '제목 표시' })).not.toBeInTheDocument()
	const preview = container.querySelector('[data-slot="template-preview"]')
	fireEvent.click(within(panel).getByRole('button', { name: 'Text 숨김' }))
	expect(preview?.querySelector('[data-node-id="title"]')).not.toBeVisible()
	expect(preview?.querySelector('[data-node-id="subtitle"]')).not.toBeVisible()
	expect(preview?.querySelector('[data-node-id="fixed"]')).toBeVisible()
	fireEvent.click(within(panel).getByRole('button', { name: 'Text 표시' }))
	expect(preview?.querySelector('[data-node-id="title"]')).toBeVisible()
	expect(preview?.querySelector('[data-node-id="subtitle"]')).toBeVisible()
	fireEvent.click(within(panel).getByRole('button', { name: /^Background$/ }))
	expect(screen.queryByRole('textbox', { name: '제목' })).not.toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: '완료' }))
	fireEvent.click(within(panel).getByRole('button', { name: /^Text$/ }))
	expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('제목 원본')
	expect(screen.getByRole('textbox', { name: '부제' })).toHaveValue('부제 원본')
})

it('Image 편집은 현재 슬롯만 열고 완료 또는 취소 전에는 다른 레이어를 잠근다', async () => {
	renderTemplate(
		studio(1, {
			html: '<div><div data-node-id="a" data-figma-type="FRAME" data-name="사진 A" data-image-carrier=""></div><div data-node-id="b" data-figma-type="FRAME" data-name="사진 B" data-image-carrier=""></div></div>',
			nodeConfigs: { a: { imageInput: {} }, b: { imageInput: {} } },
		}),
	)
	const panel = await screen.findByRole('region', { name: 'Layers' })
	fireEvent.click(within(panel).getByRole('button', { name: /^Image$/ }))
	const editing = screen.getByRole('region', { name: '선택한 레이어 편집' })
	expect(within(editing).getAllByRole('radiogroup', { name: '슬롯 이미지 방식' })).toHaveLength(1)
	expect(within(editing).getByRole('group', { name: '사진 A' })).toBeInTheDocument()
	expect(within(editing).queryByRole('group', { name: '사진 B' })).not.toBeInTheDocument()
	expect(within(panel).getByRole('button', { name: /^Background$/ })).toBeDisabled()
	fireEvent.click(screen.getByRole('button', { name: '취소' }))
	// 편집 패널은 퇴장 모션이 끝난 뒤 사라진다.
	await waitFor(() =>
		expect(
			screen.queryByRole('region', { name: '선택한 레이어 편집' }),
		).not.toBeInTheDocument(),
	)
	expect(within(panel).getByRole('button', { name: /^Background$/ })).toBeEnabled()
})

it('편집을 마치면 빈 선택 없이 마스터 레이어(Text)로 돌아간다', async () => {
	renderTemplate(
		studio(1, {
			html: '<div><p data-node-id="t" data-figma-type="TEXT" data-name="제목">제목</p><div data-node-id="a" data-figma-type="FRAME" data-name="사진 A" data-image-carrier=""></div></div>',
			nodeConfigs: { t: { input: { label: '제목' } }, a: { imageInput: {} } },
		}),
	)
	const panel = await screen.findByRole('region', { name: 'Layers' })
	const text = within(panel).getByRole('button', { name: /^Text$/ })
	expect(text).toHaveAttribute('aria-pressed', 'true')
	for (const action of ['취소', '완료']) {
		fireEvent.click(within(panel).getByRole('button', { name: /^Image$/ }))
		fireEvent.click(screen.getByRole('button', { name: action }))
		await waitFor(() =>
			expect(within(panel).getByRole('button', { name: /^Text$/ })).toHaveAttribute(
				'aria-pressed',
				'true',
			),
		)
		expect(screen.queryByText('왼쪽에서 레이어를 선택해 주세요')).toBeNull()
	}
})

it('배경은 패널 컴포지션으로 선다 — 방식을 바꿔도 Dimming 카드는 그대로, 조건 행만 펼친다', async () => {
	renderTemplate()
	await screen.findByRole('textbox', { name: '제목' })
	const layers = screen.getByRole('region', { name: 'Layers' })
	fireEvent.click(within(layers).getByRole('button', { name: /^Background$/ }))
	const selection = screen.getByRole('region', { name: '선택한 레이어 편집' })
	const editing = () => screen.getByRole('complementary', { name: '편집 도구' })
	const fixed = () => editing().querySelector('[data-slot="studio-control-fixed"]')
	// overlay → 고정 카드. Use를 켜야 Strength가 선다.
	const dimming = fixed()
	expect(
		within(dimming as HTMLElement).getByRole('radiogroup', { name: 'Use' }),
	).toBeInTheDocument()
	expect(within(editing()).queryByRole('slider', { name: 'Strength' })).toBeNull()
	fireEvent.click(
		within(within(editing()).getByRole('radiogroup', { name: 'Use' })).getByRole('radio', {
			name: 'On',
		}),
	)
	expect(await within(editing()).findByRole('slider', { name: 'Strength' })).toBeInTheDocument()
	// source → 왼쪽 설정 카드. Image일 때만 Image Mode 행이 선다.
	expect(within(selection).queryByRole('radiogroup', { name: 'Image Mode' })).toBeNull()
	fireEvent.click(
		within(within(selection).getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
			name: 'Image',
		}),
	)
	expect(within(selection).getByRole('radiogroup', { name: 'Image Mode' })).toBeInTheDocument()
	// 방식마다 화면 분기가 달라 패널은 다시 마운트되지만, 고정 영역의 구조가 같으니 들어오는 모션을
	// 재생하지 않는다 — 숨김 상태(오른쪽 16px·투명)에서 시작하지 않고 제자리다.
	const region = fixed()?.parentElement as HTMLElement
	expect(region).toHaveAttribute('data-slot', 'panel-render')
	expect(region.style.opacity).not.toBe('0')
	expect(region.style.transform).not.toContain('translateX(16px)')
	expect(dimming).not.toBeNull()
	fireEvent.click(screen.getByRole('button', { name: '취소' }))
})

it('배경 Type·Image Mode는 왼쪽에서 전환하고 오른쪽에는 편집 도구만 표시한다', async () => {
	renderTemplate()
	await screen.findByRole('textbox', { name: '제목' })
	const layers = screen.getByRole('region', { name: 'Layers' })
	fireEvent.click(within(layers).getByRole('button', { name: /^Background$/ }))
	const selection = screen.getByRole('region', { name: '선택한 레이어 편집' })
	let editing = screen.getByRole('complementary', { name: '편집 도구' })
	const mode = within(within(selection).getByRole('radiogroup', { name: 'Mode' }))
	expect(within(editing).queryByRole('radiogroup', { name: 'Mode' })).toBeNull()
	expect(within(editing).queryByRole('radiogroup', { name: '텍스트 색상' })).toBeNull()
	fireEvent.click(mode.getByRole('radio', { name: 'Image' }))
	editing = screen.getByRole('complementary', { name: '편집 도구' })
	expect(editing.querySelector('[data-slot="studio-preset-list"]')).toBeNull()
	fireEvent.click(within(selection).getByRole('radio', { name: 'Generate' }))
	expect(
		await within(editing).findByText('사용 가능한 이미지 생성 프로파일이 없습니다.'),
	).toBeInTheDocument()
	expect(within(editing).queryByRole('radiogroup', { name: '배경 이미지 방식' })).toBeNull()
	fireEvent.click(screen.getByRole('button', { name: '완료' }))
	fireEvent.click(within(layers).getByRole('button', { name: /^Background$/ }))
	expect(screen.getByRole('radio', { name: 'Generate' })).toBeChecked()
	fireEvent.click(
		within(screen.getByRole('region', { name: '선택한 레이어 편집' })).getByRole('button', {
			name: 'Reset',
		}),
	)
	expect(
		within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
			name: 'Image',
		}),
	).toBeChecked()
	fireEvent.click(screen.getByRole('button', { name: '취소' }))
	// 편집 패널은 퇴장 모션이 끝난 뒤 사라진다.
	await waitFor(() =>
		expect(
			screen.queryByRole('region', { name: '선택한 레이어 편집' }),
		).not.toBeInTheDocument(),
	)
})

it.each([
	{ canvasPpi: undefined, width: '800', height: '600', unit: 'px' },
	{ canvasPpi: 100, width: '203.2', height: '152.4', unit: 'mm' },
])('출력 크기 2열 스택은 실제 템플릿의 $unit 치수를 사용한다', async ({
	canvasPpi,
	width,
	height,
	unit,
}) => {
	const { container } = renderTemplate(studio(1, { canvasPpi }))
	await screen.findByRole('textbox', { name: '제목' })
	const output = container.querySelector('[data-slot="studio-layout-output"]')
	const rows = output?.querySelectorAll(
		'[data-slot="controller-stack"] [data-slot="controller-row"]',
	)
	expect(rows).toHaveLength(2)
	expect(rows?.[0]).toHaveTextContent(`출력 너비${width}${unit}`)
	expect(rows?.[1]).toHaveTextContent(`출력 높이${height}${unit}`)
	expect(output).toContainElement(screen.getByRole('region', { name: 'Layers' }))
	const primary = container.querySelector('[data-slot="studio-control-fixed"]')
	expect(primary).not.toContainElement(screen.getByRole('region', { name: 'Layers' }))
	expect(output?.textContent?.indexOf('Layers')).toBeLessThan(
		output?.textContent?.indexOf('Output') ?? 0,
	)
})

it('Image 공통 생성 폼은 한 장을 요청하고 결과를 선택한 템플릿 슬롯에 반영한다', async () => {
	const profile = deriveImageStudioConfig({
		id: 41,
		name: '슬롯 프로파일',
		slug: 'slot',
		imageModelPreset: 'google-nano-banana-2-lite',
		features: [{ blockType: 'colorAdjustment', background: true }],
	})
	const data = studio(1, {
		html: '<div><div data-node-id="photo" data-figma-type="FRAME" data-name="사진" data-image-carrier="" style="width:400px;height:300px"></div></div>',
		nodeConfigs: { photo: { imageInput: {} } },
	})
	data.config = deriveTemplateStudioConfig(data.template, [profile], [])
	mocks.generate.mockResolvedValueOnce({
		generatedImages: [{ id: 91, url: '/template-image.png' }],
	})
	const { container } = renderTemplate(data)
	fireEvent.click(await screen.findByRole('button', { name: /^Image$/ }))
	const prompt = await screen.findByRole('textbox', { name: 'Prompt' })
	fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))
	expect(screen.getByRole('radio', { name: 'Swatch' })).toBeInTheDocument()
	expect(screen.getByRole('radio', { name: 'Custom' })).toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: 'Basic' }))
	fireEvent.change(prompt, { target: { value: '템플릿 이미지' } })
	fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))
	await waitFor(() =>
		expect(mocks.generate).toHaveBeenCalledWith(
			expect.objectContaining({ profileId: 41, prompt: '템플릿 이미지', count: 1 }),
		),
	)
	await waitFor(() =>
		expect(
			container.querySelector('[data-slot="template-preview"] [data-node-id="photo"]'),
		).toHaveStyle({ backgroundImage: 'url("/template-image.png")' }),
	)
	fireEvent.click(screen.getByRole('button', { name: '완료' }))
	const layers = screen.getByRole('region', { name: 'Layers' })
	fireEvent.click(within(layers).getByRole('button', { name: /^Image$/ }))
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('템플릿 이미지')
})

it('Graphic 공통 패널의 팔레트와 Position을 템플릿 배경 런타임에 연결한다', async () => {
	const graphic = { ...manifest, output: resolveGraphicStudioOutput(manifest) }
	const data = studio(1, { backgroundPolicy: { types: ['graphic'] } })
	data.config = deriveTemplateStudioConfig(data.template, [], [graphic])
	const { container } = renderTemplate(data)
	await screen.findByRole('textbox', { name: '제목' })
	fireEvent.click(screen.getByRole('button', { name: /^Background$/ }))
	const top = container.querySelector<HTMLElement>('[data-slot="studio-control-panel"]')
	const detail = top
	if (!top || !detail) throw new Error('공통 편집 패널이 없습니다.')
	expect(within(top).getByText('Presets')).toBeInTheDocument()
	expect(within(top).getByRole('slider', { name: 'Position' })).toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: 'Adjustment' }))
	expect(within(detail).getByRole('slider', { name: '열 간격' })).toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: 'Basic' }))
	expect(within(top).queryByRole('radio', { name: 'Custom' })).toBeNull()
	fireEvent.click(within(top).getByRole('radio', { name: '네이비 · 블루' }))
	await waitFor(() =>
		expect(mocks.graphicUpdate).toHaveBeenLastCalledWith(
			expect.objectContaining({ colorway: 'navyBlue' }),
		),
	)
	fireEvent.keyDown(within(top).getByRole('slider', { name: 'Position' }), { key: 'ArrowRight' })
	expect(within(top).getByRole('slider', { name: 'Position' })).toHaveAttribute(
		'aria-valuetext',
		'가로 5%, 세로 0%',
	)
})

it('패널 탐색은 실제 템플릿 세션을 유지하고 왼쪽 종류 선택·레이어·출력을 연결한다', async () => {
	const profile = deriveImageStudioConfig({
		id: 41,
		name: '실제 이미지 프로파일',
		slug: 'slot',
		imageModelPreset: 'google-nano-banana-2-lite',
	})
	const graphic = { ...manifest, output: resolveGraphicStudioOutput(manifest) }
	const data = studio(1, { backgroundPolicy: { types: ['color', 'image', 'graphic'] } })
	data.config = deriveTemplateStudioConfig(data.template, [profile], [graphic])
	const { container } = renderTemplate(data)
	fireEvent.change(await screen.findByRole('textbox', { name: '제목' }), {
		target: { value: '실제 편집값 유지' },
	})
	const preview = container.querySelector('[data-slot="template-preview"]')
	const output = container.querySelector('[data-slot="studio-layout-output"]')
	const format = screen.getByRole('combobox', { name: 'Format' })
	fireEvent.keyDown(format, { key: 'ArrowDown' })
	fireEvent.click(await screen.findByRole('option', { name: /^JPEG$/ }))
	fireEvent.click(screen.getByRole('button', { name: /^Background$/ }))
	// 실제 클릭처럼 포커스를 먼저 옮긴다 — 열린 자산 브라우저는 바깥으로 포커스가 나가면 닫힌다.
	const selectType = async (name: string) => {
		const radio = within(screen.getByRole('radiogroup', { name: 'Mode' })).getByRole('radio', {
			name,
		})
		act(() => radio.focus())
		fireEvent.click(radio)
	}
	await selectType('Graphic')
	fireEvent.click(screen.getByRole('button', { name: '그래픽 변경' }))
	// 변경 화면은 독립 스튜디오와 같은 카드 그리드다 — 지금 고른 카드가 aria-current로 선다.
	expect(
		document.querySelector('[data-slot="graphic-profile-picker"] [aria-current="true"]'),
	).toHaveTextContent(manifest.name)
	fireEvent.click(screen.getByRole('radio', { name: '네이비 · 블루' }))
	await selectType('Image')
	fireEvent.click(screen.getByRole('button', { name: '이미지 프로파일 변경' }))
	expect(
		document.querySelector('[data-slot="image-profile-picker"] [aria-current="true"]'),
	).toHaveTextContent('실제 이미지 프로파일')
	fireEvent.click(screen.getByRole('radio', { name: 'Generate' }))
	fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
		target: { value: '남아 있는 배경 프롬프트' },
	})
	await selectType('Graphic')
	expect(screen.getByRole('radio', { name: '네이비 · 블루' })).toBeChecked()
	await selectType('Image')
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('남아 있는 배경 프롬프트')
	fireEvent.click(screen.getByRole('button', { name: '완료' }))

	expect(container.querySelector('[data-slot="template-preview"]')).toBe(preview)
	expect(preview).toHaveTextContent('실제 편집값 유지')
	expect(container.querySelector('[data-slot="studio-layout-output"]')).toBe(output)
	expect(format).toHaveTextContent('JPEG')
	fireEvent.click(screen.getByRole('button', { name: '저장' }))
	await waitFor(() =>
		expect(mocks.export).toHaveBeenCalledWith(expect.objectContaining({ format: 'jpeg' })),
	)
})
