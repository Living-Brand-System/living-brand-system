'use client'

import { type ReactNode, useId, useState } from 'react'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import type { StudioOutputFormat } from '@/features/studio-export/export-contract'
import { PRINT_PPI_VALUES, printablePpiOptions } from '@/features/studio-export/print-policy'
import {
	DEFAULT_RASTER_VIDEO_CAPABILITY,
	resolveStudioArtifactOutputFormats,
} from '@/features/studio-export/studio-output'
import { TEMPLATE_KIND_FORMATS } from '@/features/template-customization/domain/template-studio-config'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import {
	type TemplateExportPolicyDoc,
	updateTemplateExportPolicy,
} from '@/features/template-customization/services/manager-export.client'
import type { Template } from '@/payload-types'

const TEMPLATE_EXPORT_AXES = ['formats', 'ppi', 'fps', 'duration'] as const
export type TemplateExportAxis = (typeof TEMPLATE_EXPORT_AXES)[number]

export function isTemplateExportAxis(key: string): key is TemplateExportAxis {
	return (TEMPLATE_EXPORT_AXES as readonly string[]).includes(key)
}

type ExportFields = {
	exportPolicy?: TemplateExportPolicyDoc | null
	outputKind?: Template['outputKind'] | null
}
const FIELDS = ['exportPolicy', 'outputKind'] as const

/** 영상 상한 — Payload 최소값 그대로. 최대값은 Runtime 사양이다(넘기면 서버가 거부한다). */
const VIDEO_LIMITS = [
	{ key: 'maxDurationSeconds', label: '최대 길이', unit: 'sec', min: 0.1 },
	{ key: 'maxWidth', label: '최대 너비', unit: 'px', min: 1 },
	{ key: 'maxHeight', label: '최대 높이', unit: 'px', min: 1 },
] as const

/**
 * Output 카드 줄의 관리 폼(`export:<formats|ppi|fps|duration>`) — 템플릿 출력 설정(`exportPolicy`)을 좁힌다.
 * 후보는 Runtime이 낼 수 있는 것(형식은 판형 종류 안)뿐이라 넓힐 수는 없다. admin 출력 설정 카드와 같은 규칙:
 * 다 켜면 제한 없음, 마지막 하나는 끌 수 없다.
 */
export function TemplateExportManagerForm({ axis }: { axis: TemplateExportAxis }) {
	const { config } = useTemplateStudio()
	const manager = useTemplateManagerData<ExportFields>(config.id, FIELDS)
	if (!manager.data) {
		return (
			<Typography size="xs" tone={manager.error ? 'destructive' : 'muted'}>
				{manager.error ?? '불러오는 중…'}
			</Typography>
		)
	}
	const policy = manager.data.exportPolicy ?? {}
	const change = (update: (current: TemplateExportPolicyDoc) => TemplateExportPolicyDoc) =>
		void manager.save(() => updateTemplateExportPolicy(config.id, update))
	const note = (text: string) => (
		<FormNote error={manager.error} busy={manager.busy} note={text} />
	)

	if (axis === 'formats') {
		const kindFormats: readonly StudioOutputFormat[] =
			TEMPLATE_KIND_FORMATS[manager.data.outputKind ?? 'digital']
		const options = resolveStudioArtifactOutputFormats(config.artifacts, undefined).filter(
			(format) => kindFormats.includes(format),
		)
		const selected = selectedOf(options, policy.allowedFormats)
		return (
			<div className="flex flex-col gap-1.5">
				<ChoiceToggle
					label="worker가 고를 수 있는 형식"
					options={options}
					format={(value) => value.toUpperCase()}
					selected={selected}
					locked={(value) => isLast(selected, value)}
					busy={manager.busy}
					onChange={(next) =>
						next.length > 0 &&
						change((current) => ({
							...current,
							allowedFormats: (restrictionOf(options, next) ??
								[]) as TemplateExportPolicyDoc['allowedFormats'],
						}))
					}
				/>
				{note('켠 형식만 Format에 보여요. 하나는 남겨야 해요.')}
			</div>
		)
	}

	if (axis === 'ppi') {
		const options = PRINT_PPI_VALUES.map(String)
		const size = config.template.exportOption.printSizeMm
		const printable = (
			size ? printablePpiOptions(size.width, size.height, PRINT_PPI_VALUES) : PRINT_PPI_VALUES
		).map(String)
		const selected = selectedOf(options, policy.print?.allowedPpi)
		const onPrintable = selected.filter((value) => printable.includes(value))
		return (
			<div className="flex flex-col gap-1.5">
				<ChoiceToggle
					label="worker가 고를 수 있는 인쇄 해상도"
					options={options}
					format={(value) => `${value}ppi`}
					selected={selected}
					// 이 판 크기로 파일을 못 만드는 값은 켤 수 없고, 만들 수 있는 값은 하나 남긴다.
					locked={(value) =>
						(!printable.includes(value) && !selected.includes(value)) ||
						isLast(onPrintable, value)
					}
					busy={manager.busy}
					onChange={(next) =>
						next.some((value) => printable.includes(value)) &&
						change((current) => ({
							...current,
							print: {
								...current.print,
								allowedPpi: restrictionOf(options, next)?.map(Number) ?? null,
							},
						}))
					}
				/>
				{note(
					printable.length < options.length
						? '켠 해상도만 Resolution에 보여요. 흐린 값은 이 판 크기로 파일을 만들 수 없어요.'
						: '켠 해상도만 Resolution에 보여요. 하나는 남겨야 해요.',
				)}
			</div>
		)
	}

	const video = config.artifacts.video ?? DEFAULT_RASTER_VIDEO_CAPABILITY

	if (axis === 'fps') {
		const options = video.fps.map(String)
		const selected = selectedOf(options, policy.video?.allowedFps)
		return (
			<div className="flex flex-col gap-1.5">
				<ChoiceToggle
					label="worker가 고를 수 있는 영상 프레임"
					options={options}
					format={(value) => `${value}fps`}
					selected={selected}
					locked={(value) => isLast(selected, value)}
					busy={manager.busy}
					onChange={(next) =>
						next.length > 0 &&
						change((current) => ({
							...current,
							video: {
								...current.video,
								allowedFps: restrictionOf(options, next)?.map(Number) ?? null,
							},
						}))
					}
				/>
				{note('켠 프레임만 FPS에 보여요. 하나는 남겨야 해요.')}
			</div>
		)
	}

	// 저장하면 다시 읽은 값으로 새로 시작한다.
	return (
		<VideoLimitsForm
			key={JSON.stringify(policy.video ?? null)}
			stored={policy.video}
			caps={video}
			busy={manager.busy}
			onSave={(limits) =>
				change((current) => ({ ...current, video: { ...current.video, ...limits } }))
			}
		>
			{note('비우면 Runtime 한도까지 쓸 수 있어요. 저장하면 모든 사용자에게 바로 반영돼요.')}
		</VideoLimitsForm>
	)
}

type VideoLimitKey = (typeof VIDEO_LIMITS)[number]['key']

function VideoLimitsForm({
	stored,
	caps,
	busy,
	onSave,
	children,
}: {
	stored: TemplateExportPolicyDoc['video']
	caps: Record<VideoLimitKey, number>
	busy: boolean
	onSave: (limits: Record<VideoLimitKey, number | null>) => void
	children: ReactNode
}) {
	const [text, setText] = useState(() =>
		Object.fromEntries(VIDEO_LIMITS.map(({ key }) => [key, String(stored?.[key] ?? '')])),
	)
	// '' = 제한 없음(null), 범위 밖·숫자 아님 = undefined.
	const parsed = Object.fromEntries(
		VIDEO_LIMITS.map(({ key, min }) => {
			if (text[key].trim() === '') return [key, null]
			const value = Number(text[key])
			return [
				key,
				Number.isFinite(value) && value >= min && value <= caps[key] ? value : undefined,
			]
		}),
	) as Record<VideoLimitKey, number | null | undefined>
	const valid = VIDEO_LIMITS.every(({ key }) => parsed[key] !== undefined)
	const id = useId()
	return (
		<div className="flex flex-col gap-2">
			{VIDEO_LIMITS.map(({ key, label, unit, min }) => (
				<div key={key} className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<Typography as="span" size="sm" aria-hidden className="w-16 shrink-0">
							{label}
						</Typography>
						<Input
							aria-label={`${label} (${unit})`}
							inputMode={key === 'maxDurationSeconds' ? 'decimal' : 'numeric'}
							value={text[key]}
							placeholder={`최대 ${caps[key]}`}
							aria-invalid={parsed[key] === undefined}
							aria-describedby={`${id}-${key}`}
							onChange={(event) => setText({ ...text, [key]: event.target.value })}
						/>
						<Typography as="span" size="xs" tone="muted" className="w-6 shrink-0">
							{unit}
						</Typography>
					</div>
					<FieldError id={`${id}-${key}`} className="text-xs">
						{parsed[key] === undefined
							? `${min}~${caps[key]}${unit} 사이 숫자로 적어 주세요.`
							: null}
					</FieldError>
				</div>
			))}
			<Button
				size="sm"
				disabled={!valid || busy}
				onClick={() => onSave(parsed as Record<VideoLimitKey, number | null>)}
			>
				저장
			</Button>
			{children}
		</div>
	)
}

/** 여러 개를 켜고 끄는 줄 — 고르는 즉시 반영된다. */
function ChoiceToggle({
	label,
	options,
	format,
	selected,
	locked,
	busy,
	onChange,
}: {
	label: string
	options: readonly string[]
	format: (value: string) => string
	selected: readonly string[]
	locked: (value: string) => boolean
	busy: boolean
	onChange: (next: string[]) => void
}) {
	return (
		<ToggleGroup
			type="multiple"
			variant="outline"
			size="sm"
			spacing={0}
			value={[...selected]}
			disabled={busy}
			onValueChange={onChange}
			aria-label={label}
			className="w-full"
		>
			{options.map((value) => (
				<ToggleGroupItem
					key={value}
					value={value}
					disabled={locked(value)}
					className="flex-1"
				>
					{format(value)}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}

/** 저장값 중 후보에 있는 것. 저장값이 없거나 비면 전부 켠 것이다(빈 목록 = 제한 없음). */
function selectedOf(options: readonly string[], stored: unknown): string[] {
	if (!Array.isArray(stored) || stored.length === 0) return [...options]
	const on = new Set(stored.map(String))
	return options.filter((value) => on.has(value))
}

/** 다 켜면 제한 없음(`null`), 아니면 후보 순서대로. */
function restrictionOf(options: readonly string[], next: readonly string[]): string[] | null {
	const on = options.filter((value) => next.includes(value))
	return on.length === options.length ? null : on
}

function isLast(selected: readonly string[], value: string): boolean {
	return selected.length === 1 && selected[0] === value
}
