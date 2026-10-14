'use client'

import { LetterTt, TextAlignLeft } from '@carbon/icons-react'
import { type ReactNode, useId, useMemo, useState } from 'react'
import { parseLayers } from '@/components/admin/templates/template-layers'
import { Controller } from '@/components/shared/controller'
import { useManagerMode } from '@/components/studio/shared/use-manager-mode'
import { useOptimisticAccess } from '@/components/studio/template/manager-forms/layer-access-toggle'
import {
	updateTemplateLayerAccess,
	updateTemplateNodeConfig,
} from '@/components/studio/template/manager-forms/template-html-writes'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { partitionTemplateSlots } from '@/features/template-customization/domain/template-studio-config'
import {
	applyTextSlotDraft,
	parseSlotCount,
	type TextSlotDraft,
	toTextSlotDraft,
} from '@/features/template-customization/domain/text-slot-draft'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { TEXT_FORMAT_OPTIONS } from '@/modules/studio-controller/text-formats'
import type {
	TemplateLayerAccess,
	TemplateNodeConfig,
	TemplateNodeConfigMap,
} from '@/types/template'

type TextSource = {
	baseHtml?: string | null
	overrides?: TemplateNodeConfigMap | null
	defaultSession?: unknown
}
const TEXT_SOURCE_FIELDS = ['baseHtml', 'overrides', 'defaultSession'] as const

/** 「편집」 두 칸(Figma 659:9297) — 숨김은 Layers의 눈 아이콘이 맡고, 숨긴 칸은 화면에 없어 이 패널이 열리지 않는다. */
const EDIT_OPTIONS = [
	{ value: 'editable', label: '가능' },
	{ value: 'readonly', label: '불가능' },
] as const satisfies readonly { value: TemplateLayerAccess; label: string }[]

/**
 * 텍스트 칸의 관리 폼(`text:<레이어 id>`, Figma 659:9297) — worker가 이 칸을 고칠 수 있나(고르는 즉시 반영)와
 * 레이어 이름·기본 문구·형식·최대 글자/줄(「저장」으로 반영). 전부 `overrides[nodeId]`다.
 * 🔑 칸 이름·안내 문구·AI 지침은 화면에서만 뺐다(2026-10-14) — 초안이 저장된 값에서 시작하므로 그대로 남는다.
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
	const access = useOptimisticAccess(slot?.access ?? 'editable', source.busy, (next) =>
		source.save(
			() => updateTemplateLayerAccess(config.id, nodeId, next, 'input'),
			'편집 권한을 바꾸지 못했어요.',
		),
	)
	if (!slot) return null
	const nodeConfig = data?.overrides?.[nodeId] ?? {}
	return (
		<div className="flex flex-col gap-4">
			{/* 패널 제목과 4px — 셸의 머리 간격(16px)을 이 줄만 당긴다(Figma 659:9593). */}
			<Controller.Row label="편집" className="-mt-3">
				<Controller.Segmented
					options={EDIT_OPTIONS}
					value={access.shown}
					onChange={access.press}
					aria-label={`${slot.label}: worker가 고칠 수 있나`}
				/>
			</Controller.Row>
			{data ? (
				<TextSlotFields
					// 저장하면 다시 읽은 값으로 새로 시작한다(권한만 바뀌면 입력 중인 값을 지킨다).
					key={JSON.stringify(toTextSlotDraft(nodeConfig))}
					config={nodeConfig}
					figmaName={figma?.name ?? slot.layer}
					figmaText={figma?.text ?? ''}
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
			{(source.error || source.busy || !data) && (
				<FormNote error={source.error} busy={source.busy} note="불러오는 중…" />
			)}
		</div>
	)
}

function TextSlotFields({
	config,
	figmaName,
	figmaText,
	busy,
	onSave,
}: {
	config: TemplateNodeConfig
	figmaName: string
	figmaText: string
	busy: boolean
	onSave: (draft: TextSlotDraft) => void
}) {
	const id = useId()
	const manager = useManagerMode()
	const [draft, setDraft] = useState(() => toTextSlotDraft(config))
	const set = (patch: Partial<TextSlotDraft>) => setDraft((current) => ({ ...current, ...patch }))
	const valid = applyTextSlotDraft(config, draft) !== null
	const countInvalid = (raw: string) => parseSlotCount(raw) === null
	const maxLength = parseSlotCount(draft.maxLength)
	const errorId = `${id}-count-error`
	return (
		<div className="flex flex-col gap-4">
			<Controller.GroupList>
				<Controller.Group title="Basic" collapsible={false}>
					<Controller.Row label="레이어 이름">
						<Controller.Input
							value={draft.layerLabel}
							placeholder={figmaName}
							// 칸 이름은 레이어 이름과 하나다(2026-10-14) — 따로 저장된 칸 이름을 비워 레이어 이름이 그대로 보이게 한다.
							onChange={(event) => set({ layerLabel: event.target.value, label: '' })}
						/>
					</Controller.Row>
					<Controller.Field
						label="기본 문구"
						// 최대 글자가 있을 때만 분모가 있다 — 제한이 없으면 셀 기준이 없어 감춘다.
						counter={maxLength ? `${draft.text.length}/${maxLength}` : undefined}
					>
						<Controller.Textarea
							rows={3}
							value={draft.text}
							placeholder={figmaText}
							onChange={(event) => set({ text: event.target.value })}
						/>
					</Controller.Field>
				</Controller.Group>
				<Controller.Group title="Input" collapsible={false}>
					<Controller.Row label="입력 형식">
						<Controller.Select
							options={TEXT_FORMAT_OPTIONS}
							value={draft.inputFormat}
							onChange={(value) =>
								set({ inputFormat: value as TextSlotDraft['inputFormat'] })
							}
						/>
					</Controller.Row>
					<div className="grid grid-cols-2 gap-1">
						<CountRow
							label="최대 글자"
							icon={<LetterTt aria-hidden className="size-4" />}
							unit="자"
							value={draft.maxLength}
							invalid={countInvalid(draft.maxLength)}
							errorId={errorId}
							onChange={(maxLength) => set({ maxLength })}
						/>
						<CountRow
							label="최대 줄"
							icon={<TextAlignLeft aria-hidden className="size-4" />}
							unit="줄"
							value={draft.maxLines}
							invalid={countInvalid(draft.maxLines)}
							errorId={errorId}
							onChange={(maxLines) => set({ maxLines })}
						/>
					</div>
					{!valid && (
						<Typography id={errorId} role="alert" size="xs" tone="destructive">
							최대 글자·줄은 비우거나 1 이상의 정수로 적어 주세요.
						</Typography>
					)}
				</Controller.Group>
			</Controller.GroupList>
			<div className="flex gap-2">
				<Button
					disabled={!valid || busy}
					className="h-11 min-w-0 flex-1 rounded-lg"
					onClick={() => onSave(draft)}
				>
					저장
				</Button>
				{/* 패널의 ×와 같다 — 닫으면 고치던 값은 패널과 함께 버려진다. */}
				<Button
					variant="outline"
					disabled={busy}
					className="h-11 min-w-0 flex-1 rounded-lg"
					onClick={manager.close}
				>
					취소
				</Button>
			</div>
		</div>
	)
}

/** 최대 글자·줄 칸 — 아이콘 라벨 · 숫자 · 단위(Figma 659:9489). 비우면 「없음」(제한 없음)이다. */
function CountRow({
	label,
	icon,
	unit,
	value,
	invalid,
	errorId,
	onChange,
}: {
	label: string
	icon: ReactNode
	unit: string
	value: string
	invalid: boolean
	errorId: string
	onChange: (value: string) => void
}) {
	return (
		<Controller.Row
			label={
				<>
					{icon}
					<span className="sr-only">{label}</span>
				</>
			}
			errorId={invalid ? errorId : undefined}
		>
			<span className="flex min-w-0 items-center gap-1">
				<Controller.Input
					inputMode="numeric"
					value={value}
					placeholder="없음"
					onChange={(event) => onChange(event.target.value)}
				/>
				<span aria-hidden className="shrink-0 text-sm text-muted-foreground">
					{unit}
				</span>
			</span>
		</Controller.Row>
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
