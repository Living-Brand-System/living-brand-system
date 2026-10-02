import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Controller } from '@/components/shared/controller'
import { resolveGraphicStudioOutput } from '@/features/graphic-generation/domain/graphic-studio-manifest'
import forwardStraightRuntimeManifest from '@/features/graphic-generation/graphic-runtimes/forward-straight/definition'
import {
	CAMERA_AZIMUTHS,
	CAMERA_ELEVATIONS,
} from '@/features/image-generation/domain/camera-control'
import type { ImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import {
	resolveTemplateImageConfig,
	type TemplateBackgroundType,
} from '@/features/template-customization/domain/template-studio-config'
import type { TemplateBackgroundState } from '@/features/template-customization/hooks/use-template-studio'
import {
	type ControllerRuntimeBindings,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'
import { BackgroundSection } from './background-section'

const imageContract = resolveTemplateImageConfig(createImageConfig(), {
	width: 400,
	height: 300,
})
if (!imageContract) throw new Error('테스트 Image Config가 호환되지 않습니다.')
const forwardStraightConfig = {
	...forwardStraightRuntimeManifest,
	output: resolveGraphicStudioOutput(forwardStraightRuntimeManifest),
}

type HarnessPatch = Partial<Pick<TemplateBackgroundState, 'imageMode' | 'color' | 'prompt'>>

/** 배경 상태의 소유자는 Provider다 — 테스트에서는 같은 계약(값+patch)의 껍데기가 대신 쥔다. */
function Harness({
	allowedTypes,
	onChange,
	onGenerate = vi.fn(),
	contract = imageContract as typeof imageContract | null,
	featureBindings = {
		lineColor: { availability: 'disabled' },
		backgroundColor: { availability: 'disabled' },
	},
	initialError = null,
	initialImage,
	generating = false,
	typeAvailability,
	withDimmer = true,
}: {
	allowedTypes: readonly TemplateBackgroundType[]
	onChange?: (patch: HarnessPatch) => void
	onGenerate?: () => void
	contract?: typeof imageContract | null
	featureBindings?: ControllerRuntimeBindings
	initialError?: string | null
	initialImage?: TemplateBackgroundState['image']
	generating?: boolean
	typeAvailability?: 'enabled' | 'readonly' | 'disabled'
	/** false = 어드민 정책이 디머를 꺼서 매니페스트에 컨트롤이 없는 상태. */
	withDimmer?: boolean
}) {
	const [state, setState] = useState<TemplateBackgroundState>({
		type: allowedTypes[0] ?? 'color',
		imageMode: 'preset',
		color: null,
		profileId: contract?.config.id,
		prompt: contract?.prompt.defaultValue ?? '',
		generating,
		error: initialError,
		featureValues: contract ? createControllerValues(contract.config.controller.groups) : {},
		graphicConfigId: forwardStraightRuntimeManifest.id,
		graphicValues: createControllerValues(forwardStraightRuntimeManifest.controller.groups),
		image: initialImage,
		dimmer: false,
		dimmerOpacity: 0.2,
	})
	return (
		// 살아 있는 자산 카드는 열림 상태를 킷이 소유한다 — 실제 화면과 같은 껍데기를 씌운다.
		<Controller.Browser.Root>
			<BackgroundSection
				groupDefinition={{
					id: 'background',
					title: 'Background',
					controls: [],
				}}
				typeDefinition={{
					id: 'background.type',
					kind: 'select',
					label: 'Type',
					defaultValue: allowedTypes[0] ?? 'color',
					availability: typeAvailability,
					options: allowedTypes.map((value) => ({
						value,
						label: value[0]?.toUpperCase() + value.slice(1),
					})),
				}}
				dimmerDefinition={
					withDimmer
						? {
								id: 'background.dimmer',
								kind: 'toggle',
								label: 'Dimmer',
								defaultValue: false,
							}
						: undefined
				}
				dimmerOpacityDefinition={
					withDimmer
						? {
								id: 'background.dimmerOpacity',
								kind: 'range',
								label: 'Dimmer Opacity',
								defaultValue: 0.2,
								min: 0,
								max: 0.7,
								step: 0.01,
							}
						: undefined
				}
				colorDefinition={{
					id: 'background.color',
					kind: 'color',
					label: 'Background Color',
					defaultValue: null,
				}}
				imageContracts={contract ? [contract] : []}
				featureBindings={contract ? featureBindings : {}}
				graphicConfigs={[forwardStraightConfig]}
				graphicBindings={{ origin: { padAspectRatio: 4 / 3 } }}
				value={state}
				onChange={(patch) => {
					onChange?.(patch)
					setState((current) => ({ ...current, ...patch }))
				}}
				onColorChange={(color) => {
					if (typeof color !== 'string' && color !== null) return
					onChange?.({ color })
					setState((current) => ({ ...current, color }))
				}}
				onTypeChange={(type) =>
					setState((current) =>
						type === 'color' || type === 'image' || type === 'graphic'
							? { ...current, type }
							: current,
					)
				}
				onFeatureChange={() => {}}
				onImageProfileChange={(profileId) =>
					setState((current) => ({ ...current, profileId }))
				}
				onSelectSampleImage={(option) =>
					setState((current) => ({
						...current,
						image: {
							kind: 'sample',
							url: option.url,
							sampleImageId: option.id,
							name: option.name,
							alt: option.alt,
							thumbnailUrl: option.thumbnailUrl,
							lineArt: false,
						},
					}))
				}
				onGraphicConfigChange={(graphicConfigId) =>
					setState((current) => ({ ...current, graphicConfigId }))
				}
				onGraphicChange={(controlId, next) =>
					setState((current) => ({
						...current,
						graphicValues: { ...current.graphicValues, [controlId]: next },
					}))
				}
				onGenerate={onGenerate}
			/>
		</Controller.Browser.Root>
	)
}

/** Type 셀렉트를 키보드로 열어 옵션을 고른다 — jsdom엔 pointer capture가 없어 클릭으로 못 연다. */
async function selectBackgroundType(user: ReturnType<typeof userEvent.setup>, option: string) {
	const select = screen.queryByRole('combobox', { name: 'Type' })
	if (!select) return
	select.focus()
	await user.keyboard('{ArrowDown}')
	await user.click(screen.getByRole('option', { name: option }))
}

/** Generate 탭으로 옮긴다 — 탭 스왑은 AnimatePresence mode="wait"라 이전 패널이 빠진 뒤 나타난다. */
async function openGenerateTab(user: ReturnType<typeof userEvent.setup>) {
	await selectBackgroundType(user, 'Image')
	await user.click(screen.getByRole('radio', { name: 'Generate' }))
	return await screen.findByLabelText('Prompt')
}

describe('BackgroundSection', () => {
	afterEach(cleanup)

	it('정책이 디머를 꺼서 정의가 없으면 Dimmer 행을 그리지 않는다', () => {
		render(<Harness allowedTypes={['color']} withDimmer={false} />)
		expect(screen.queryByText('Dimmer')).toBeNull()
	})

	it('기본 Color 타입은 배경색 행만 보여준다', () => {
		render(<Harness allowedTypes={['color', 'image', 'graphic']} />)

		expect(screen.getByLabelText('Background Color 색상 선택')).toBeInTheDocument()
		expect(screen.queryByRole('radio', { name: 'Preset' })).toBeNull()
	})

	it('Image 타입은 Preset·Generate 세그먼트로 하위 컨트롤을 갈아끼운다', async () => {
		const user = userEvent.setup()
		render(<Harness allowedTypes={['color', 'image', 'graphic']} />)
		await selectBackgroundType(user, 'Image')

		// Preset 기본: 브라우즈 카드가 보이고 프롬프트는 없다.
		expect(screen.getByText('이미지를 선택하세요')).toBeInTheDocument()
		expect(screen.queryByLabelText('Prompt')).toBeNull()

		expect(await openGenerateTab(user)).toBeInTheDocument()
	})

	it('활성 세그먼트 재클릭은 선택을 비우지 않는다', async () => {
		const user = userEvent.setup()
		render(<Harness allowedTypes={['color', 'image', 'graphic']} />)
		await selectBackgroundType(user, 'Image')

		// radix ToggleGroup은 재클릭에 빈 값을 내보낸다 — 가드가 없으면 두 탭 패널이 모두 사라진다.
		await user.click(screen.getByRole('radio', { name: 'Preset' }))
		expect(screen.getByText('이미지를 선택하세요')).toBeInTheDocument()
	})

	it('계약이 허용한 배경 종류만 Type 목록에 오르고, 첫 허용 종류가 기본값이 된다', async () => {
		const user = userEvent.setup()
		render(<Harness allowedTypes={['image', 'graphic']} />)

		// 기본값이 color가 아니라 첫 허용 종류(image) — Preset 브라우즈 카드가 바로 보인다.
		expect(screen.getByText('이미지를 선택하세요')).toBeInTheDocument()

		screen.getByRole('combobox', { name: 'Type' }).focus()
		await user.keyboard('{ArrowDown}')
		expect(screen.queryByRole('option', { name: 'Color' })).toBeNull()
		expect(screen.getByRole('option', { name: 'Graphic' })).toBeInTheDocument()
	})

	it.each([
		'readonly',
		'disabled',
	] as const)('Type Definition이 %s면 UI에서 배경 종류를 바꿀 수 없다', (availability) => {
		render(
			<Harness
				allowedTypes={['color', 'image', 'graphic']}
				typeAvailability={availability}
			/>,
		)

		if (availability === 'readonly') {
			expect(screen.queryByRole('combobox', { name: 'Type' })).toBeNull()
			expect(screen.getByText('Color')).toBeInTheDocument()
		} else {
			expect(screen.getByRole('combobox', { name: 'Type' })).toBeDisabled()
		}
	})

	it('배경색은 만졌을 때만 값이 되고 초기화로 되돌린다', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		render(<Harness allowedTypes={['color']} onChange={onChange} />)

		// 만지기 전 — 저작 배경을 사칭하지 않는다.
		expect(screen.getByText('—')).toBeInTheDocument()

		// 네이티브 컬러 피커는 타이핑으로 값을 못 바꾼다 — 변경 이벤트를 직접 쏜다.
		fireEvent.change(screen.getByLabelText('Background Color 색상 선택'), {
			target: { value: '#ff0000' },
		})
		expect(onChange).toHaveBeenLastCalledWith({ color: '#ff0000' })
		expect(screen.getByText('#ff0000')).toBeInTheDocument()

		await user.click(
			screen.getByRole('button', { name: 'Background Color 원래 색으로 되돌리기' }),
		)
		expect(onChange).toHaveBeenLastCalledWith({ color: null })
	})

	it('프롬프트와 생성 이벤트를 Provider에 올리고 제한된 캔버스 비율을 보여준다', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const onGenerate = vi.fn()
		render(<Harness allowedTypes={['image']} onChange={onChange} onGenerate={onGenerate} />)

		const promptField = await openGenerateTab(user)
		expect(screen.getByRole('button', { name: '이미지 생성' })).toBeDisabled()
		await user.type(promptField, '파스텔 그라디언트')
		expect(screen.getByText('4:3')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: '이미지 생성' }))
		expect(onChange).toHaveBeenCalledWith({ prompt: '파스텔 그라디언트' })
		expect(onGenerate).toHaveBeenCalledOnce()
	})

	it('이미지 생성 중에는 Profile 변경을 막는다', async () => {
		const user = userEvent.setup()
		render(<Harness allowedTypes={['image']} generating />)

		await openGenerateTab(user)
		expect(screen.getByRole('combobox', { name: 'Image Profile' })).toBeDisabled()
	})

	it('Provider가 가진 생성 오류를 표시한다', async () => {
		const user = userEvent.setup()
		render(
			<Harness
				allowedTypes={['image']}
				initialError="이미지 생성에 실패했어요. 잠시 후 다시 시도해 주세요."
			/>,
		)
		await openGenerateTab(user)

		expect(
			screen.getByText('이미지 생성에 실패했어요. 잠시 후 다시 시도해 주세요.'),
		).toBeInTheDocument()
	})

	it('호환 Image Config가 없으면 생성이 막히고 Provider의 이유를 알린다', async () => {
		const user = userEvent.setup()
		const onGenerate = vi.fn()
		render(
			<Harness
				allowedTypes={['image']}
				contract={null}
				initialError="사용 가능한 이미지 프로파일이 없습니다."
				onGenerate={onGenerate}
			/>,
		)

		await user.click(screen.getByRole('radio', { name: 'Generate' }))
		await screen.findByRole('button', { name: '이미지 생성' })
		expect(screen.getByRole('button', { name: '이미지 생성' })).toBeDisabled()
		expect(screen.getByText('사용 가능한 이미지 프로파일이 없습니다.')).toBeInTheDocument()
		expect(onGenerate).not.toHaveBeenCalled()
	})

	it.each([
		'readonly',
		'disabled',
	] as const)('prompt가 %s면 Admin default를 수정하지 않고 생성 이벤트를 올린다', async (availability) => {
		const user = userEvent.setup()
		const onGenerate = vi.fn()
		const fixedContract = {
			...imageContract,
			prompt: {
				...imageContract.prompt,
				availability,
				defaultValue: '고정 배경 프롬프트',
			},
		}
		render(
			<Harness allowedTypes={['image']} contract={fixedContract} onGenerate={onGenerate} />,
		)

		await user.click(screen.getByRole('radio', { name: 'Generate' }))
		await screen.findByRole('button', { name: '이미지 생성' })
		if (availability === 'readonly') {
			expect(screen.getByText('고정 배경 프롬프트')).toBeInTheDocument()
		} else {
			expect(screen.getByDisplayValue('고정 배경 프롬프트')).toBeDisabled()
		}
		await user.click(screen.getByRole('button', { name: '이미지 생성' }))
		expect(onGenerate).toHaveBeenCalledOnce()
	})

	it('고른 샘플 이미지는 목록을 다시 열지 않아도 카드에 이름과 미리보기로 남는다', () => {
		render(
			<Harness
				allowedTypes={['image']}
				initialImage={{
					kind: 'sample',
					url: '/api/sample-images/file/submarine.png',
					sampleImageId: 12,
					name: '잠수함',
					alt: '잠수함 사진',
					thumbnailUrl: '/api/sample-images/file/submarine-320x240.png',
					lineArt: false,
				}}
			/>,
		)

		// 선택 시점의 표시 정보를 세션이 들고 있어 목록 자원 없이 그려진다.
		expect(screen.getByText('잠수함')).toBeInTheDocument()
		// 카드 배경은 장식이라 alt가 비어 있다(AssetCard 계약) — 썸네일 URL로 확인한다.
		expect(document.querySelector('[data-slot="controller-asset-card"] img')).toHaveAttribute(
			'src',
			'/api/sample-images/file/submarine-320x240.png',
		)
	})

	it('미배선 Image 기능은 잠그고 Graphic Config는 공용 Renderer로 조작한다', async () => {
		const user = userEvent.setup()
		render(<Harness allowedTypes={['color', 'image', 'graphic']} />)

		await selectBackgroundType(user, 'Image')
		// Preset(샘플 이미지 목록)은 배선됐고, 배경 transform은 아예 없다.
		const browse = screen.getByRole('button', { name: '샘플 이미지 선택' })
		expect(browse).toHaveTextContent('Browse')
		expect(browse).toBeEnabled()
		expect(screen.queryByRole('button', { name: 'Image Transform' })).toBeNull()

		// Generate 탭의 두 색 행은 생성 이미지 colorize 파라미터 — 캔버스 경로가 따로 필요하다.
		await openGenerateTab(user)
		// 이전 방식의 행이 접히며 빠지는 동안은 같은 이름이 잠깐 둘이다 — 하나만 남을 때를 본다.
		await waitFor(() => expect(screen.getByLabelText('Background Color')).toBeDisabled())
		expect(screen.getByLabelText('Line Color')).toBeDisabled()
		expect(screen.getByText('#000000')).toBeInTheDocument()
		expect(screen.getByText('#ffffff')).toBeInTheDocument()

		await selectBackgroundType(user, 'Graphic')
		expect(screen.getByLabelText('Graphic Type')).toBeEnabled()
		expect(screen.getByText('Forward Straight')).toBeInTheDocument()
		// 빠진 컨트롤은 접히는 모션이 끝난 뒤 사라진다.
		await waitFor(() => expect(screen.queryByLabelText('Line Color')).toBeNull())
		expect(screen.getByRole('slider', { name: '기준점' })).toHaveAttribute(
			'aria-valuetext',
			'가로 0%, 세로 0%',
		)
	})

	it('🔴 배경 그래픽도 창작자에게 보이는 축만 그린다 — admin 전용 축이 여기서 되살아나면 안 된다', async () => {
		const user = userEvent.setup()
		render(<Harness allowedTypes={['color', 'image', 'graphic']} />)
		await selectBackgroundType(user, 'Graphic')

		// 우측 축은 그린다.
		expect(screen.getByRole('slider', { name: '열 간격' })).toBeInTheDocument()
		expect(screen.getByRole('slider', { name: '기준점 두께' })).toBeInTheDocument()
		// 🔴 좌·우 어느 쪽에도 없는 축은 Graphic 스튜디오에서 내려간 것이다 — 같은 런타임이
		//    화면마다 다른 축 수를 보여주면 worker가 manager 전용 값을 만진다.
		for (const axis of ['선 길이', '여백', '두께 감쇠 거리']) {
			expect(screen.queryByRole('slider', { name: axis }), axis).toBeNull()
		}
	})

	it('Background를 접으면 선택한 Graphic의 그룹도 함께 닫힌다', async () => {
		const user = userEvent.setup()
		const { container } = render(<Harness allowedTypes={['color', 'image', 'graphic']} />)
		await selectBackgroundType(user, 'Graphic')

		// Graphic Config의 그룹은 Background 본문 안에 있어야 한다 — 형제로 두면 따로 남는다.
		const content = container.querySelector('[data-slot="controller-group-content"]')
		expect(content).toContainElement(screen.getByRole('slider', { name: '기준점' }))

		await user.click(screen.getByRole('button', { name: 'Background' }))
		await waitFor(() => expect(content).toHaveStyle({ height: '0px', opacity: '0' }))
	})
})

function createImageConfig(): ImageStudioConfig {
	return {
		studio: 'image',
		artifacts: { raster: {} },
		id: 3,
		version: 1,
		name: '첫 프로파일',
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
							defaultValue: '',
							maxLength: 250,
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
							options: [
								{ value: '1:1', label: '1:1' },
								{ value: '4:3', label: '4:3' },
							],
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
			slug: 'first-profile',
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
