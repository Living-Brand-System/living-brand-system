'use client'

import { toast } from '@payloadcms/ui'
import { type ReactNode, useEffect, useState } from 'react'
import { Controller } from '@/components/shared/controller'
import {
	type ImageProfileOption,
	requestPublishedImageProfiles,
} from '@/features/image-generation/services/generate-image.client'
import type { TemplateLayerAccess, TemplateNodeConfig, TemplateSlotSpec } from '@/types/template'
import { canAssignImage, type LayerRow, toggleAllowedId } from './template-layers'
import { VectorLayerEditor } from './vector-layer-editor'

const ON_OFF = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

function usePublishedImageProfiles() {
	const [profiles, setProfiles] = useState<ImageProfileOption[] | null>(null)
	useEffect(() => {
		void requestPublishedImageProfiles()
			.then(setProfiles)
			.catch(() => {
				setProfiles([])
				toast.error('이미지 프로파일을 불러오지 못했습니다.')
			})
	}, [])
	return profiles
}

/**
 * 레이어 카드 — 디자인 정본 81:2 "Layer Card Variant"의 컨테이너.
 * 안은 스튜디오 컨트롤러 킷(Group·Row·Segmented·Field)의 행 언어를 그대로 쓴다 —
 * 카드 껍데기만 어드민 로컬이고, 스튜디오에서도 쓰이게 되면 킷으로 승격한다.
 */
function LayerCard({ heading, children }: { heading: ReactNode; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-2 rounded-3xl border bg-background px-3 pt-6 pb-3">
			{/* 정본(83:1470) Layer Name 24px — 좌측 8px은 그룹 서브헤더 들여쓰기와 정렬 맞춤. */}
			<h3 className="pb-3 pl-2 font-semibold text-[24px] leading-8">{heading}</h3>
			{children}
		</section>
	)
}

/** 세부 설정 그룹 머리의 우측 타입 태그(디자인의 텍스트·이미지·벡터). */
function layerTypeTag(label: string) {
	return <span className="text-muted-foreground text-xs">{label}</span>
}

function CreatorLayerPolicyEditor({
	access,
	config,
	fallbackName,
	onChange,
}: {
	access: TemplateLayerAccess
	config: TemplateNodeConfig
	/** Admin이 이름을 정하지 않았을 때 실제로 쓰이는 이름 — Figma가 준 `data-name`이다. */
	fallbackName: string
	onChange: (patch: TemplateNodeConfig) => void
}) {
	const visibility = config.creator?.visibility
	const patchVisibility = (part: { defaultVisible?: boolean; allowToggle?: boolean }) =>
		onChange({ creator: { access, visibility: { ...visibility, ...part } } })
	return (
		<Controller.Group title="기본 설정" collapsible={false}>
			{/* 🔑 이름은 `data-name` 한 자리로 들어가 **스튜디오 레이어 패널 · 이 목록 · 인쇄 PDF의
			    Illustrator 레이어명**이 함께 따라온다. 비우면 Figma 이름으로 돌아간다. */}
			<Controller.Row label="레이어 이름">
				<Controller.Input
					value={config.label ?? ''}
					placeholder={fallbackName}
					onChange={(event) => onChange({ label: event.target.value || undefined })}
				/>
			</Controller.Row>
			<Controller.Row label="사용 상태">
				<Controller.Segmented
					aria-label="사용 상태"
					options={[
						{ value: 'editable', label: '편집 가능' },
						{ value: 'readonly', label: '읽기 전용' },
						{ value: 'hidden', label: '숨김' },
					]}
					value={access}
					onChange={(next) =>
						onChange({
							creator: {
								access: next,
								...(next === 'editable' && visibility ? { visibility } : {}),
							},
						})
					}
				/>
			</Controller.Row>
			{/* 표시 정책은 편집 가능일 때만 의미가 있다 — 정본대로 행은 항상 그리고 잠근다. */}
			<div className="grid grid-cols-1 gap-1 md:grid-cols-2">
				<Controller.Row label="기본 표시" disabled={access !== 'editable'}>
					<Controller.Segmented
						aria-label="기본 표시"
						options={ON_OFF}
						value={(visibility?.defaultVisible ?? true) ? 'on' : 'off'}
						onChange={(next) => patchVisibility({ defaultVisible: next === 'on' })}
					/>
				</Controller.Row>
				<Controller.Row label="숨김 가능" disabled={access !== 'editable'}>
					<Controller.Segmented
						aria-label="숨김 가능"
						options={ON_OFF}
						value={(visibility?.allowToggle ?? false) ? 'on' : 'off'}
						onChange={(next) => patchVisibility({ allowToggle: next === 'on' })}
					/>
				</Controller.Row>
			</div>
		</Controller.Group>
	)
}

function SlotSpecEditor({
	input,
	onChange,
}: {
	input: TemplateSlotSpec
	onChange: (input: TemplateSlotSpec) => void
}) {
	const patch = (part: Partial<TemplateSlotSpec>) => onChange({ ...input, ...part })
	const positiveInt = (raw: string) => {
		const parsed = Number.parseInt(raw, 10)
		return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
	}

	return (
		<Controller.Group title="세부 설정" collapsible={false} trailing={layerTypeTag('텍스트')}>
			{/* 정본(81:2)의 세부 설정은 한 행 3열 — 좁은 화면에서만 세로로 푼다. */}
			<div className="grid grid-cols-1 gap-1 md:grid-cols-3">
				<Controller.Row label="라벨">
					<Controller.Input
						value={input.label ?? ''}
						onChange={(event) => patch({ label: event.target.value || undefined })}
						placeholder="예: 영문 이름"
					/>
				</Controller.Row>
				<Controller.Row label="플레이스홀더">
					<Controller.Input
						value={input.placeholder ?? ''}
						onChange={(event) =>
							patch({ placeholder: event.target.value || undefined })
						}
						placeholder="입력 전 안내 문구"
					/>
				</Controller.Row>
				<Controller.Row label="형식">
					<Controller.Select
						options={[
							{ value: 'free', label: '자유 텍스트' },
							{ value: 'number', label: '숫자' },
							{ value: 'email', label: '이메일' },
							{ value: 'date', label: '날짜' },
						]}
						value={input.inputFormat ?? 'free'}
						onChange={(value) =>
							patch({ inputFormat: value as TemplateSlotSpec['inputFormat'] })
						}
					/>
				</Controller.Row>
				<Controller.Row label="최대 글자">
					<Controller.Input
						type="number"
						min={1}
						value={input.maxLength ?? ''}
						onChange={(event) => patch({ maxLength: positiveInt(event.target.value) })}
						placeholder="없음"
					/>
				</Controller.Row>
				<Controller.Row label="최대 줄">
					<Controller.Input
						type="number"
						min={1}
						value={input.maxLines ?? ''}
						onChange={(event) => patch({ maxLines: positiveInt(event.target.value) })}
						placeholder="없음"
					/>
				</Controller.Row>
			</div>
			<Controller.Field label="AI에게 전달할 문구" className="mt-1">
				<Controller.Textarea
					value={input.aiInstruction ?? ''}
					onChange={(event) => patch({ aiInstruction: event.target.value || undefined })}
					rows={2}
					placeholder="예: 영문 이름만, 성-이름 순"
				/>
			</Controller.Field>
		</Controller.Group>
	)
}

type ImageSlotInput = NonNullable<TemplateNodeConfig['imageInput']>

/**
 * 예전 고정(profileId) 저장값을 허용 목록 한 개로 읽는다 — 고정 저작 UI는 간소화로 제거했고,
 * 허용 목록에 하나만 켠 것이 고정과 같다. 도메인 읽기 경로(pinned 투영)는 남아 있으므로,
 * 편집기가 커밋할 때 profileId를 지워 허용 목록으로 수렴시킨다.
 */
export function imageSlotAllowedProfileIds(imageInput: ImageSlotInput): number[] | undefined {
	return imageInput.profileId ? [imageInput.profileId] : imageInput.allowedProfileIds
}

function ImageSlotSpecEditor({
	imageInput,
	onChange,
	profiles,
}: {
	imageInput: ImageSlotInput
	onChange: (imageInput: ImageSlotInput) => void
	profiles: ImageProfileOption[] | null
}) {
	const allowed = imageSlotAllowedProfileIds(imageInput)
	return (
		<>
			<Controller.Group
				title="세부 설정"
				collapsible={false}
				trailing={layerTypeTag('이미지')}
			>
				<Controller.Row label="변형 허용">
					<Controller.Segmented
						aria-label="변형 허용"
						options={ON_OFF}
						value={(imageInput.transform?.enabled ?? true) ? 'on' : 'off'}
						onChange={(next) =>
							onChange({ ...imageInput, transform: { enabled: next === 'on' } })
						}
					/>
				</Controller.Row>
			</Controller.Group>
			<Controller.Group title="허용할 이미지 프로파일" collapsible={false}>
				{profiles && profiles.length === 0 && (
					<p className="text-muted-foreground text-sm">
						발행된 이미지 프로파일이 없습니다.
					</p>
				)}
				{profiles?.map((profile) => {
					const all = profiles.map((candidate) => candidate.id)
					const on = (allowed ?? all).includes(profile.id)
					return (
						<Controller.Row key={profile.id} label={profile.name}>
							<Controller.Segmented
								aria-label={`${profile.name} 허용`}
								options={ON_OFF}
								value={on ? 'on' : 'off'}
								onChange={() => {
									const { profileId: _legacy, ...rest } = imageInput
									onChange({
										...rest,
										allowedProfileIds: toggleAllowedId(
											allowed,
											all,
											profile.id,
										),
									})
								}}
							/>
						</Controller.Row>
					)
				})}
			</Controller.Group>
		</>
	)
}

function ImageLayerEditor({
	access,
	config,
	onCommit,
}: {
	access: TemplateLayerAccess
	config: TemplateNodeConfig
	onCommit: (patch: TemplateNodeConfig) => void
}) {
	const profiles = usePublishedImageProfiles()
	if (access === 'hidden') return null
	return (
		<ImageSlotSpecEditor
			imageInput={config.imageInput ?? {}}
			profiles={profiles}
			onChange={(imageInput) => onCommit({ imageInput })}
		/>
	)
}

export function TemplateLayerEditor({
	config,
	onCommit,
	selected,
}: {
	config: TemplateNodeConfig
	onCommit: (patch: TemplateNodeConfig) => void
	selected: LayerRow
}) {
	const access =
		config.creator?.access ??
		(selected.isText
			? config.input
				? 'editable'
				: 'hidden'
			: canAssignImage(selected)
				? config.imageInput
					? 'editable'
					: 'hidden'
				: 'hidden')
	const policy = (
		<CreatorLayerPolicyEditor
			access={access}
			config={config}
			fallbackName={selected.name}
			onChange={(patch) => {
				const nextAccess = patch.creator?.access
				onCommit({
					...patch,
					...(nextAccess !== 'hidden' && selected.isText && !config.input
						? { input: {} }
						: {}),
					...(nextAccess !== 'hidden' && canAssignImage(selected) && !config.imageInput
						? { imageInput: {} }
						: {}),
				})
			}}
		/>
	)

	if (selected.isText) {
		return (
			<LayerCard heading={selected.name}>
				{policy}
				<Controller.Field label="내용" className="mb-3">
					<Controller.Textarea
						value={selected.text}
						onChange={(event) => onCommit({ text: event.target.value })}
						rows={2}
					/>
				</Controller.Field>
				{access !== 'hidden' && (
					<SlotSpecEditor
						input={config.input ?? {}}
						onChange={(input) => onCommit({ input })}
					/>
				)}
			</LayerCard>
		)
	}

	if (canAssignImage(selected)) {
		return (
			<LayerCard heading={selected.name}>
				{policy}
				<ImageLayerEditor access={access} config={config} onCommit={onCommit} />
			</LayerCard>
		)
	}

	if (selected.isVector) {
		return (
			<LayerCard heading={selected.name}>
				{policy}
				<VectorLayerEditor config={config} onChange={onCommit} />
			</LayerCard>
		)
	}

	// 편집 UI 없는 레이어(부모 소관·img 고정 등)는 목록에서 비활성 — 안내 문구는 정본에서 제거됐다.
	return null
}
