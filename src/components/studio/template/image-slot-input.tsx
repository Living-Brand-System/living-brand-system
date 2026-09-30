'use client'

import { ChevronDown } from '@carbon/icons-react'
import { Controller } from '@/components/shared/controller'
import type { ControllerGroupSectionProps } from '@/components/shared/controller/group'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { ImageProfileFeatureRenderer } from '@/components/studio/image/image-profile-feature-renderer'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { acceptsImagePromptExecution } from '@/features/image-generation/domain/image-studio-config'
import { resolveTemplateImageColorControls } from '@/features/template-customization/domain/image-colorize'
import type { ResolvedTemplateImageConfig } from '@/features/template-customization/domain/template-studio-config'
import type { TemplateImageSlotState } from '@/features/template-customization/hooks/use-template-studio'
import type { SampleImageOption } from '@/features/template-customization/services/list-sample-images.client'
import type { ControllerControlValue } from '@/modules/studio-controller/controller-definition'
import { SampleImagePicker } from './sample-image-picker'

type ImageSlotInputProps = {
	pinned: boolean
	readonly?: boolean
	contracts: readonly ResolvedTemplateImageConfig[]
	value: TemplateImageSlotState
	onFeatureChange: (controlId: string, value: ControllerControlValue) => void
	onProfileChange: (profileId: number) => void
	onPromptChange: (prompt: string) => void
	/** Preset·Generate 전환 — 상태는 배경과 같이 Provider가 슬롯 단위로 소유한다. */
	onImageModeChange: (mode: 'preset' | 'generate') => void
	onSelectSampleImage: (option: SampleImageOption) => void
	onGenerate: () => void
	/** 하위 프로파일 섹션도 「chevron만 토글」 규칙을 따르게 한다 — 슬롯 그룹이 그 규칙을 켠다. */
	section?: ControllerGroupSectionProps
}

/**
 * Template 이미지 슬롯의 표현 컴포넌트. Profile 계약과 슬롯 상태는 Provider가 주며,
 * 이 컴포넌트는 HTTP나 생성 상태를 직접 소유하지 않는다.
 */
export function ImageSlotInput({
	pinned,
	readonly = false,
	contracts,
	value,
	onFeatureChange,
	onProfileChange,
	onPromptChange,
	onImageModeChange,
	onSelectSampleImage,
	onGenerate,
	section,
}: ImageSlotInputProps) {
	const selected = contracts.find((contract) => contract.config.id === value.profileId)
	const invalidPrompt = selected
		? !acceptsImagePromptExecution(selected.prompt, value.prompt)
		: true
	const selectedSample = value.image?.kind === 'sample' ? value.image : undefined
	// 샘플에는 프로파일 선택·프롬프트가 없지만 색 치환은 선화라면 뜻이 있다 — 판정은 도메인이 소유한다.
	const colorControls = selected
		? resolveTemplateImageColorControls(value, selected.config)
		: null
	// readonly는 전환 트리거가 없으므로 기존 화면(잠긴 생성 폼)을 그대로 본다.
	const mode = readonly ? 'generate' : value.imageMode

	return (
		<div data-slot="image-slot-input" className="flex flex-col gap-1">
			{!readonly && (
				<Controller.Row label="Image Type">
					<Controller.Segmented
						aria-label="슬롯 이미지 방식"
						options={[
							{ value: 'preset', label: 'Preset' },
							{ value: 'generate', label: 'Generate' },
						]}
						value={value.imageMode}
						onChange={onImageModeChange}
					/>
				</Controller.Row>
			)}
			<Controller.TabPanel tabKey={mode}>
				{mode === 'preset' ? (
					<>
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
						{colorControls &&
							[
								colorControls.line,
								...(colorControls.background ? [colorControls.background] : []),
							].map((definition) => (
								<ControllerControlRenderer
									key={definition.id}
									definition={definition}
									value={
										definition.id in value.featureValues
											? value.featureValues[definition.id]
											: definition.defaultValue
									}
									onChange={(next) => onFeatureChange(definition.id, next)}
								/>
							))}
					</>
				) : (
					<>
						{pinned || readonly ? (
							<Controller.Row label="Type" readonly>
								<span className="flex min-w-0 items-center gap-2">
									<span className="truncate text-sm text-muted-foreground">
										{selected?.config.name ?? '—'}
									</span>
									<ChevronDown
										aria-hidden
										className="size-4 shrink-0 text-muted-foreground"
									/>
								</span>
							</Controller.Row>
						) : (
							<Controller.Row label="Type">
								<Controller.Select
									options={contracts.map(({ config }) => ({
										value: String(config.id),
										label: config.name,
									}))}
									value={
										value.profileId === undefined
											? undefined
											: String(value.profileId)
									}
									onChange={(next) => onProfileChange(Number(next))}
									placeholder="사용 가능한 프로파일 없음"
									disabled={
										readonly || value.generating || contracts.length === 0
									}
								/>
							</Controller.Row>
						)}
						{/*
						 * 🔴 슬롯 자신의 맨몸 행(비율·Prompt)이 **접히는 그룹보다 앞에** 온다.
						 * 뒤에 두면 Profile Settings가 접힌 순간 그 행들이 헤더 밑에 붙어 그룹의
						 * 내용처럼 읽힌다 — 2026-08-24에 사용자가 실제로 그렇게 읽었다.
						 */}
						{selected && (
							<>
								<ControllerControlRenderer
									definition={selected.ratio}
									value={selected.ratio.defaultValue}
									onChange={() => {}}
								/>
								<ControllerControlRenderer
									definition={
										readonly
											? { ...selected.prompt, availability: 'readonly' }
											: selected.prompt
									}
									value={value.prompt}
									onChange={(next) => {
										if (typeof next === 'string') onPromptChange(next)
									}}
								/>
							</>
						)}
						<Button
							type="button"
							variant="muted"
							className="mt-0.5 h-11 w-full text-sm font-semibold"
							onClick={onGenerate}
							disabled={readonly || value.generating || !selected || invalidPrompt}
						>
							{value.generating ? '생성 중…' : '이미지 생성'}
						</Button>
						{value.error && <FieldError>{value.error}</FieldError>}
						{/*
						 * 🔑 색 치환(Profile Settings)은 **생성된 이미지를 마스크로 다시 칠하는 후처리**다
						 * (`compose`의 `applyImageColorize`) — 생성 파라미터가 아니므로 버튼 뒤가 맞다.
						 * 그리고 접히는 그룹 뒤에는 아무 맨몸 요소도 두지 않는다(위 주석과 같은 이유).
						 */}
						{selected && (
							<ImageProfileFeatureRenderer
								config={selected.config}
								values={value.featureValues}
								bindings={
									readonly
										? Object.fromEntries(
												selected.config.controller.groups.flatMap((group) =>
													group.controls.map(({ id }) => [
														id,
														{ availability: 'readonly' },
													]),
												),
											)
										: undefined
								}
								attached
								section={section}
								onChange={onFeatureChange}
							/>
						)}
					</>
				)}
			</Controller.TabPanel>
		</div>
	)
}
