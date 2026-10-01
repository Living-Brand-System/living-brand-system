'use client'

import { useState } from 'react'
import { Controller } from '@/components/shared/controller'
import type { ControllerGroupSectionProps } from '@/components/shared/controller/group'
import {
	ControllerControlRenderer,
	ControllerGroupRenderer,
	ControllerRenderer,
} from '@/components/shared/controller-renderer'
import { ImageProfileFeatureRenderer } from '@/components/studio/image/image-profile-feature-renderer'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { acceptsImagePromptExecution } from '@/features/image-generation/domain/image-studio-config'
import type { ResolvedTemplateImageConfig } from '@/features/template-customization/domain/template-studio-config'
import type {
	TemplateBackgroundPatch,
	TemplateBackgroundState,
} from '@/features/template-customization/hooks/use-template-studio'
import type { SampleImageOption } from '@/features/template-customization/services/list-sample-images.client'
import type {
	ControllerControlDefinition,
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerGroupPresentation,
	ControllerRuntimeBindings,
} from '@/modules/studio-controller/controller-definition'
import { visibleControllerGroups } from '@/modules/studio-controller/controller-definition'
import {
	IMAGE_TRANSFORM_DEFAULT,
	ImageTransformControl,
	type ImageTransformValue,
} from './image-transform-control'
import { SampleImagePicker } from './sample-image-picker'

type BackgroundSectionProps = {
	content?: 'all' | 'settings' | 'controls'
	/** 섹션 활성화 배선 — `Controller.Group`이 계약을 갖는다. */
	section?: ControllerGroupSectionProps
	groupDefinition: ControllerGroupDefinition
	groupPresentation?: ControllerGroupPresentation
	/** Template의 공통 Controller Definition — availability와 options를 그대로 소비한다. */
	typeDefinition: Extract<ControllerControlDefinition, { kind: 'select' }>
	colorDefinition: Extract<ControllerControlDefinition, { kind: 'color' }>
	/** 배경 위 디머 — 형식 분기 밖에 있다. 어드민 정책이 끄면 매니페스트에서 빠져 undefined다. */
	dimmerDefinition?: Extract<ControllerControlDefinition, { kind: 'toggle' }>
	dimmerOpacityDefinition?: Extract<ControllerControlDefinition, { kind: 'range' }>
	/** 템플릿 캔버스 종횡비(w/h) — 배경 transform 패드가 같은 비율로 그려진다. */
	canvasAspectRatio?: number
	/** Image Config를 캔버스 비율로 제한한 슬롯 범위 계약. */
	imageContracts: readonly ResolvedTemplateImageConfig[]
	featureBindings: ControllerRuntimeBindings
	graphicConfigs: readonly GraphicStudioConfig[]
	graphicBindings: ControllerRuntimeBindings
	/** 배경 세션 상태 — 소유는 Provider(합성에 싣는다). */
	value: TemplateBackgroundState
	onChange: (patch: TemplateBackgroundPatch) => void
	onColorChange: (value: ControllerControlValue) => void
	onTypeChange: (value: ControllerControlValue) => void
	onFeatureChange: (controlId: string, value: ControllerControlValue) => void
	onImageProfileChange: (profileId: number) => void
	/** Preset으로 고른 샘플 이미지 — 목록 자원은 피커가 컨텍스트에서 읽는다. */
	onSelectSampleImage: (option: SampleImageOption) => void
	onGraphicConfigChange: (configId: string) => void
	onGraphicChange: (controlId: string, value: ControllerControlValue) => void
	onGenerate: () => void
}

/**
 * 디자인 SSOT(2:2071 Sidebar State)의 Background 상태 분기 — Type이 하위 컨트롤 세트를 갈아끼운다.
 * Color: 배경색 / Image: Preset(샘플 이미지 선택)·Generate(프롬프트 생성) + Image Transform /
 * Graphic: Graphic Config 선택 + 해당 Config의 공통 Controller Definition.
 *
 * 값·프롬프트·생성 중·실패와 HTTP는 Provider가 슬롯 단위로 소유한다. Graphic은 순수 SVG adapter로 compose하고,
 * 경로가 없는 배경 이미지 feature 색 행·Image Transform만 잠가 스테이징한다.
 */
export function BackgroundSection({
	content = 'all',
	section,
	groupDefinition,
	groupPresentation,
	typeDefinition,
	colorDefinition,
	dimmerDefinition,
	dimmerOpacityDefinition,
	canvasAspectRatio,
	imageContracts,
	featureBindings,
	graphicConfigs,
	graphicBindings,
	value,
	onChange,
	onColorChange,
	onTypeChange,
	onFeatureChange,
	onImageProfileChange,
	onSelectSampleImage,
	onGraphicConfigChange,
	onGraphicChange,
	onGenerate,
}: BackgroundSectionProps) {
	const { type, imageMode } = value
	const [imageTransform, setImageTransform] =
		useState<ImageTransformValue>(IMAGE_TRANSFORM_DEFAULT)
	const selectedSample = value.image?.kind === 'sample' ? value.image : undefined
	const imageContract = imageContracts.find((contract) => contract.config.id === value.profileId)
	const graphicConfig = graphicConfigs.find((candidate) => candidate.id === value.graphicConfigId)
	// 🔴 창작자에게 보이는 축만 그린다. 통째로 넘기면 Graphic 스튜디오에서 내린 admin 전용 축까지
	//    여기서만 되살아나, 같은 런타임이 화면마다 다른 축 수를 보여준다.
	//    Template에는 좌측 패널이 없으므로 좌·우를 한 자리에 이어 그린다.
	const visibleGraphicGroups = graphicConfig
		? visibleControllerGroups(
				graphicConfig.controller.groups,
				graphicConfig.controller.left,
				graphicConfig.controller.right,
			)
		: []

	const invalidPrompt = imageContract
		? !acceptsImagePromptExecution(imageContract.prompt, value.prompt)
		: true
	const settings = (
		<>
			<ControllerControlRenderer
				definition={typeDefinition}
				value={type}
				onChange={onTypeChange}
			/>
			{type === 'image' && (
				<Controller.Row label={content === 'all' ? 'Image Type' : 'Image Mode'}>
					<Controller.Segmented
						aria-label="배경 이미지 방식"
						options={[
							{ value: 'preset', label: 'Preset' },
							{ value: 'generate', label: 'Generate' },
						]}
						value={imageMode}
						onChange={(next) => onChange({ imageMode: next })}
					/>
				</Controller.Row>
			)}
		</>
	)
	if (content === 'settings') return settings
	return (
		<ControllerGroupRenderer
			definition={groupDefinition}
			presentation={groupPresentation}
			section={section}
		>
			{content === 'all' && settings}

			{type === 'color' && (
				<ControllerControlRenderer
					definition={colorDefinition}
					value={value.color}
					onChange={onColorChange}
				/>
			)}

			{type === 'image' && (
				<>
					<Controller.TabPanel tabKey={imageMode}>
						{imageMode === 'preset' ? (
							<Controller.AssetCard
								title={selectedSample?.name ?? '이미지를 선택하세요'}
								subtitle="Sample Image"
								buttonLabel="Browse"
								aria-label="샘플 이미지 선택"
								tabs={['Sample Images']}
								previewImage={
									selectedSample && {
										url: selectedSample.thumbnailUrl,
										alt: selectedSample.alt,
									}
								}
							>
								<SampleImagePicker
									selectedId={selectedSample?.sampleImageId}
									onSelect={onSelectSampleImage}
								/>
							</Controller.AssetCard>
						) : (
							<>
								<Controller.Row label="Image Profile">
									<Controller.Select
										options={imageContracts.map(({ config }) => ({
											value: String(config.id),
											label: config.name,
										}))}
										value={
											value.profileId === undefined
												? undefined
												: String(value.profileId)
										}
										onChange={(next) => onImageProfileChange(Number(next))}
										placeholder="사용 가능한 프로파일 없음"
										disabled={value.generating || imageContracts.length === 0}
									/>
								</Controller.Row>
								{imageContract && (
									<>
										{/* 🔴 맨몸 행이 접히는 그룹보다 앞에 온다 — 이미지 슬롯과 같은 이유다. */}
										<ControllerControlRenderer
											definition={imageContract.prompt}
											value={value.prompt}
											onChange={(next) => {
												if (typeof next === 'string')
													onChange({ prompt: next })
											}}
										/>
										<ControllerControlRenderer
											definition={imageContract.ratio}
											value={imageContract.ratio.defaultValue}
											onChange={() => {}}
										/>
										<ImageProfileFeatureRenderer
											config={imageContract.config}
											values={value.featureValues}
											bindings={featureBindings}
											attached
											onChange={onFeatureChange}
										/>
									</>
								)}
								<Button
									type="button"
									variant="muted"
									className="mt-0.5 h-11 w-full text-sm font-semibold"
									onClick={onGenerate}
									disabled={value.generating || invalidPrompt}
								>
									{value.generating ? '생성 중…' : '이미지 생성'}
								</Button>
								{value.error && <FieldError>{value.error}</FieldError>}
							</>
						)}
					</Controller.TabPanel>
					{/* Image Transform은 compose 경로가 없어 잠근 채, 대상인 Background 안에서 그린다. */}
					<Controller.Group title="Image Transform" collapsible attached disabled>
						<ImageTransformControl
							value={imageTransform}
							aspectRatio={canvasAspectRatio}
							onChange={setImageTransform}
						/>
					</Controller.Group>
				</>
			)}

			{type === 'graphic' && (
				<>
					<Controller.Row label="Graphic Type">
						<Controller.Select
							options={graphicConfigs.map((config) => ({
								value: config.id,
								label: config.name,
							}))}
							value={value.graphicConfigId}
							onChange={onGraphicConfigChange}
							placeholder="사용 가능한 그래픽 없음"
							disabled={graphicConfigs.length === 0}
						/>
					</Controller.Row>
					{/* 선택한 Graphic의 그룹은 Background에 종속된다 — Background를 접으면 함께 닫힌다. */}
					{graphicConfig && (
						<ControllerRenderer
							className="py-1.5"
							groups={visibleGraphicGroups}
							presentation={graphicConfig.controllerPresentation}
							values={value.graphicValues}
							bindings={graphicBindings}
							onChange={onGraphicChange}
						/>
					)}
				</>
			)}

			{/* 형식 분기 밖 — 색·이미지·그래픽 어디서든 배경이 글자를 삼킬 수 있다. */}
			{dimmerDefinition && (
				<ControllerControlRenderer
					definition={dimmerDefinition}
					value={value.dimmer}
					onChange={(next) => {
						if (typeof next === 'boolean') onChange({ dimmer: next })
					}}
				/>
			)}
			{/* 꺼져 있을 때는 그리지 않는다 — 움직여도 화면이 안 바뀌는 슬라이더를 남기지 않는다. */}
			{value.dimmer && dimmerOpacityDefinition && (
				<ControllerControlRenderer
					definition={dimmerOpacityDefinition}
					value={value.dimmerOpacity}
					onChange={(next) => {
						if (typeof next === 'number') onChange({ dimmerOpacity: next })
					}}
				/>
			)}
		</ControllerGroupRenderer>
	)
}
