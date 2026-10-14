'use client'

import { useId, useMemo, useState } from 'react'
import { parseLayers } from '@/components/admin/templates/template-layers'
import { LayerAccessToggle } from '@/components/studio/template/manager-forms/layer-access-toggle'
import {
	updateTemplateLayerAccess,
	updateTemplateNodeConfig,
} from '@/components/studio/template/manager-forms/template-html-writes'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import { partitionTemplateSlots } from '@/features/template-customization/domain/template-studio-config'
import {
	applyTextSlotDraft,
	parseSlotCount,
	TEXT_INPUT_FORMATS,
	type TextSlotDraft,
	toTextSlotDraft,
} from '@/features/template-customization/domain/text-slot-draft'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { toTemplateDraft } from '@/features/template-customization/services/template-draft.client'
import type { TemplateNodeConfig, TemplateNodeConfigMap } from '@/types/template'

type TextSource = {
	baseHtml?: string | null
	overrides?: TemplateNodeConfigMap | null
	defaultSession?: unknown
}
const TEXT_SOURCE_FIELDS = ['baseHtml', 'overrides', 'defaultSession'] as const

/**
 * 텍스트 칸의 관리 폼(`text:<레이어 id>`) — worker가 이 칸을 어떻게 쓰나(권한은 고르는 즉시 반영)와 칸의 설정
 * (레이어 이름·칸 이름·안내 문구·형식·최대 글자/줄·AI 지침·기본 문구, 「저장」으로 반영). 전부 `overrides[nodeId]`다.
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
	const nodeConfig = data?.overrides?.[nodeId] ?? {}
	const savedText = toTemplateDraft(data?.defaultSession)?.text?.[nodeId]
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1.5">
				<LayerAccessToggle
					label={`${slot.label}: worker가 쓰는 방법`}
					access={slot.access}
					busy={source.busy}
					onChange={(access) =>
						void source.save(
							() => updateTemplateLayerAccess(config.id, nodeId, access, 'input'),
							'편집 권한을 바꾸지 못했어요.',
						)
					}
					withAiReview
				/>
				<Typography size="xs" tone="muted">
					고르면 모든 사용자에게 바로 반영돼요. 숨긴 칸은 Layers의 Text 묶음에서 되살려요.
				</Typography>
			</div>
			{data ? (
				<TextSlotFields
					// 저장하면 다시 읽은 값으로 새로 시작한다(권한만 바뀌면 입력 중인 값을 지킨다).
					key={JSON.stringify(toTextSlotDraft(nodeConfig))}
					config={nodeConfig}
					figmaName={figma?.name ?? slot.layer}
					figmaText={figma?.text ?? ''}
					savedText={typeof savedText === 'string' ? savedText : undefined}
					busy={source.busy}
					onSave={(draft) =>
						void source.save(
							// 저장 직전에 다시 읽은 설정 위에 얹는다 — 그 사이 다른 폼이 고친 키(권한 등)를 덮지 않는다.
							() =>
								updateTemplateNodeConfig(
									config.id,
									nodeId,
									(current) => applyTextSlotDraft(current, draft) ?? current,
								),
							'텍스트 칸을 저장하지 못했어요.',
						)
					}
				/>
			) : null}
			<FormNote
				error={source.error}
				busy={source.busy}
				note={data ? '저장하면 모든 사용자에게 바로 반영돼요.' : '불러오는 중…'}
			/>
		</div>
	)
}

function TextSlotFields({
	config,
	figmaName,
	figmaText,
	savedText,
	busy,
	onSave,
}: {
	config: TemplateNodeConfig
	figmaName: string
	figmaText: string
	/** 기본 화면(`defaultSession`)에 저장된 이 칸 문구 — 있으면 스튜디오는 기본 문구 대신 이것으로 시작한다. */
	savedText: string | undefined
	busy: boolean
	onSave: (draft: TextSlotDraft) => void
}) {
	const id = useId()
	const [draft, setDraft] = useState(() => toTextSlotDraft(config))
	const set = (patch: Partial<TextSlotDraft>) => setDraft((current) => ({ ...current, ...patch }))
	const valid = applyTextSlotDraft(config, draft) !== null
	const countInvalid = (raw: string) => parseSlotCount(raw) === null
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-3">
				<Field className="gap-1">
					<FieldLabel htmlFor={`${id}-layer`}>레이어 이름</FieldLabel>
					<Input
						id={`${id}-layer`}
						value={draft.layerLabel}
						placeholder={figmaName}
						aria-describedby={`${id}-layer-description`}
						onChange={(event) => set({ layerLabel: event.target.value })}
					/>
					<FieldDescription id={`${id}-layer-description`} className="text-xs">
						Layers 목록과 인쇄 PDF의 레이어 이름이에요. 비우면 Figma 이름을 써요.
					</FieldDescription>
				</Field>
				<Field className="gap-1">
					<FieldLabel htmlFor={`${id}-label`}>칸 이름</FieldLabel>
					<Input
						id={`${id}-label`}
						value={draft.label}
						placeholder={draft.layerLabel || figmaName}
						aria-describedby={`${id}-label-description`}
						onChange={(event) => set({ label: event.target.value })}
					/>
					<FieldDescription id={`${id}-label-description`} className="text-xs">
						worker가 보는 이 칸의 제목이에요. 비우면 레이어 이름을 써요.
					</FieldDescription>
				</Field>
				<Field className="gap-1">
					<FieldLabel htmlFor={`${id}-placeholder`}>안내 문구</FieldLabel>
					<Input
						id={`${id}-placeholder`}
						value={draft.placeholder}
						placeholder="입력 전 칸에 흐리게 보여요"
						onChange={(event) => set({ placeholder: event.target.value })}
					/>
				</Field>
				<Field className="gap-1">
					<FieldTitle id={`${id}-format`}>입력 형식</FieldTitle>
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						spacing={0}
						value={draft.inputFormat}
						onValueChange={(value) =>
							value && set({ inputFormat: value as TextSlotDraft['inputFormat'] })
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
				<div className="grid grid-cols-2 gap-2">
					<Field className="gap-1">
						<FieldLabel htmlFor={`${id}-max-length`}>최대 글자</FieldLabel>
						<Input
							id={`${id}-max-length`}
							inputMode="numeric"
							value={draft.maxLength}
							placeholder="없음"
							aria-invalid={countInvalid(draft.maxLength) || undefined}
							aria-describedby={`${id}-count-hint`}
							onChange={(event) => set({ maxLength: event.target.value })}
						/>
					</Field>
					<Field className="gap-1">
						<FieldLabel htmlFor={`${id}-max-lines`}>최대 줄</FieldLabel>
						<Input
							id={`${id}-max-lines`}
							inputMode="numeric"
							value={draft.maxLines}
							placeholder="없음"
							aria-invalid={countInvalid(draft.maxLines) || undefined}
							aria-describedby={`${id}-count-hint`}
							onChange={(event) => set({ maxLines: event.target.value })}
						/>
					</Field>
				</div>
				<Typography
					id={`${id}-count-hint`}
					aria-live="polite"
					size="xs"
					tone={valid ? 'muted' : 'destructive'}
					className="-mt-2"
				>
					{valid
						? '자유 형식이 아니거나 최대 줄이 1이면 한 줄 칸이 돼요.'
						: '최대 글자·줄은 비우거나 1 이상의 정수로 적어 주세요.'}
				</Typography>
				<Field className="gap-1">
					<FieldLabel htmlFor={`${id}-ai`}>AI에게 전달할 문구</FieldLabel>
					<Textarea
						id={`${id}-ai`}
						rows={2}
						value={draft.aiInstruction}
						placeholder="예: 영문 이름만, 성-이름 순"
						onChange={(event) => set({ aiInstruction: event.target.value })}
					/>
				</Field>
				<Field className="gap-1">
					<FieldLabel htmlFor={`${id}-text`}>기본 문구</FieldLabel>
					<Textarea
						id={`${id}-text`}
						rows={2}
						value={draft.text}
						placeholder={figmaText}
						aria-describedby={`${id}-text-description`}
						onChange={(event) => set({ text: event.target.value })}
					/>
					<FieldDescription id={`${id}-text-description`} className="text-xs">
						{savedText === undefined
							? '비우면 Figma 문구로 돌아가요. 지금 화면은 템플릿 카드의 Reset을 눌러야 바뀌고, 이 템플릿을 작업 중인 사람에겐 자기 임시 저장(24시간)이 먼저 보여요.'
							: '「지금 상태를 기본값으로 저장」한 기본 화면에 이 칸 문구가 따로 있어서, 여기서 바꾼 기본 문구는 새로 열거나 Reset해도 보이지 않아요. 스튜디오의 이 칸에 새 문구를 넣고 기본값으로 다시 저장해야 바뀌어요.'}
					</FieldDescription>
				</Field>
			</div>
			<Button size="sm" disabled={!valid || busy} onClick={() => onSave(draft)}>
				저장
			</Button>
		</div>
	)
}

/** 폼 아래 한 줄 — 오류가 있으면 오류, 저장 중이면 그 사실, 아니면 안내. */
export function FormNote({
	error,
	busy,
	note,
}: {
	error: string | null
	busy: boolean
	note: string
}) {
	return (
		<Typography
			size="xs"
			tone={error ? 'destructive' : 'muted'}
			role={error ? 'alert' : undefined}
		>
			{error ?? (busy ? '반영하는 중…' : note)}
		</Typography>
	)
}
