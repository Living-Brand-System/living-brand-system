'use client'

import { Controller } from '@/components/shared/controller'
import { buildGraphicPanelComposition } from '@/components/studio/graphic/graphic-editing-controls'
import { graphicProfileCard } from '@/components/studio/graphic/graphic-profile-picker'
import { ImageColor } from '@/components/studio/image/image-controls'
import { imageProfileCard } from '@/components/studio/image/image-profile-picker'
import type {
	ControllerWidgetProps,
	ControllerWidgetRegistry,
} from '@/components/studio/panel/studio-panel-slot'
import { StudioProfileCards } from '@/components/studio/shared/studio-profile-cards'
import {
	IMAGE_TRANSFORM_DEFAULT,
	ImageTransformControl,
} from '@/components/studio/template/image-transform-control'
import { SampleImagePicker } from '@/components/studio/template/sample-image-picker'
import type { TemplateTargetPanel } from '@/components/studio/template/template-panel'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { acceptsImagePromptExecution } from '@/features/image-generation/domain/image-studio-config'
import type {
	TemplateImageSlotState,
	TemplateStudioValue,
} from '@/features/template-customization/contexts/template-studio-context'
import { resolveTemplateImageColorControls } from '@/features/template-customization/domain/image-colorize'
import {
	deriveTemplateImageComposition,
	TEMPLATE_IMAGE_DIMMER,
	TEMPLATE_IMAGE_DIMMER_STRENGTH,
	TEMPLATE_IMAGE_IDS,
} from '@/features/template-customization/domain/template-image-composition'
import {
	partitionTemplateSlots,
	type ResolvedTemplateImageConfig,
	type TemplateImageConfigSlot,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { SampleImageOption } from '@/features/template-customization/services/list-sample-images.client'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlValue,
	ControllerRuntimeBindings,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

/** 배경 그래픽의 패널 — 독립 Graphic과 같은 빌더다. 그래픽이 없으면 배경 공통(Dimming·색)만 선다. */
export function buildTemplateGraphicPanel({
	background,
}: TemplateStudioValue): TemplateTargetPanel {
	const config = background.graphicConfigs.find(
		(item) => item.id === background.state.graphicConfigId,
	)
	return {
		composition: config
			? buildGraphicPanelComposition({
					config,
					storedValues: background.state.graphicValues,
					bindings: background.graphicBindings,
					onChange: background.updateGraphic,
				})
			: null,
	}
}

/** 그래픽 변경 — 독립 Graphic 스튜디오와 같은 카드 그리드다. */
export function TemplateGraphicSelection() {
	const { background } = useTemplateStudio()
	return (
		<StudioProfileCards
			slot="graphic-profile-picker"
			cards={background.graphicConfigs.map(graphicProfileCard)}
			currentId={background.state.graphicConfigId}
			empty="사용 가능한 그래픽이 없습니다."
			onSelect={(id) => background.selectGraphicConfig(String(id))}
		/>
	)
}

type ImageTarget = {
	id: string
	label: string
	state: TemplateImageSlotState
	contracts: readonly ResolvedTemplateImageConfig[]
	readonly: boolean
	pinned: boolean
	bindings: ControllerRuntimeBindings
	onProfile: (id: number) => void
	onPrompt: (value: string) => void
	onDimmer: (patch: { dimmer?: boolean; dimmerOpacity?: number }) => void
	onFeature: (id: string, value: ControllerControlValue) => void
	onSample: (option: SampleImageOption) => void
	onGenerate: () => void
	/** 슬롯 방식(Preset/Generate) — 배경 방식은 배경 컴포지션이 갖는다(없음). */
	onMode?: (mode: 'preset' | 'generate') => void
	/** 슬롯 Transform — 배경에는 없다. */
	transform?: {
		limits: TemplateImageConfigSlot['transform']['limits']
		aspectRatio?: number
		onChange: (transform: NonNullable<TemplateImageSlotState['transform']>) => void
	}
}

/**
 * 이미지 대상 패널의 배치 정책(docs/10 §3.7) — 생성 중인지가 정한다(Figma 529:26114·529:27139). 고를 것뿐이면
 * 샘플 목록이 Basic 위 목록 카드이고, 생성 입력이 Basic을 차지하면 Presets 탭으로 비킨다.
 * 🔑 자리는 패널의 몫이라 매니페스트가 아니라 정책이 방식을 본다.
 */
export function templateImagePanelPolicy(generating: boolean): StudioPanelPolicy {
	return generating
		? {
				settings: ['source'],
				fixed: ['overlay'],
				basic: ['content'],
				presets: ['preset'],
				adjustment: ['palette', 'placement'],
			}
		: {
				settings: ['source'],
				fixed: ['overlay'],
				basicPresets: ['preset'],
				adjustment: ['palette', 'placement'],
			}
}

// 생성 그룹은 접지 않는다 — 프롬프트가 이 방식의 주 입력이다.
const TEMPLATE_IMAGE_PRESENTATION = {
	groups: [{ groupId: 'generate', collapsible: false, defaultOpen: true }],
}

/**
 * 이미지 묶음 위젯은 편집 대상(슬롯·배경) 하나를 본다 — 컴포지션의 `scope`로 받는다.
 * 본문(샘플·색·Transform)의 값은 대상 세션이 갖는다.
 */
function imageTarget(scope: unknown): ImageTarget {
	if (!scope)
		throw new Error('이미지 위젯은 템플릿 이미지 컴포지션(scope = 대상) 안에서만 그린다.')
	return scope as ImageTarget
}

function SamplesWidget({ scope }: ControllerWidgetProps) {
	const target = imageTarget(scope)
	const sample = target.state.image?.kind === 'sample' ? target.state.image : undefined
	return (
		<SampleImagePicker inline selectedId={sample?.sampleImageId} onSelect={target.onSample} />
	)
}

function ColorWidget({ scope }: ControllerWidgetProps) {
	const target = imageTarget(scope)
	const { state } = target
	const contract = target.contracts.find((item) => item.config.id === state.profileId)
	const definitions = contract ? resolveTemplateImageColorControls(state, contract.config) : null
	if (!contract || !definitions) return null
	const foreground = state.featureValues[definitions.line.id]
	const background = definitions.background && state.featureValues[definitions.background.id]
	const value =
		typeof foreground === 'string'
			? { line: foreground, ...(typeof background === 'string' ? { background } : {}) }
			: null
	return (
		<ImageColor
			key={contract.config.id}
			config={contract.config}
			controls={{
				values: state.featureValues,
				bindings: target.bindings,
				update: target.onFeature,
			}}
			color={{
				value,
				update: (patch) => {
					if (patch.line !== undefined) target.onFeature(definitions.line.id, patch.line)
					if (patch.background !== undefined && definitions.background)
						target.onFeature(definitions.background.id, patch.background)
				},
			}}
		/>
	)
}

/** 생성 전에는 닫힌 채 잠긴다 — compose가 배정된 이미지에만 transform을 적용해서다. */
function TransformWidget({ cluster, scope }: ControllerWidgetProps) {
	const target = imageTarget(scope)
	if (!target.transform) return null
	const disabled = target.readonly || !target.state.image
	return (
		<Controller.Group title={cluster.title} collapsible disabled={disabled}>
			<ImageTransformControl
				value={target.state.transform ?? IMAGE_TRANSFORM_DEFAULT}
				disabled={disabled}
				limits={target.transform.limits}
				aspectRatio={target.transform.aspectRatio}
				onChange={target.transform.onChange}
			/>
		</Controller.Group>
	)
}

const TEMPLATE_IMAGE_WIDGETS: ControllerWidgetRegistry = {
	'asset-browser': SamplesWidget,
	'color-pair': ColorWidget,
	transform: TransformWidget,
}

/** 지금 편집하는 이미지 대상 — 선택한 이미지 슬롯, 또는 배경(이미지 방식). 없으면 `null`. */
function templateImageTarget(
	{ config, images, background, layers }: TemplateStudioValue,
	isBackground: boolean,
): ImageTarget | null {
	const targets: ImageTarget[] = isBackground
		? [
				{
					id: 'background',
					label: 'Background',
					state: background.state,
					contracts: background.contracts,
					readonly: false,
					pinned: false,
					bindings: background.featureBindings,
					onProfile: background.selectImageProfile,
					onPrompt: (prompt) => background.update({ prompt }),
					onDimmer: background.update,
					onFeature: background.updateFeature,
					onSample: background.selectSampleImage,
					onGenerate: background.generate,
				},
			]
		: partitionTemplateSlots(config.template.slots).image.flatMap((slot, index, slots) => {
				const state = images.states[slot.id]
				if (slot.id !== layers.selectedId) return []
				if (!state) return []
				const readonly = slot.access === 'readonly'
				const contracts = images.contracts[slot.id] ?? []
				const bindings: ControllerRuntimeBindings = readonly
					? Object.fromEntries(
							contracts.flatMap((contract) =>
								contract.config.controller.groups.flatMap((group) =>
									group.controls.map(({ id }) => [
										id,
										{ availability: 'readonly' as const },
									]),
								),
							),
						)
					: {}
				return [
					{
						id: slot.id,
						label: slots.length > 1 ? `Image ${index + 1}` : 'Image',
						state,
						contracts,
						readonly,
						pinned: slot.imageConfig.mode === 'pinned',
						bindings,
						onProfile: (id: number) => images.selectProfile(slot.id, id),
						onPrompt: (prompt: string) => images.update(slot.id, { prompt }),
						onDimmer: (patch) => images.update(slot.id, patch),
						onFeature: (id: string, next: ControllerControlValue) =>
							images.updateFeature(slot.id, id, next),
						onSample: (option: SampleImageOption) =>
							images.selectSampleImage(slot.id, option),
						onGenerate: () => images.generate(slot.id),
						onMode: (imageMode: 'preset' | 'generate') =>
							images.update(slot.id, { imageMode }),
						...(slot.transform.enabled
							? {
									transform: {
										limits: slot.transform.limits,
										// 패드는 대상 슬롯 박스와 같은 비율로 그려진다(디자인 Wide/Portrait/Square).
										aspectRatio:
											slot.box.width && slot.box.height
												? slot.box.width / slot.box.height
												: undefined,
										onChange: (transform) =>
											images.update(slot.id, { transform }),
									},
								}
							: {}),
					},
				]
			})
	return targets[0] ?? null
}

/**
 * 이미지 슬롯·배경 이미지의 패널 — 생성 API·비율·장수는 Template 계약을 유지하고 Image의 표현 컴포넌트만 공유한다.
 * 순수(훅 없음) — 샘플 목록 불러오기는 패널 훅(`useTemplatePanel`)이 한다.
 */
export function buildTemplateImagePanel(
	studio: TemplateStudioValue,
	isBackground: boolean,
): TemplateTargetPanel {
	const target = templateImageTarget(studio, isBackground)
	if (!target) return { composition: null }
	const { sampleImages } = studio
	const { state } = target
	const contract = target.contracts.find((item) => item.config.id === state.profileId)
	const generating = state.imageMode === 'generate' && !target.readonly && Boolean(contract)
	const manifest = deriveTemplateImageComposition({
		contract,
		colors: contract ? resolveTemplateImageColorControls(state, contract.config) : null,
		readonly: target.readonly,
		// 배경 Dimming은 배경 컴포지션이 고정 자리에 세운다 — 슬롯만 자기 Dimming을 갖는다.
		dimmer: !isBackground,
		// 슬롯 방식은 왼쪽 설정 카드가 이 컴포지션으로 그린다. 배경 방식은 배경 컴포지션이 갖는다.
		modeInSettings: Boolean(target.onMode) && !target.readonly,
		samples: Boolean(sampleImages.data?.length),
		transform: Boolean(target.transform),
	})
	const dimmerOpacity = state.dimmerOpacity ?? TEMPLATE_IMAGE_DIMMER_STRENGTH.defaultValue
	const values: ControllerValues = {
		...state.featureValues,
		[TEMPLATE_IMAGE_IDS.mode]: state.imageMode,
		[TEMPLATE_IMAGE_IDS.dimmer]: state.dimmer ?? TEMPLATE_IMAGE_DIMMER.defaultValue,
		[TEMPLATE_IMAGE_IDS.strength]: dimmerOpacity,
		...(contract ? { [contract.prompt.id]: state.prompt } : {}),
	}
	const onChange = (id: string, next: ControllerControlValue) => {
		// 화면에 보이는 기본 강도를 함께 싣는다 — 합성은 기본값을 모른다.
		if (id === TEMPLATE_IMAGE_IDS.dimmer && typeof next === 'boolean')
			target.onDimmer({ dimmer: next, dimmerOpacity })
		else if (id === TEMPLATE_IMAGE_IDS.strength && typeof next === 'number')
			target.onDimmer({ dimmerOpacity: next })
		else if (id === contract?.prompt.id && typeof next === 'string') target.onPrompt(next)
		else if (id === TEMPLATE_IMAGE_IDS.mode) {
			if (next === 'preset' || next === 'generate') target.onMode?.(next)
		} else target.onFeature(id, next)
	}
	const status =
		generating && state.error ? (
			<Typography role="alert" size="sm" className="text-destructive">
				{state.error}
			</Typography>
		) : state.imageMode === 'generate' && !contract ? (
			<Typography size="sm" tone="muted">
				사용 가능한 이미지 생성 프로파일이 없습니다.
			</Typography>
		) : undefined
	return {
		composition: {
			slots: arrangeStudioPanel(manifest, templateImagePanelPolicy(generating), values),
			values,
			bindings: target.bindings,
			presentation: TEMPLATE_IMAGE_PRESENTATION,
			widgets: TEMPLATE_IMAGE_WIDGETS,
			scope: target,
			onChange,
		},
		extras: {
			// 생성은 셸 액션이라 계약 밖이다 — Dimming 뒤에 같은 목록으로 잇는다.
			fixed: generating && contract && (
				<Controller.Group title="Generate">
					<Button
						variant="muted"
						className="h-11 w-full rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15"
						disabled={
							state.generating ||
							!acceptsImagePromptExecution(contract.prompt, state.prompt)
						}
						onClick={target.onGenerate}
					>
						{state.generating ? '생성 중…' : '이미지 생성'}
					</Button>
				</Controller.Group>
			),
			basic: status,
		},
	}
}

/** 왼쪽 카테고리 카드는 기존 슬롯 프로파일 계약과 선택 동작을 그대로 사용한다. */
export function TemplateImageSelection() {
	const { config, layers, images, background } = useTemplateStudio()
	const selected = config.template.slots.find((slot) => slot.id === layers.selectedId)
	const targets =
		selected?.kind === 'background'
			? [
					{
						id: 'background',
						label: 'Image',
						state: background.state,
						contracts: background.contracts,
						pinned: false,
						readonly: false,
						onProfile: background.selectImageProfile,
					},
				]
			: partitionTemplateSlots(config.template.slots).image.flatMap((slot) => {
					const state = images.states[slot.id]
					if (slot.id !== layers.selectedId) return []
					return state
						? [
								{
									id: slot.id,
									label: slot.label,
									state,
									contracts: images.contracts[slot.id] ?? [],
									pinned: slot.imageConfig.mode === 'pinned',
									readonly: slot.access === 'readonly',
									onProfile: (id: number) => images.selectProfile(slot.id, id),
								},
							]
						: []
				})
	return targets.map((target) => (
		<StudioProfileCards
			key={target.id}
			slot="image-profile-picker"
			cards={target.contracts.map(({ config }) => imageProfileCard(config))}
			currentId={target.state.profileId}
			disabled={target.pinned || target.readonly || target.state.generating}
			empty="사용 가능한 프로파일이 없습니다."
			onSelect={(id) => target.onProfile(Number(id))}
		/>
	))
}
