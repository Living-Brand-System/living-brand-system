import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeneratedImageHistoryItem } from '@/features/image-generation/domain/generated-image-history'
import type { ImageModelPreset } from '@/features/image-generation/domain/image-model'
import {
	deriveImageStudioConfig,
	IMAGE_STUDIO_GROUP_IDS,
	type ImageStudioConfig,
} from '@/features/image-generation/domain/image-studio-config'
import { ImageGenerator } from './image-generator'

vi.mock(
	'@/features/image-generation/runtime/reference-image/prepare-reference-image.client',
	() => ({
		prepareReferenceImage: vi.fn(
			async () => new Blob([new Uint8Array([4, 5, 6])], { type: 'image/webp' }),
		),
	}),
)

const browseMocks = vi.hoisted(() => ({
	fetchImageStudioConfigs: vi.fn(async () => [] as unknown[]),
}))
vi.mock('@/features/image-generation/services/list-image-studio-configs.client', () => browseMocks)

const historyMocks = vi.hoisted(() => ({
	fetchGeneratedImageHistory: vi.fn(
		async (
			_page: number,
			_options?: { bestOnly?: boolean },
		): Promise<{ hasMore: boolean; items: GeneratedImageHistoryItem[] }> => ({
			hasMore: false,
			items: [],
		}),
	),
}))
vi.mock(
	'@/features/image-generation/services/list-generated-image-history.client',
	() => historyMocks,
)

const SESSION = {
	images: [
		{
			src: '/api/generated-images/file/generated.png',
			generatedImageId: 8,
			profileId: 5,
		},
	],
	reference: null,
	output: { aspectRatio: '2:3' as const, imageSize: '1K' as const },
}

// 카메라를 한 번 돌린 뒤의 세션 — 참조 8을 물고 조정본 9를 낳았다.
// output 비율은 프로파일 기본값(2:3)과 일부러 다르다 — 재생성이 컨트롤 값이 아니라
// 참조가 만들어진 비율을 넘기는지 구분하려면 두 값이 갈려 있어야 한다.
const ADJUSTED_SESSION = {
	images: [
		{
			src: '/api/generated-images/file/adjusted.png',
			generatedImageId: 9,
			profileId: 5,
		},
	],
	reference: SESSION.images[0],
	output: { aspectRatio: '16:9' as const, imageSize: '1K' as const },
}

const mocks = vi.hoisted(() => ({
	generate: vi.fn(),
	// 세션·선택은 테스트마다 갈아끼운다 — 카메라 잠금이 선택에서 파생되기 때문이다.
	state: { session: null as unknown, selected: null as number | null },
}))

vi.mock('@/features/image-generation/hooks/use-image-generation', () => ({
	useImageGeneration: () => ({
		error: null,
		generate: mocks.generate,
		loading: false,
		requested: 0,
		selected: mocks.state.selected,
		session: mocks.state.session,
		setSelected: vi.fn(),
	}),
}))
vi.mock('@/components/studio/image/image-generation-results', () => ({
	ImageGenerationResults: () => null,
}))

function config(
	id: number,
	name: string,
	options: {
		cameraControl?: boolean
		colorAdjustment?: { line: string; background?: string }
		imageModelPreset?: ImageModelPreset
		maxPromptLength?: number
		referenceImage?: boolean
	} = {},
) {
	return deriveImageStudioConfig({
		id,
		name,
		slug: null,
		imageModelPreset: options.imageModelPreset ?? 'openai-gpt-image-2',
		features: [
			...(options.colorAdjustment
				? [
						{
							blockType: 'colorAdjustment',
							background: Boolean(options.colorAdjustment.background),
						},
					]
				: []),
			...(options.cameraControl === false ? [] : [{ blockType: 'cameraControl' }]),
			...(options.referenceImage ? [{ blockType: 'referenceImage' }] : []),
		],
		controllerRestrictions: {
			controls: [
				...(options.maxPromptLength
					? [{ controlId: 'prompt', maxLength: options.maxPromptLength }]
					: []),
				...(options.colorAdjustment
					? [
							{
								controlId: 'lineColor',
								defaultValue: options.colorAdjustment.line,
							},
							...(options.colorAdjustment.background
								? [
										{
											controlId: 'backgroundColor',
											defaultValue: options.colorAdjustment.background,
										},
									]
								: []),
						]
					: []),
			],
		},
	})
}

describe('ImageGenerator', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.state = { session: null, selected: null }
	})
	afterEach(cleanup)

	it('첫 계약의 프로파일로 생성하고 장수·비율·해상도는 계약 시작값을 따른다', () => {
		render(
			createElement(ImageGenerator, {
				config: config(5, '에센허브 브랜드 제품컷'),
			}),
		)

		fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
			target: { value: '파란 세럼병' },
		})
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		expect(mocks.generate).toHaveBeenCalledWith(
			{
				aspectRatio: '2:3',
				count: 4,
				imageSize: '1K',
				profileId: 5,
				prompt: '파란 세럼병',
			},
			// 첨부가 없으면 참조 카드도 없다 — 그리드 0번을 차지하는 것이 없다.
			null,
		)
	})

	// 어느 프로파일로 시작할지는 라우트(page)가 정한다 — 여기서는 받은 계약을 그리는지만 본다.
	it('전달받은 시작 계약의 프로파일을 그린다', () => {
		render(createElement(ImageGenerator, { config: config(7, '그라디언트') }))

		expect(screen.getByText('그라디언트')).toBeInTheDocument()
	})

	it('첨부를 열지 않은 프로파일에는 Reference Image 섹션이 없다', () => {
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		expect(screen.queryByText('Reference Image')).not.toBeInTheDocument()
	})

	it('첨부한 이미지를 참조로 함께 보내고 그리드 0번 카드로 넘긴다', async () => {
		const { container } = render(
			createElement(ImageGenerator, {
				config: config(5, '제품컷', { referenceImage: true }),
			}),
		)
		const input = container.querySelector('input[type="file"]')
		if (!input) throw new Error('첨부 입력이 없습니다')

		fireEvent.change(input, {
			target: {
				files: [new File([new Uint8Array([1, 2, 3])], 'ref.png', { type: 'image/png' })],
			},
		})
		// 변환한 WebP가 미리보기에 반영될 때까지 기다린다.
		await waitFor(() => expect(screen.getByAltText(/ref\.png/)).toBeInTheDocument())

		fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
			target: { value: '파란 세럼병' },
		})
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		expect(mocks.generate).toHaveBeenCalledWith(
			expect.objectContaining({ reference: { upload: 'data:image/webp;base64,BAUG' } }),
			// 첨부도 참조라서 결과 그리드 0번을 차지한다. 저장하지 않으므로 id는 없다.
			{ src: 'data:image/webp;base64,BAUG', generatedImageId: null, profileId: 5 },
		)
	})

	it('JPG·PNG·WebP가 아닌 파일은 첨부하지 않고 사유를 보여준다', async () => {
		const { container } = render(
			createElement(ImageGenerator, {
				config: config(5, '제품컷', { referenceImage: true }),
			}),
		)
		const input = container.querySelector('input[type="file"]')
		if (!input) throw new Error('첨부 입력이 없습니다')

		fireEvent.change(input, {
			target: { files: [new File(['%PDF'], 'ref.pdf', { type: 'application/pdf' })] },
		})

		await waitFor(() =>
			expect(
				screen.getByText('JPG, PNG, WebP 이미지만 첨부할 수 있어요.'),
			).toBeInTheDocument(),
		)
		expect(screen.queryByAltText(/ref\.pdf/)).not.toBeInTheDocument()
	})

	it('색을 개방하지 않은 프로파일에는 Profile Settings 섹션이 없다', () => {
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		expect(screen.queryByText('Profile Settings')).not.toBeInTheDocument()
	})

	it('색을 개방한 프로파일은 계약의 색을 조작 가능한 행으로 보여준다', () => {
		render(
			createElement(ImageGenerator, {
				config: config(5, '라인 일러스트', {
					colorAdjustment: { line: '#000dff', background: '#00ffd4' },
				}),
			}),
		)

		expect(screen.getByText('Profile Settings')).toBeInTheDocument()
		expect(screen.getByLabelText('Line Color 색상 선택')).toHaveValue('#000dff')
		expect(screen.getByLabelText('Background Color 색상 선택')).toBeEnabled()
	})

	// 배경 색 행은 계약에 배경이 실려 있을 때만 그린다.
	it('라인 색만 개방한 프로파일은 배경 색 행을 그리지 않는다', () => {
		render(
			createElement(ImageGenerator, {
				config: config(5, '라인 일러스트', { colorAdjustment: { line: '#000dff' } }),
			}),
		)

		expect(screen.getByLabelText('Line Color 색상 선택')).toBeInTheDocument()
		expect(screen.queryByLabelText('Background Color 색상 선택')).not.toBeInTheDocument()
	})

	it('해상도 선택지가 하나뿐이면 읽기 전용으로 그린다', () => {
		render(
			createElement(ImageGenerator, {
				config: config(5, '라이트 모델', { imageModelPreset: 'google-nano-banana-2-lite' }),
			}),
		)

		expect(screen.queryByRole('combobox', { name: '해상도' })).not.toBeInTheDocument()
		// 비율은 선택지가 여럿이라 그대로 조작할 수 있다.
		expect(screen.getByRole('combobox', { name: '비율' })).toBeInTheDocument()
	})

	it('생성 control이 다른 group에 있어도 compact footer에만 한 번 그린다', () => {
		const base = config(5, '제품컷')
		const generationGroup = base.controller.groups.find(
			(group) => group.id === IMAGE_STUDIO_GROUP_IDS.generationSettings,
		)
		if (!generationGroup) throw new Error('generation settings group is required')
		const moved = {
			...base,
			controller: {
				groups: base.controller.groups.map((group) =>
					group.id === IMAGE_STUDIO_GROUP_IDS.generationSettings
						? { ...generationGroup, id: 'custom-settings', title: 'Custom Settings' }
						: group,
				),
			},
		}

		render(createElement(ImageGenerator, { config: moved }))

		expect(screen.queryByText('Custom Settings')).not.toBeInTheDocument()
		expect(screen.getAllByRole('combobox', { name: '장수' })).toHaveLength(1)
		expect(screen.getAllByRole('combobox', { name: '비율' })).toHaveLength(1)
		expect(screen.getAllByRole('combobox', { name: '해상도' })).toHaveLength(1)
	})

	it('결과를 고르기 전에는 Camera Controls가 잠기고 고른 뒤에 열린다', () => {
		const view = render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		expect(screen.getByRole('button', { name: 'Camera Controls' })).toBeDisabled()
		expect(screen.queryByRole('combobox', { name: 'X' })).not.toBeInTheDocument()

		mocks.state = { session: SESSION, selected: 0 }
		view.rerender(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		expect(screen.getByRole('button', { name: 'Camera Controls' })).toBeEnabled()
		expect(screen.getByRole('combobox', { name: 'X' })).toBeInTheDocument()
	})

	// 참조 고정: 조정본을 골라 둔 채 다시 돌려도 시드는 언제나 최초 원본이다(세대 누적 열화 방지).
	it('카메라 재생성은 선택한 조정본이 아니라 고정된 참조를 통합 라우트로 보낸다', () => {
		mocks.state = { session: ADJUSTED_SESSION, selected: 1 }
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		// 메인 생성 버튼과 카메라 재생성 버튼이 같은 이름을 쓴다 — 뒤엣것이 카메라다.
		const buttons = screen.getAllByRole('button', { name: '이미지 생성' })
		fireEvent.click(buttons[buttons.length - 1] as HTMLElement)

		expect(mocks.generate).toHaveBeenCalledWith(
			{
				// 프로파일 기본값 2:3이 아니라 참조가 만들어진 16:9 — 조정본이 다른 비율로
				// 돌아오면 그리드에서 참조 카드가 잘린다.
				aspectRatio: '16:9',
				camera: { azimuthDeg: 0, elevationDeg: 0 },
				count: 1,
				imageSize: '1K',
				profileId: 5,
				prompt: '',
				reference: { generatedImageId: 8 },
			},
			ADJUSTED_SESSION.reference,
		)
	})

	it('시점 조정을 지원하지 않는 프로파일은 Camera Controls를 그리지 않는다', () => {
		mocks.state = { session: SESSION, selected: 0 }
		render(
			createElement(ImageGenerator, {
				config: config(5, '평면 그래픽', { cameraControl: false }),
			}),
		)

		expect(screen.queryByText('Camera Controls')).not.toBeInTheDocument()
	})

	it('발행된 프로파일이 없으면 컨트롤러 없이 안내만 그린다', () => {
		render(createElement(ImageGenerator, { config: null }))

		expect(screen.getByText('발행된 이미지 프로파일이 없습니다')).toBeInTheDocument()
		expect(screen.queryByRole('textbox', { name: 'Prompt' })).not.toBeInTheDocument()
	})
})

describe('ImageProfilePicker', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.state = { session: null, selected: null }
	})
	afterEach(cleanup)

	// 목록은 패널이 열릴 때 /api/image-profiles에서 온다 — 카드는 그 응답이 도착한 뒤에 나타난다.
	async function openBrowser(configs: ImageStudioConfig[], initialProfileId?: number) {
		browseMocks.fetchImageStudioConfigs.mockResolvedValue(configs)
		const initial = configs.find(({ id }) => id === initialProfileId) ?? configs[0]
		render(createElement(ImageGenerator, { config: initial ?? null }))
		const trigger = screen.getByRole('button', { name: '프로파일 변경' })
		// 프로파일 교체는 좌측 패널이 갖는다 — 「무엇을 캔버스에 올릴지」를 고르는 자리다.
		expect(trigger.closest('[data-slot="studio-left-panel"]')).not.toBeNull()
		fireEvent.click(trigger)
		const panel = screen.getByRole('dialog', { name: 'Image Profiles' })
		await within(panel).findByRole('button', { name: new RegExp(configs[0]?.name ?? '') })
		return { panel, trigger }
	}

	it('Change로 자산 브라우저가 열리고 프로파일마다 카드가 있다', async () => {
		const { panel } = await openBrowser([config(5, '제품컷'), config(7, '그라디언트')])

		expect(within(panel).getByRole('button', { name: /제품컷/ })).toBeInTheDocument()
		expect(within(panel).getByRole('button', { name: /그라디언트/ })).toBeInTheDocument()
	})

	// 배지는 그 프로파일이 무엇을 열어주는지의 표시라 계약의 개방 필드에서만 파생한다.
	it('배지를 계약의 개방 필드에서 파생한다', async () => {
		const { panel } = await openBrowser([
			config(1, '카메라만'),
			config(2, '색만', {
				cameraControl: false,
				colorAdjustment: { line: '#000dff' },
			}),
			config(3, '둘 다', { colorAdjustment: { line: '#000dff' } }),
			config(4, '없음', { cameraControl: false }),
		])

		const cards = {
			camera: within(panel).getByRole('button', { name: /카메라만/ }),
			color: within(panel).getByRole('button', { name: /색만/ }),
			both: within(panel).getByRole('button', { name: /둘 다/ }),
			none: within(panel).getByRole('button', { name: /없음/ }),
		}

		expect(within(cards.camera).getByText('Camera')).toBeInTheDocument()
		expect(within(cards.camera).queryByText('Line Control')).not.toBeInTheDocument()
		expect(within(cards.color).getByText('Line Control')).toBeInTheDocument()
		expect(within(cards.color).queryByText('Camera')).not.toBeInTheDocument()
		expect(within(cards.both).getByText('Camera')).toBeInTheDocument()
		expect(within(cards.both).getByText('Line Control')).toBeInTheDocument()
		expect(within(cards.none).queryByText('Camera')).not.toBeInTheDocument()
		expect(within(cards.none).queryByText('Line Control')).not.toBeInTheDocument()
	})

	it('현재 프로파일 카드를 aria-current로 알린다', async () => {
		const { panel } = await openBrowser([config(5, '제품컷'), config(7, '그라디언트')], 7)

		expect(within(panel).getByRole('button', { name: /그라디언트/ })).toHaveAttribute(
			'aria-current',
			'true',
		)
		expect(within(panel).getByRole('button', { name: /제품컷/ })).not.toHaveAttribute(
			'aria-current',
		)
	})

	it('카드를 고르면 프로파일이 바뀌고 패널이 닫힌다', async () => {
		const { panel } = await openBrowser([
			config(5, '제품컷'),
			config(7, '그라디언트', { maxPromptLength: 42 }),
		])

		fireEvent.click(within(panel).getByRole('button', { name: /그라디언트/ }))

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		// 사이드바 헤더가 새 계약을 그린다 — 카운터 상한도 새 프로파일의 것이다.
		expect(screen.getByText('0/42')).toBeInTheDocument()
		fireEvent.change(screen.getByRole('textbox', { name: 'Prompt' }), {
			target: { value: '노란 배경' },
		})
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))
		expect(mocks.generate).toHaveBeenCalledWith(
			expect.objectContaining({ profileId: 7, prompt: '노란 배경' }),
			null,
		)
	})

	it('Esc로 닫히고 포커스가 트리거로 돌아온다', async () => {
		const { trigger } = await openBrowser([config(5, '제품컷'), config(7, '그라디언트')])

		fireEvent.keyDown(document, { key: 'Escape' })

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
		// 포커스 복귀는 언마운트 직후 매크로태스크에서 일어난다.
		await waitFor(() => expect(document.activeElement).toBe(trigger))
	})

	// 후보가 자기 자신뿐이면 고를 것이 없다 — 카드는 남기고 그 사실을 적는다.
	it('프로파일이 하나뿐이면 카드와 함께 교체 대상이 없다고 알린다', async () => {
		const { panel } = await openBrowser([config(5, '제품컷')])

		expect(within(panel).getByRole('button', { name: /제품컷/ })).toHaveAttribute(
			'aria-current',
			'true',
		)
		expect(
			within(panel).getByText('교체할 다른 이미지 프로파일이 없습니다.'),
		).toBeInTheDocument()
	})
})

describe('이미지 이력 — 본보기 패널과 캔버스 스트립', () => {
	function historyItem(
		overrides: Partial<GeneratedImageHistoryItem> = {},
	): GeneratedImageHistoryItem {
		return {
			aspectRatio: '16:9',
			batchKey: null,
			createdAt: '2026-09-20T00:00:00.000Z',
			id: 42,
			imageSize: '2K',
			profileId: 5,
			profileName: '제품컷',
			prompt: '파란 세럼병',
			url: '/api/generated-images/file/past.png',
			...overrides,
		}
	}

	/** 본보기 패널과 스트립이 같은 클라이언트 서비스를 쓰므로 bestOnly로 갈라 답한다. */
	function respond(input: {
		best?: GeneratedImageHistoryItem[]
		history?: GeneratedImageHistoryItem[]
	}) {
		historyMocks.fetchGeneratedImageHistory.mockImplementation(async (_page, options) => ({
			hasMore: false,
			items: (options?.bestOnly ? input.best : input.history) ?? [],
		}))
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.state = { session: null, selected: null }
		respond({})
	})
	afterEach(cleanup)

	it('본보기는 bestOnly로만 조회한다', async () => {
		respond({ best: [historyItem({ id: 1, prompt: '본보기' })] })
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		await screen.findByRole('button', { name: '본보기' })
		expect(historyMocks.fetchGeneratedImageHistory).toHaveBeenCalledWith(1, {
			bestOnly: true,
		})
	})

	it('지정된 본보기가 없으면 그 사실을 적는다', async () => {
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		expect(await screen.findByText('아직 지정된 본보기가 없습니다')).toBeInTheDocument()
	})

	// 🔴 묶음은 겹치지 않고 구분선으로만 갈린다 — 스트립은 이력 전체를 한 줄로 보여주는 자리다.
	it('스트립이 이력 전체를 그리고 묶음 사이에 구분선을 넣는다', async () => {
		respond({
			history: [
				historyItem({ batchKey: 'b1', id: 1, prompt: '첫 묶음' }),
				historyItem({ batchKey: 'b1', id: 2, prompt: '첫 묶음' }),
				historyItem({ batchKey: 'b2', id: 3, prompt: '둘째 묶음' }),
			],
		})
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		const strip = await screen.findByTestId('strip')
		expect(within(strip).getAllByRole('button')).toHaveLength(3)
		// 묶음이 둘이므로 구분선은 하나다(첫 묶음 앞에는 없다).
		expect(strip.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
	})

	it('아무것도 안 골랐으면 가장 최근 것이 자동으로 선택된다', async () => {
		respond({
			history: [
				historyItem({ batchKey: 'b1', id: 1, prompt: '최근 것' }),
				historyItem({ batchKey: 'b2', id: 2, prompt: '옛날 것' }),
			],
		})
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		expect(await screen.findByDisplayValue('최근 것')).toBeInTheDocument()
	})

	it('스트립에서 고른 장의 값으로 컨트롤러를 덮는다', async () => {
		respond({
			history: [
				historyItem({ batchKey: 'b1', id: 1, prompt: '최근 것' }),
				historyItem({
					aspectRatio: '2:3',
					batchKey: 'b2',
					id: 2,
					imageSize: '4K',
					prompt: '옛날 것',
				}),
			],
		})
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		fireEvent.click(await screen.findByRole('button', { name: '옛날 것' }))

		expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('옛날 것')
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))
		expect(mocks.generate).toHaveBeenCalledWith(
			expect.objectContaining({ aspectRatio: '2:3', imageSize: '4K', prompt: '옛날 것' }),
			null,
		)
	})

	// 권한이 없으면 Payload가 메타 필드를 빼고 내려준다 — 고를 수는 있고 덮이지만 않는다.
	it('복원 값이 없는 장은 골라도 컨트롤러를 안 바꾼다', async () => {
		respond({
			history: [historyItem({ profileId: null, profileName: null, prompt: null })],
		})
		render(createElement(ImageGenerator, { config: config(5, '제품컷') }))

		fireEvent.click(await screen.findByRole('button', { name: '생성 이미지' }))

		expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('')
	})
})
