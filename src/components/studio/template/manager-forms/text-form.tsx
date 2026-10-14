'use client'

import { type ReactNode, useId, useMemo, useRef, useState } from 'react'
import { parseLayers } from '@/components/admin/templates/template-layers'
import { LayerAccessToggle } from '@/components/studio/template/manager-forms/layer-access-toggle'
import {
	updateTemplateLayerAccess,
	updateTemplateNodeConfig,
} from '@/components/studio/template/manager-forms/template-html-writes'
import { Field, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import { partitionTemplateSlots } from '@/features/template-customization/domain/template-studio-config'
import {
	applyTextSlotDraft,
	TEXT_INPUT_FORMATS,
	TEXT_LAYER_ROLES,
	type TextSlotDraft,
	toTextSlotDraft,
} from '@/features/template-customization/domain/text-slot-draft'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { TemplateNodeConfig, TemplateNodeConfigMap } from '@/types/template'

type TextSource = { baseHtml?: string | null; overrides?: TemplateNodeConfigMap | null }
const TEXT_SOURCE_FIELDS = ['baseHtml', 'overrides'] as const

/** 이름 목록의 「기타」 — 목록에 없는 이름을 직접 적는다. */
const OTHER_ROLE = 'other'
const isRole = (label: string) => (TEXT_LAYER_ROLES as readonly string[]).includes(label)

/**
 * 텍스트 칸의 관리 폼(`text:<레이어 id>`) — 레이어 이름 → 권한 | 입력 형식 → 플레이스홀더 → 내용 순(사용자 2026-10-14).
 * 전부 `overrides[nodeId]`다. 쓰는 사람이 디자이너라 설명 문구는 두지 않는다.
 * 고르는 값은 고르는 즉시, 적는 값은 칸을 벗어날 때 초안에 쌓인다(모드를 끌 때 저장·버리기).
 */
export function TemplateTextManagerForm({ nodeId }: { nodeId: string }) {
	const { config } = useTemplateStudio()
	const source = useTemplateManagerData<TextSource>(config.id, TEXT_SOURCE_FIELDS)
	const data = source.data
	// 비운 칸이 돌아갈 Figma 값 — 원본(baseHtml)에서 읽는다. 지금 화면(html)은 이미 덮인 값이다.
	// 오버레이가 마우스 움직임마다 다시 그리므로 파싱은 원본이 바뀔 때만 한다.
	const figma = useMemo(
		() =>
			data?.baseHtml
				? parseLayers(data.baseHtml).find((row) => row.id === nodeId)
				: undefined,
		[data?.baseHtml, nodeId],
	)
	const slot = partitionTemplateSlots(config.template.slots).text.find(
		(item) => item.id === nodeId,
	)
	if (!slot) return null
	return (
		<div className="flex flex-col gap-4">
			{data ? (
				<TextSlotFields
					// 처음 읽은 값으로 시작하고 다시 만들지 않는다 — 칸을 옮겨 다니는 중에 포커스를 잃지 않게.
					config={data.overrides?.[nodeId] ?? {}}
					figmaName={figma?.name ?? slot.layer}
					figmaText={figma?.text ?? ''}
					access={
						<Field className="gap-1.5">
							<FieldTitle>권한</FieldTitle>
							<LayerAccessToggle
								label={`${slot.label}: 권한`}
								access={slot.access}
								busy={source.busy}
								onChange={(access) =>
									source.save(() =>
										updateTemplateLayerAccess(
											config.id,
											nodeId,
											access,
											'input',
										),
									)
								}
								withAiReview
							/>
						</Field>
					}
					onSave={(draft) =>
						void source.save(() =>
							// 쓰기 직전에 다시 읽은 설정 위에 얹는다 — 그 사이 다른 폼이 고친 키(권한 등)를 덮지 않는다.
							updateTemplateNodeConfig(config.id, nodeId, (current) =>
								applyTextSlotDraft(current, draft),
							),
						)
					}
				/>
			) : null}
			<FormNote error={source.error} loading={!data} />
		</div>
	)
}

function TextSlotFields({
	config,
	figmaName,
	figmaText,
	access,
	onSave,
}: {
	config: TemplateNodeConfig
	figmaName: string
	figmaText: string
	/** 권한 줄 — 이름 다음에 둔다. 저장 경로가 달라(html 재합성 + 접근 선언) 부모가 만든다. */
	access: ReactNode
	onSave: (draft: TextSlotDraft) => void
}) {
	const id = useId()
	const [draft, setDraft] = useState(() => toTextSlotDraft(config))
	// 목록에 없는 이름이면 「기타」로 연다. 「기타」를 막 고른 빈 칸도 기타다.
	const [other, setOther] = useState(() => draft.layerLabel !== '' && !isRole(draft.layerLabel))
	const written = useRef(draft)
	const set = (patch: Partial<TextSlotDraft>) => setDraft((current) => ({ ...current, ...patch }))
	/** 바뀌었으면 쓴다 — 적는 칸은 벗어날 때, 고르는 칸은 고르는 즉시 부른다. */
	const commit = (next: TextSlotDraft) => {
		if (JSON.stringify(next) === JSON.stringify(written.current)) return
		written.current = next
		onSave(next)
	}
	const choose = (patch: Partial<TextSlotDraft>) => {
		const next = { ...draft, ...patch }
		setDraft(next)
		commit(next)
	}
	return (
		// 칸을 벗어날 때(focusout은 올라온다) 한 번에 쓴다.
		// biome-ignore lint/a11y/noStaticElementInteractions: 입력칸들의 focusout을 모아 받을 뿐 스스로 조작되지 않는다
		<div className="flex flex-col gap-4" onBlur={() => commit(draft)}>
			<Field className="gap-1.5">
				<FieldTitle id={`${id}-name`}>레이어명</FieldTitle>
				<Select
					value={other ? OTHER_ROLE : isRole(draft.layerLabel) ? draft.layerLabel : ''}
					onValueChange={(value) => {
						if (value === OTHER_ROLE) {
							setOther(true)
							return
						}
						setOther(false)
						choose({ layerLabel: value })
					}}
				>
					<SelectTrigger aria-labelledby={`${id}-name`} className="w-full">
						<SelectValue placeholder={figmaName} />
					</SelectTrigger>
					<SelectContent>
						{TEXT_LAYER_ROLES.map((role) => (
							<SelectItem key={role} value={role}>
								{role}
							</SelectItem>
						))}
						<SelectItem value={OTHER_ROLE}>기타</SelectItem>
					</SelectContent>
				</Select>
				{other && (
					<Input
						aria-label="레이어명 직접 입력"
						value={isRole(draft.layerLabel) ? '' : draft.layerLabel}
						placeholder={figmaName}
						onChange={(event) => set({ layerLabel: event.target.value })}
					/>
				)}
			</Field>
			{access}
			<Separator />
			<Field className="gap-1.5">
				<FieldTitle id={`${id}-format`}>입력 형식</FieldTitle>
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					value={draft.inputFormat}
					onValueChange={(value) =>
						value && choose({ inputFormat: value as TextSlotDraft['inputFormat'] })
					}
					aria-labelledby={`${id}-format`}
					className="w-full"
				>
					{TEXT_INPUT_FORMATS.map((format) => (
						<ToggleGroupItem key={format.value} value={format.value}>
							{format.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</Field>
			<Field className="gap-1.5">
				<FieldLabel htmlFor={`${id}-placeholder`}>플레이스홀더</FieldLabel>
				<Input
					id={`${id}-placeholder`}
					value={draft.placeholder}
					onChange={(event) => set({ placeholder: event.target.value })}
				/>
			</Field>
			<Field className="gap-1.5">
				<FieldLabel htmlFor={`${id}-text`}>내용</FieldLabel>
				<Textarea
					id={`${id}-text`}
					rows={2}
					value={draft.text}
					placeholder={figmaText}
					onChange={(event) => set({ text: event.target.value })}
				/>
			</Field>
		</div>
	)
}

/**
 * 폼 아래 한 줄(Manager mode 폼 공용) — 오류 > 불러오는 중 > 쓰는 중 > 안내 순으로 하나만 보인다.
 * 오류는 화면 읽기 프로그램에도 알린다. 보일 것이 없으면 그리지 않는다.
 */
export function FormNote({
	error,
	busy = false,
	loading = false,
	note,
}: {
	error: string | null
	busy?: boolean
	loading?: boolean
	note?: string
}) {
	const text = error ?? (loading ? '불러오는 중…' : busy ? '반영하는 중…' : note)
	if (!text) return null
	return (
		<Typography
			size="xs"
			tone={error ? 'destructive' : 'muted'}
			role={error ? 'alert' : undefined}
		>
			{text}
		</Typography>
	)
}
