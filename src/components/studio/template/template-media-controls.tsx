'use client'

import { type ReactNode, useEffect } from 'react'
import { Controller } from '@/components/shared/controller'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { GraphicEditingControls } from '@/components/studio/graphic/graphic-editing-controls'
import { graphicProfileCard } from '@/components/studio/graphic/graphic-profile-picker'
import { ImageColor, ImageGenerate } from '@/components/studio/image/image-controls'
import { imageProfileCard } from '@/components/studio/image/image-profile-picker'
import { ControlPanel } from '@/components/studio/shared/control-panel'
import { StudioProfileCards } from '@/components/studio/shared/studio-profile-cards'
import {
	IMAGE_TRANSFORM_DEFAULT,
	ImageTransformControl,
} from '@/components/studio/template/image-transform-control'
import { SampleImagePicker } from '@/components/studio/template/sample-image-picker'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { acceptsImagePromptExecution } from '@/features/image-generation/domain/image-studio-config'
import type { TemplateImageSlotState } from '@/features/template-customization/contexts/template-studio-context'
import { resolveTemplateImageColorControls } from '@/features/template-customization/domain/image-colorize'
import {
	partitionTemplateSlots,
	type ResolvedTemplateImageConfig,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { SampleImageOption } from '@/features/template-customization/services/list-sample-images.client'
import type {
	ControllerControlDefinition,
	ControllerControlValue,
	ControllerRuntimeBindings,
} from '@/modules/studio-controller/controller-definition'

/** 배경과 독립 그래픽은 같은 편집 컨트롤을 사용한다. */
export function TemplateGraphicControls() {
	const { background } = useTemplateStudio()
	const config = background.graphicConfigs.find(
		(item) => item.id === background.state.graphicConfigId,
	)
	// 배경 Dimming은 패널 컴포지션이 고정 자리에 세운다(docs/10 §3.7).
	if (!config) return <ControlPanel />
	return (
		<GraphicEditingControls
			config={config}
			storedValues={background.state.graphicValues}
			bindings={background.graphicBindings}
			onChange={background.updateGraphic}
		/>
	)
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

const IMAGE_DIMMER = {
	id: 'image.dimmer',
	kind: 'toggle',
	label: 'Use',
	defaultValue: false,
} as const satisfies ControllerControlDefinition
const IMAGE_DIMMER_OPACITY = {
	id: 'image.dimmerOpacity',
	kind: 'range',
	label: 'Strength',
	defaultValue: 0.2,
	min: 0,
	max: 0.7,
	step: 0.01,
	display: { precision: 2 },
} as const satisfies ControllerControlDefinition

/** 이미지 슬롯의 Dimming(Figma 529:27139). 배경 Dimming과 같은 모양이고, 값은 슬롯 세션이 소유한다. */
function ImageSlotDimmer({ target }: { target: ImageTarget }) {
	const dimmer = target.state.dimmer ?? IMAGE_DIMMER.defaultValue
	const opacity = target.state.dimmerOpacity ?? IMAGE_DIMMER_OPACITY.defaultValue
	return (
		<Controller.Group title="Dimming">
			<ControllerControlRenderer
				definition={IMAGE_DIMMER}
				value={dimmer}
				onChange={(next) => {
					// 화면에 보이는 기본 강도를 함께 싣는다 — 합성은 기본값을 모른다.
					if (typeof next === 'boolean')
						target.onDimmer({ dimmer: next, dimmerOpacity: opacity })
				}}
			/>
			{dimmer && (
				<ControllerControlRenderer
					definition={IMAGE_DIMMER_OPACITY}
					value={opacity}
					onChange={(next) => {
						if (typeof next === 'number') target.onDimmer({ dimmerOpacity: next })
					}}
				/>
			)}
		</Controller.Group>
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
	transform?: ReactNode
}

/** 생성 API·비율·장수는 Template 계약을 유지하고 Image의 표현 컴포넌트만 공유한다. */
export function TemplateImageControls({
	background: isBackground = false,
}: {
	background?: boolean
}) {
	const { config, images, background, layers, sampleImages } = useTemplateStudio()
	useEffect(() => {
		sampleImages.load()
	}, [sampleImages.load])
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
						transform: slot.transform.enabled ? (
							<Controller.Group
								title="Image Transform"
								collapsible
								disabled={readonly || !state.image}
							>
								<ImageTransformControl
									value={state.transform ?? IMAGE_TRANSFORM_DEFAULT}
									disabled={readonly || !state.image}
									limits={slot.transform.limits}
									aspectRatio={
										slot.box.width && slot.box.height
											? slot.box.width / slot.box.height
											: undefined
									}
									onChange={(transform) => images.update(slot.id, { transform })}
								/>
							</Controller.Group>
						) : undefined,
					},
				]
			})
	const target = targets[0]
	if (!target) return null
	const contract = target.contracts.find((item) => item.config.id === target.state.profileId)
	const generating =
		target.state.imageMode === 'generate' && !target.readonly && Boolean(contract)
	const sample = target.state.image?.kind === 'sample' ? target.state.image : undefined
	const generate = generating && (
		<Controller.Group title="Generate">
			<Button
				variant="muted"
				className="h-11 w-full rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15"
				disabled={
					target.state.generating ||
					!contract ||
					!acceptsImagePromptExecution(contract.prompt, target.state.prompt)
				}
				onClick={target.onGenerate}
			>
				{target.state.generating ? '생성 중…' : '이미지 생성'}
			</Button>
		</Controller.Group>
	)
	const list =
		!target.readonly && sampleImages.data?.length ? (
			<SampleImagePicker
				inline
				selectedId={sample?.sampleImageId}
				onSelect={target.onSample}
			/>
		) : undefined
	return (
		<ControlPanel
			// 배경의 Dimming은 패널 컴포지션이 고정 자리에 세운다 — 여기서는 생성 버튼만 그 뒤에 잇는다.
			// 이미지 슬롯은 아직 이 화면이 고정 카드를 직접 꽂는다(이행 4단계).
			fixed={
				isBackground ? undefined : !target.readonly || generate ? (
					<Controller.GroupList>
						{/* 슬롯 Dimming은 방식과 무관하게 선다 — 배경 Dimming과 같다(2026-10-02 결정). */}
						{!target.readonly && <ImageSlotDimmer target={target} />}
						{generate}
					</Controller.GroupList>
				) : undefined
			}
			extras={isBackground ? { fixed: generate } : undefined}
			basicPresets={!generating ? list : undefined}
			basic={
				generating ? (
					<ImageDetail target={target} />
				) : target.state.imageMode === 'generate' && !contract ? (
					<Typography size="sm" tone="muted">
						사용 가능한 이미지 생성 프로파일이 없습니다.
					</Typography>
				) : undefined
			}
			presets={generating ? list : undefined}
			adjustment={
				target.transform ||
				(contract && resolveTemplateImageColorControls(target.state, contract.config)) ? (
					<div className="flex flex-col gap-3">
						<ImagePrimary target={target} />
						{target.transform}
					</div>
				) : undefined
			}
		/>
	)
}

function ImagePrimary({ target }: { target: ImageTarget }) {
	const { state } = target
	const contract = target.contracts.find((item) => item.config.id === state.profileId)
	const definitions = contract ? resolveTemplateImageColorControls(state, contract.config) : null
	const foreground = definitions && state.featureValues[definitions.line.id]
	const background = definitions?.background && state.featureValues[definitions.background.id]
	const value =
		typeof foreground === 'string'
			? { line: foreground, ...(typeof background === 'string' ? { background } : {}) }
			: null
	return (
		<>
			{contract && definitions && (
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
							if (patch.line !== undefined)
								target.onFeature(definitions.line.id, patch.line)
							if (patch.background !== undefined && definitions.background)
								target.onFeature(definitions.background.id, patch.background)
						},
					}}
				/>
			)}
		</>
	)
}

function ImageDetail({ target }: { target: ImageTarget }) {
	const { state } = target
	const contract = target.contracts.find((item) => item.config.id === state.profileId)
	return (
		<>
			{(state.imageMode === 'generate' || target.readonly) && (
				<ImageGenerate
					prompt={contract?.prompt}
					value={state.prompt}
					binding={target.readonly ? { availability: 'readonly' } : undefined}
					onChange={(value) => {
						if (typeof value === 'string') target.onPrompt(value)
					}}
					error={state.error}
				/>
			)}
		</>
	)
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
