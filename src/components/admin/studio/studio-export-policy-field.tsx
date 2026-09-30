'use client'

import { useField } from '@payloadcms/ui'
import { useEffect } from 'react'
import { AdminSectionHeading } from '@/components/admin/shared/admin-section-heading'
import { Controller } from '@/components/shared/controller'
import type { StudioOutputFormat } from '@/features/studio-export/export-contract'
import {
	resolveStudioArtifactOutputFormats,
	resolveStudioOutputCapability,
} from '@/features/studio-export/studio-output'
import { GUARANTEED_TEMPLATE_FORMATS } from '@/features/template-customization/domain/template-studio-config'
import {
	type StudioAdminBaseConfig,
	type StudioAdminRuntimeSource,
	useStudioRuntimeManifest,
} from './use-studio-runtime-manifest'

/**
 * 정본(76:4)의 형식 어휘는 4범주다 — 저장 계약(allowedFormats: 형식 목록)은 그대로 두고
 * 어드민 표시만 범주로 묶는다. 범주 토글은 그 범주의 지원 형식 전체를 켜고 끈다.
 */
const FORMAT_CATEGORIES: readonly {
	value: string
	label: string
	formats: readonly StudioOutputFormat[]
}[] = [
	{ value: 'print', label: '인쇄', formats: ['tiff', 'pdf'] },
	{ value: 'raster', label: '래스터', formats: ['png', 'jpeg'] },
	{ value: 'vector', label: '벡터', formats: ['svg'] },
	{ value: 'video', label: '영상', formats: ['mp4'] },
]

const ON_OFF = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

function NumberOptionChips({
	label,
	unit,
	numbers,
	value,
	disabled,
	onChange,
}: {
	label: string
	/** 칩 라벨 접미(정본 76:4 표기): 72ppi·24fps. */
	unit: 'ppi' | 'fps'
	numbers: readonly number[]
	value: readonly number[] | null | undefined
	disabled?: boolean
	onChange: (next: number[] | undefined) => void
}) {
	const selected = Array.isArray(value) ? value.filter((v) => numbers.includes(v)) : numbers
	if (numbers.length === 0) return null
	return (
		<Controller.Row label={label}>
			<Controller.Chips
				aria-label={label}
				disabled={disabled}
				options={numbers.map((number) => ({
					value: String(number),
					label: `${number}${unit}`,
				}))}
				value={selected.map(String)}
				onChange={(next) => {
					const allowed = numbers.filter((candidate) => next.includes(String(candidate)))
					onChange(allowed.length === numbers.length ? undefined : allowed)
				}}
			/>
		</Controller.Row>
	)
}

function NumberInputRow({
	label,
	unit,
	min,
	value,
	disabled,
	onChange,
}: {
	label: string
	/** 값 오른쪽의 단위 표기(정본 76:4): s·px. */
	unit: string
	min: number
	value: number | null | undefined
	disabled?: boolean
	onChange: (next: number | undefined) => void
}) {
	return (
		<Controller.Row label={label} disabled={disabled}>
			{/* 정본은 값이 행 오른끝 정렬 — 입력을 우측 정렬하고 단위를 붙인다. */}
			<span className="flex min-w-0 flex-1 items-center justify-end gap-1">
				<Controller.Input
					type="number"
					min={min}
					value={value ?? ''}
					placeholder="제한 없음"
					className="text-right"
					onChange={(event) => {
						if (event.target.value === '') return onChange(undefined)
						const parsed = Number(event.target.value)
						if (Number.isFinite(parsed)) onChange(parsed)
					}}
				/>
				<span className="shrink-0 text-muted-foreground text-sm">{unit}</span>
			</span>
		</Controller.Row>
	)
}

export function StudioExportPolicyField({
	path,
	source,
	baseConfigs = [],
	includeOriginal = false,
}: {
	path: string
	source: StudioAdminRuntimeSource
	baseConfigs?: readonly StudioAdminBaseConfig[]
	includeOriginal?: boolean
}) {
	const formatsField = useField<readonly StudioOutputFormat[] | null | undefined>({
		path: `${path}.allowedFormats`,
	})
	const ppiField = useField<readonly number[] | null | undefined>({
		path: `${path}.print.allowedPpi`,
	})
	const fpsField = useField<readonly number[] | null | undefined>({
		path: `${path}.video.allowedFps`,
	})
	const durationField = useField<number | null | undefined>({
		path: `${path}.video.maxDurationSeconds`,
	})
	const widthField = useField<number | null | undefined>({ path: `${path}.video.maxWidth` })
	const heightField = useField<number | null | undefined>({ path: `${path}.video.maxHeight` })
	const originalField = useField<boolean | null | undefined>({ path: `${path}.original` })

	const manifest = useStudioRuntimeManifest(source, baseConfigs)
	const supportedFormats = manifest
		? resolveStudioArtifactOutputFormats(manifest.artifacts, undefined)
		: []
	const output = manifest ? resolveStudioOutputCapability(manifest.artifacts) : null

	const restricted = Array.isArray(formatsField.value)
	const selectedFormats = new Set(restricted ? formatsField.value : supportedFormats)
	const supportedKey = supportedFormats.join(',')
	const { setValue: setFormats, value: formatsValue } = formatsField

	// Runtime이 지원하지 않게 된 형식이 저장값에 남아 조용히 되살아나지 않게 잘라낸다.
	useEffect(() => {
		if (!Array.isArray(formatsValue)) return
		const supported = new Set(supportedKey.split(','))
		const next = formatsValue.filter((format) => supported.has(format))
		if (next.length !== formatsValue.length) setFormats(next)
	}, [supportedKey, formatsValue, setFormats])

	// 🔴 템플릿의 벡터(svg·pdf)는 정책이 지울 수 없다(`GUARANTEED_TEMPLATE_FORMATS`가 정본).
	//    끌 수 있어 보이는데 안 꺼지는 토글을 남기면 「껐는데 왜 나오지」로 다시 헤맨다 —
	//    그 형식을 범주에서 빼고, 그래서 빈 범주가 되면 범주째 지운다(벡터가 그렇다).
	const guaranteed: readonly string[] = source === 'template' ? GUARANTEED_TEMPLATE_FORMATS : []
	const categories = FORMAT_CATEGORIES.map((category) => ({
		...category,
		supported: category.formats.filter(
			(format) => supportedFormats.includes(format) && !guaranteed.includes(format),
		),
	})).filter((category) => category.supported.length > 0)
	const onCategories = categories
		.filter((category) => category.supported.every((format) => selectedFormats.has(format)))
		.map((category) => category.value)

	return (
		<div className="lbs-kit field-type group mb-20">
			<AdminSectionHeading>출력 설정</AdminSectionHeading>
			<div className="flex flex-col gap-2 rounded-3xl border bg-background px-3 pt-6 pb-3">
				{supportedFormats.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{source === 'template'
							? '배경 형식을 하나 이상 허용해 주세요.'
							: 'Runtime을 먼저 선택해 주세요.'}
					</p>
				) : (
					<>
						<Controller.Group title="허용" collapsible={false}>
							<Controller.Row label="형식">
								<Controller.Chips
									aria-label="허용 형식"
									disabled={formatsField.disabled}
									options={categories.map(({ value, label }) => ({
										value,
										label,
									}))}
									value={onCategories}
									onChange={(next) => {
										const allowed = supportedFormats.filter((format) =>
											categories.some(
												(category) =>
													next.includes(category.value) &&
													category.supported.includes(format),
											),
										)
										setFormats(
											allowed.length === supportedFormats.length
												? undefined
												: allowed,
										)
									}}
								/>
							</Controller.Row>
						</Controller.Group>

						{output?.print && (
							<Controller.Group title="인쇄" collapsible={false}>
								<NumberOptionChips
									label="사용할 인쇄 해상도"
									unit="ppi"
									numbers={output.print.ppi}
									value={ppiField.value}
									disabled={ppiField.disabled}
									onChange={(next) => ppiField.setValue(next)}
								/>
							</Controller.Group>
						)}

						{output?.video && (
							<Controller.Group title="영상" collapsible={false}>
								<NumberOptionChips
									label="사용할 영상 프레임"
									unit="fps"
									numbers={output.video.mp4.fps}
									value={fpsField.value}
									disabled={fpsField.disabled}
									onChange={(next) => fpsField.setValue(next)}
								/>
								<NumberInputRow
									label="최대 영상 길이"
									unit="s"
									min={0.1}
									value={durationField.value}
									disabled={durationField.disabled}
									onChange={(next) => durationField.setValue(next)}
								/>
								<div className="grid grid-cols-1 gap-1 md:grid-cols-2">
									<NumberInputRow
										label="최대 너비"
										unit="px"
										min={1}
										value={widthField.value}
										disabled={widthField.disabled}
										onChange={(next) => widthField.setValue(next)}
									/>
									<NumberInputRow
										label="최대 높이"
										unit="px"
										min={1}
										value={heightField.value}
										disabled={heightField.disabled}
										onChange={(next) => heightField.setValue(next)}
									/>
								</div>
							</Controller.Group>
						)}

						{includeOriginal && (
							<Controller.Group title="원본" collapsible={false}>
								<Controller.Row label="원본 다운로드 허용">
									<Controller.Segmented
										aria-label="원본 다운로드 허용"
										options={ON_OFF}
										disabled={originalField.disabled}
										value={(originalField.value ?? true) ? 'on' : 'off'}
										onChange={(next) => originalField.setValue(next === 'on')}
									/>
								</Controller.Row>
							</Controller.Group>
						)}
					</>
				)}
			</div>
		</div>
	)
}
