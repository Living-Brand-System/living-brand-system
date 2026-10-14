'use client'

import { useEffect, useState } from 'react'
import {
	parseLayers,
	pruneCarrierChildImageKeys,
	toggleAllowedId,
} from '@/components/admin/templates/template-layers'
import { ManagerLinkForm } from '@/components/studio/template/manager-forms/link-form'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import {
	type ImageProfileOption,
	requestPublishedImageProfiles,
} from '@/features/image-generation/services/generate-image.client'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import {
	patchTemplate,
	readTemplateLayerSource,
} from '@/features/template-customization/services/template-records.client'
import type { TemplateNodeConfig, TemplateNodeConfigMap } from '@/types/template'

type ImageInput = NonNullable<TemplateNodeConfig['imageInput']>

const profileHref = (id: number) => `/admin/collections/image-profiles/${id}`

/** 예전 고정(`profileId`)은 허용 목록 하나로 읽는다 — admin 이미지 칸 편집기와 같다(고정 저작 UI는 없어졌다). */
const allowedOf = (input: ImageInput) =>
	input.profileId ? [input.profileId] : input.allowedProfileIds

/**
 * 이미지 칸의 입력 정책(`overrides[nodeId].imageInput`)을 고친다 — admin 레이어 편집기(`commitNodeConfig`)와 같은
 * 규칙으로: 캐리어 자식에 남은 예전 이미지 키를 걷고, 노드 설정이 바뀌었으니 렌더 html을 다시 합성한다.
 * ponytail: `updateTemplateNodeConfig`는 노드 하나만 고쳐 캐리어 자식을 못 걷는다 — 그래서 여기서 직접 쓴다.
 */
async function saveImageInput(
	templateId: number,
	nodeId: string,
	update: (input: ImageInput) => ImageInput,
): Promise<void> {
	const { baseHtml, overrides } = await readTemplateLayerSource(templateId)
	const patch: TemplateNodeConfig = { imageInput: update(overrides[nodeId]?.imageInput ?? {}) }
	const carrierChildId = parseLayers(baseHtml).find((row) => row.id === nodeId)?.carrierChildId
	const next = pruneCarrierChildImageKeys(
		{ ...overrides, [nodeId]: { ...overrides[nodeId], ...patch } },
		carrierChildId,
		patch,
	)
	await patchTemplate(
		templateId,
		{ overrides: next, html: composeTemplateHtml(baseHtml, next) },
		'이미지 칸 설정을 저장하지 못했어요.',
	)
}

/** 이미지 칸 하나의 입력 정책 — 최신 초안에서 읽고, 고치면 바로 반영한다. */
function useImageInput(nodeId: string) {
	const { config } = useTemplateStudio()
	const manager = useTemplateManagerData<{ overrides?: TemplateNodeConfigMap | null }>(
		config.id,
		['overrides'],
	)
	return {
		busy: manager.busy,
		error: manager.error,
		imageInput: manager.data ? (manager.data.overrides?.[nodeId]?.imageInput ?? {}) : null,
		change: (update: (input: ImageInput) => ImageInput) =>
			manager.save(() => saveImageInput(config.id, nodeId, update)),
	}
}

type ImageInputState = ReturnType<typeof useImageInput>

function usePublishedImageProfiles() {
	const [profiles, setProfiles] = useState<ImageProfileOption[] | null>(null)
	const [error, setError] = useState<string | null>(null)
	useEffect(() => {
		requestPublishedImageProfiles()
			.then(setProfiles)
			.catch(() => setError('이미지 프로파일을 불러오지 못했어요.'))
	}, [])
	return { profiles, error }
}

function Loading({ error }: { error: string | null }) {
	return (
		<Typography size="xs" tone={error ? 'destructive' : 'muted'}>
			{error ?? '불러오는 중…'}
		</Typography>
	)
}

/** 이동·확대·회전 허용 — 끄면 Transform 묶음이 사라지므로, 다시 켜는 자리는 프로파일 폼에도 있다. */
function TransformToggle({ slot, input }: { slot: ImageInputState; input: ImageInput }) {
	const enabled = input.transform?.enabled ?? true
	return (
		<div className="flex flex-col gap-1.5">
			<Typography size="xs" weight="medium">
				이동·확대·회전
			</Typography>
			<ToggleGroup
				type="single"
				variant="outline"
				size="sm"
				spacing={0}
				value={enabled ? 'on' : 'off'}
				disabled={slot.busy}
				onValueChange={(value) =>
					value &&
					value !== (enabled ? 'on' : 'off') &&
					void slot.change((current) => ({
						...current,
						transform: { enabled: value === 'on' },
					}))
				}
				aria-label="이동·확대·회전"
				className="w-full"
			>
				<ToggleGroupItem value="on">허용</ToggleGroupItem>
				<ToggleGroupItem value="off">막음</ToggleGroupItem>
			</ToggleGroup>
		</div>
	)
}

/**
 * 이미지 칸 편집 카드의 관리 폼(`profile:<레이어 id>`) — 이 칸에서 고를 수 있는 프로파일과 이동·확대·회전 허용.
 * 프로파일 자체(프롬프트·색·비율)는 여러 템플릿이 같이 쓰는 파운데이션이라 링크만 둔다.
 */
export function TemplateImageProfileManagerForm({ nodeId }: { nodeId: string }) {
	const { images } = useTemplateStudio()
	const slot = useImageInput(nodeId)
	const { profiles, error } = usePublishedImageProfiles()
	if (!slot.imageInput || !profiles) return <Loading error={slot.error ?? error} />
	const input = slot.imageInput
	const all = profiles.map((profile) => profile.id)
	const allowed = allowedOf(input) ?? all
	const currentId = images.states[nodeId]?.profileId
	const current = profiles.find((profile) => profile.id === currentId)
	return (
		<div className="flex flex-col gap-4">
			<FieldSet className="gap-2">
				<FieldLegend variant="label" className="mb-0 text-xs">
					고를 수 있는 프로파일
				</FieldLegend>
				{profiles.length === 0 && (
					<Typography size="xs" tone="muted">
						발행된 이미지 프로파일이 없어요.
					</Typography>
				)}
				{profiles.map((profile) => (
					<Label key={profile.id} className="font-normal">
						<Checkbox
							checked={allowed.includes(profile.id)}
							disabled={slot.busy}
							onCheckedChange={() =>
								void slot.change((latest) => {
									// 고칠 때 예전 고정값은 걷고 허용 목록으로 모은다(admin 편집기와 같다).
									const { profileId: _legacy, ...rest } = latest
									return {
										...rest,
										allowedProfileIds: toggleAllowedId(
											allowedOf(latest),
											all,
											profile.id,
										),
									}
								})
							}
						/>
						<span className="truncate">{profile.name}</span>
					</Label>
				))}
			</FieldSet>
			<TransformToggle slot={slot} input={input} />
			{currentId !== undefined && (
				<ManagerLinkForm
					note="프로파일 내용(프롬프트·색·비율)은 여러 템플릿이 같이 써서 프로파일 페이지에서 고쳐요."
					links={[
						{
							label: current?.name ?? `프로파일 #${currentId}`,
							href: profileHref(currentId),
						},
					]}
				/>
			)}
			<FormNote
				error={slot.error}
				busy={slot.busy}
				note="고르면 모든 사용자에게 바로 반영돼요. 하나만 켜면 그 프로파일로 고정돼요."
			/>
		</div>
	)
}

/**
 * Adjustment 탭 Image Transform 묶음의 관리 폼(`transform:<레이어 id>`) — 이 칸에서 이동·확대·회전을 허용할지.
 * 움직일 수 있는 범위(`IMAGE_EDIT_TRANSFORM_LIMITS`)는 템플릿 데이터가 아니라 코드 상수라 여기서 고치지 않는다.
 */
export function TemplateImageTransformManagerForm({ nodeId }: { nodeId: string }) {
	const slot = useImageInput(nodeId)
	if (!slot.imageInput) return <Loading error={slot.error} />
	return (
		<div className="flex flex-col gap-2">
			<TransformToggle slot={slot} input={slot.imageInput} />
			<FormNote
				error={slot.error}
				busy={slot.busy}
				note="막으면 이 묶음이 사라져요. 다시 허용하는 곳은 위쪽 이미지 카드예요. 움직일 수 있는 범위는 모든 템플릿이 같이 써서 바꾸지 않아요."
			/>
		</div>
	)
}
