'use client'

import { FieldDescription, FieldError, useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import type { ComponentProps } from 'react'
import { AdminSectionHeading } from '@/components/admin/shared/admin-section-heading'
import { Controller } from '@/components/shared/controller'
import {
	type ControllerControlDefinition,
	type ControllerControlRestriction,
	isControllerPadValue,
	type StudioControllerRestrictions,
} from '@/modules/studio-controller/controller-definition'
import {
	type StudioAdminBaseConfig,
	type StudioAdminRuntimeSource,
	useStudioRuntimeManifest,
} from './use-studio-runtime-manifest'

type ControllerAdminFieldProps = ComponentProps<JSONFieldClientComponent> & {
	source: StudioAdminRuntimeSource
	baseConfigs?: readonly StudioAdminBaseConfig[]
}

type StoredControllerPresentation = {
	groups: { groupId: string; collapsible?: boolean; defaultOpen?: boolean }[]
}

const ON_OFF = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

const AVAILABILITY_OPTIONS = [
	{ value: 'default', label: '원본 사용' },
	{ value: 'readonly', label: '읽기 전용' },
	{ value: 'disabled', label: '사용 안 함' },
] as const

/** 셀렉트 기본값의 '선택 없음' — radix Select는 빈 문자열 값을 예약하므로 sentinel을 쓴다. */
const NONE = '__none__'

/** Runtime Manifest의 Controller projection을 읽기 전용으로 보여주고 제약값만 저장한다. */
export function StudioControllerRestrictionsField({
	path,
	source,
	baseConfigs = [],
}: ControllerAdminFieldProps) {
	const { disabled, errorMessage, setValue, showError, value } = useField<unknown>({ path })
	const groups = useStudioRuntimeManifest(source, baseConfigs)?.controller.groups ?? []
	const current = readRestrictions(value)

	function update(controlId: string, patch: Partial<ControllerControlRestriction>) {
		const previous = current.controls.find((control) => control.controlId === controlId) ?? {
			controlId,
		}
		const next = { ...previous, ...patch }
		for (const [key, entry] of Object.entries(next)) {
			if (entry === undefined) delete next[key as keyof typeof next]
		}
		const controls = current.controls.filter((control) => control.controlId !== controlId)
		if (Object.keys(next).length > 1) controls.push(next)
		setValue({ controls })
	}

	return (
		<div className="lbs-kit field-type json mb-20">
			<AdminSectionHeading>컨트롤러 제한</AdminSectionHeading>
			<FieldError message={errorMessage} path={path} showError={showError} />
			<div className="flex flex-col gap-2 rounded-3xl border bg-background px-3 pt-6 pb-3">
				{groups.length === 0 ? (
					<EmptyControllerMessage source={source} />
				) : (
					groups.map((group) => (
						<Controller.Group key={group.id} title={group.title} collapsible={false}>
							<div className="flex flex-col gap-4">
								{group.controls.map((control) => (
									<ControlRestrictionEditor
										key={control.id}
										control={control}
										disabled={disabled}
										restriction={current.controls.find(
											(candidate) => candidate.controlId === control.id,
										)}
										onChange={(patch) => update(control.id, patch)}
									/>
								))}
							</div>
						</Controller.Group>
					))
				)}
			</div>
			<FieldDescription
				description="컨트롤 종류·라벨·표시 형식은 원본 Definition이 소유합니다. 여기서는 기본값과 실행 범위만 좁힙니다."
				path={path}
			/>
		</div>
	)
}

/** Runtime 그룹의 접힘 가능 여부와 최초 열림값만 Admin 정책으로 저장한다. */
export function StudioControllerPresentationField({
	path,
	source,
	baseConfigs = [],
}: ControllerAdminFieldProps) {
	const { disabled, errorMessage, setValue, showError, value } = useField<unknown>({ path })
	const groups = useStudioRuntimeManifest(source, baseConfigs)?.controller.groups ?? []
	const current = readPresentation(value)
	const knownGroupIds = new Set(groups.map(({ id }) => id))
	const hasStaleGroups = current.groups.some(({ groupId }) => !knownGroupIds.has(groupId))

	function update(
		groupId: string,
		patch: Partial<{ collapsible: boolean; defaultOpen: boolean }>,
	) {
		const previous = current.groups.find((group) => group.groupId === groupId)
		const next = { ...previous, groupId, ...patch }
		const overrides = {
			...(next.collapsible === false ? { collapsible: false } : {}),
			...(next.collapsible !== false && next.defaultOpen === false
				? { defaultOpen: false }
				: {}),
		}
		const presentationGroups = current.groups.filter(
			(group) => group.groupId !== groupId && knownGroupIds.has(group.groupId),
		)
		if (Object.keys(overrides).length) presentationGroups.push({ groupId, ...overrides })
		setValue({ groups: presentationGroups })
	}

	return (
		<div className="lbs-kit field-type json mb-20">
			<AdminSectionHeading>컨트롤러 표현</AdminSectionHeading>
			<FieldError message={errorMessage} path={path} showError={showError} />
			{hasStaleGroups && (
				<button
					type="button"
					className="mb-3 text-destructive text-sm underline"
					disabled={disabled}
					onClick={() =>
						setValue({
							groups: current.groups.filter(({ groupId }) =>
								knownGroupIds.has(groupId),
							),
						})
					}
				>
					현재 Runtime에 없는 그룹 설정 정리
				</button>
			)}
			<div className="flex flex-col gap-2 rounded-3xl border bg-background px-3 pt-6 pb-3">
				{groups.length === 0 ? (
					<EmptyControllerMessage source={source} />
				) : (
					groups.map((group) => {
						const policy = current.groups.find(({ groupId }) => groupId === group.id)
						const collapsible = policy?.collapsible ?? true
						const defaultOpen = collapsible ? (policy?.defaultOpen ?? true) : true
						return (
							<Controller.Group
								key={group.id}
								title={group.title}
								collapsible={false}
							>
								<div className="grid grid-cols-1 gap-1 md:grid-cols-2">
									<Controller.Row label="접기 허용" disabled={disabled}>
										<Controller.Segmented
											aria-label={`${group.title} 접기 허용`}
											options={ON_OFF}
											value={collapsible ? 'on' : 'off'}
											onChange={(next) =>
												update(group.id, { collapsible: next === 'on' })
											}
										/>
									</Controller.Row>
									<Controller.Row
										label="처음 열기"
										disabled={disabled || !collapsible}
									>
										<Controller.Segmented
											aria-label={`${group.title} 처음 열기`}
											options={ON_OFF}
											value={defaultOpen ? 'on' : 'off'}
											onChange={(next) =>
												update(group.id, { defaultOpen: next === 'on' })
											}
										/>
									</Controller.Row>
								</div>
							</Controller.Group>
						)
					})
				)}
			</div>
			<FieldDescription
				description="현재 열림 상태는 Creator 화면이 로컬로 소유하며, 여기서는 접힘 가능 여부와 최초 열림값만 정합니다."
				path={path}
			/>
		</div>
	)
}

function EmptyControllerMessage({ source }: { source: ControllerAdminFieldProps['source'] }) {
	return (
		<p className="text-muted-foreground text-sm">
			{source === 'graphic'
				? 'Runtime을 선택하면 설정 가능한 그룹이 표시됩니다.'
				: source === 'image'
					? '이미지 기능을 선택하면 설정 가능한 그룹이 표시됩니다.'
					: 'Template HTML을 가져오면 설정 가능한 그룹이 표시됩니다.'}
		</p>
	)
}

function ControlRestrictionEditor({
	control,
	disabled,
	restriction,
	onChange,
}: {
	control: ControllerControlDefinition
	disabled?: boolean
	restriction?: ControllerControlRestriction
	onChange: (patch: Partial<ControllerControlRestriction>) => void
}) {
	const overridesDefault = restriction && Object.hasOwn(restriction, 'defaultValue')
	return (
		<div className="flex flex-col gap-1">
			{/* 컨트롤 이름 행 — 레이어 카드 제목과 같은 좌측 8px 정렬. */}
			<div className="flex h-8 items-center justify-between px-2">
				<span className="font-medium text-sm">{control.label}</span>
				<span className="text-muted-foreground text-xs">{control.id}</span>
			</div>
			<Controller.Row label="사용 상태" disabled={disabled}>
				<Controller.Segmented
					aria-label={`${control.label} 사용 상태`}
					options={AVAILABILITY_OPTIONS}
					value={restriction?.availability ?? 'default'}
					onChange={(next) =>
						onChange({
							availability:
								next === 'readonly' || next === 'disabled' ? next : undefined,
						})
					}
				/>
			</Controller.Row>
			<Controller.Row label="기본값 재정의" disabled={disabled}>
				<Controller.Segmented
					aria-label={`${control.label} 기본값 재정의`}
					options={ON_OFF}
					value={overridesDefault ? 'on' : 'off'}
					onChange={(next) =>
						onChange({
							defaultValue: next === 'on' ? control.defaultValue : undefined,
						})
					}
				/>
			</Controller.Row>
			{overridesDefault ? (
				<DefaultValueEditor
					control={control}
					disabled={disabled}
					value={restriction.defaultValue}
					onChange={(defaultValue) => onChange({ defaultValue })}
				/>
			) : null}
			{control.kind === 'text' ? (
				<NumberRestriction
					label="최대 글자 수"
					original={control.maxLength}
					value={restriction?.maxLength}
					disabled={disabled}
					onChange={(maxLength) => onChange({ maxLength })}
				/>
			) : null}
			{control.kind === 'range' ? (
				<div className="grid grid-cols-1 gap-1 md:grid-cols-2">
					<NumberRestriction
						label="최솟값"
						original={control.min}
						value={restriction?.min}
						disabled={disabled}
						onChange={(min) => onChange({ min })}
					/>
					<NumberRestriction
						label="최댓값"
						original={control.max}
						value={restriction?.max}
						disabled={disabled}
						onChange={(max) => onChange({ max })}
					/>
				</div>
			) : null}
			{control.kind === 'select' ? (
				<Controller.Row label="허용 선택지" disabled={disabled}>
					<Controller.Chips
						aria-label={`${control.label} 허용 선택지`}
						options={control.options}
						value={control.options
							.map(({ value }) => value)
							.filter(
								(candidate) =>
									restriction?.optionValues?.includes(candidate) ?? true,
							)}
						onChange={(next) => {
							const optionValues = control.options
								.map(({ value }) => value)
								.filter((candidate) => next.includes(candidate))
							onChange({
								optionValues:
									optionValues.length === control.options.length
										? undefined
										: optionValues,
							})
						}}
					/>
				</Controller.Row>
			) : null}
			{control.kind === 'color' ? (
				<ColorValuesRestriction
					baseValues={control.values}
					value={restriction?.colorValues}
					disabled={disabled}
					onChange={(colorValues) => onChange({ colorValues })}
				/>
			) : null}
		</div>
	)
}

/**
 * color control의 허용 색 좁힘 — 원본이 자유 색상이라 고를 목록이 없으므로 hex를 직접 적는다.
 * 비우면 좁히지 않는다(자유 색상 유지).
 */
function ColorValuesRestriction({
	baseValues,
	value,
	disabled,
	onChange,
}: {
	baseValues?: readonly string[]
	value?: readonly string[]
	disabled?: boolean
	onChange: (value: readonly string[] | undefined) => void
}) {
	return (
		<Controller.Field
			label={`허용 색 (원본 ${baseValues?.length ? `${baseValues.length}개` : '자유 색상'})`}
			disabled={disabled}
		>
			<Controller.Input
				className="text-left font-mono"
				placeholder="#000000, #ffffff — 비우면 자유 색상"
				value={value?.join(', ') ?? ''}
				onChange={(event) => onChange(parseColorValues(event.currentTarget.value))}
			/>
			{value?.length ? (
				<div className="mt-1 flex flex-wrap gap-1">
					{value.map((color) => (
						<span
							key={color}
							title={color}
							// 색은 데이터라 style로 흐른다(docs/09 §4 예외).
							style={{ backgroundColor: color }}
							className="size-5 rounded-sm border"
						/>
					))}
				</div>
			) : null}
		</Controller.Field>
	)
}

function parseColorValues(input: string): readonly string[] | undefined {
	const values = input
		.split(/[,\s]+/)
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean)
	return values.length > 0 ? [...new Set(values)] : undefined
}

function DefaultValueEditor({
	control,
	disabled,
	value,
	onChange,
}: {
	control: ControllerControlDefinition
	disabled?: boolean
	value: ControllerControlRestriction['defaultValue']
	onChange: (value: ControllerControlRestriction['defaultValue']) => void
}) {
	if (control.kind === 'toggle') {
		return (
			<Controller.Row label="기본값" disabled={disabled}>
				<Controller.Segmented
					aria-label={`${control.label} 기본값`}
					options={ON_OFF}
					value={value === true ? 'on' : 'off'}
					onChange={(next) => onChange(next === 'on')}
				/>
			</Controller.Row>
		)
	}
	if (control.kind === 'select') {
		return (
			<Controller.Row label="기본값" disabled={disabled}>
				<Controller.Select
					options={[
						{ value: NONE, label: '선택 없음' },
						...control.options.map(({ value: optionValue, label }) => ({
							value: optionValue,
							label,
						})),
					]}
					value={typeof value === 'string' && value ? value : NONE}
					onChange={(next) => onChange(next === NONE ? null : next)}
				/>
			</Controller.Row>
		)
	}
	if (control.kind === 'pad') {
		const point =
			value !== undefined && isControllerPadValue(value) ? value : control.defaultValue
		return (
			<div className="grid grid-cols-1 gap-1 md:grid-cols-2">
				{(['x', 'y'] as const).map((axis) => (
					<Controller.Row
						key={axis}
						label={`기본값 ${axis.toUpperCase()}`}
						disabled={disabled}
					>
						<Controller.Input
							type="number"
							min={-1}
							max={1}
							step="any"
							value={point[axis]}
							onChange={(event) =>
								onChange({ ...point, [axis]: Number(event.currentTarget.value) })
							}
						/>
					</Controller.Row>
				))}
			</div>
		)
	}
	if (control.kind === 'color') {
		return (
			<Controller.ColorRow
				label="기본값"
				disabled={disabled}
				value={typeof value === 'string' ? value : ''}
				isEmpty={typeof value !== 'string' || !value}
				onChange={(hex) => onChange(hex)}
			/>
		)
	}
	return (
		<Controller.Row label="기본값" disabled={disabled}>
			<Controller.Input
				type={control.kind === 'range' ? 'number' : 'text'}
				value={typeof value === 'string' || typeof value === 'number' ? value : ''}
				onChange={(event) =>
					onChange(
						control.kind === 'range'
							? Number(event.currentTarget.value)
							: event.currentTarget.value,
					)
				}
			/>
		</Controller.Row>
	)
}

function NumberRestriction({
	label,
	original,
	value,
	disabled,
	onChange,
}: {
	label: string
	original?: number
	value?: number
	disabled?: boolean
	onChange: (value: number | undefined) => void
}) {
	return (
		<Controller.Row label={label} disabled={disabled}>
			<Controller.Input
				type="number"
				placeholder={`원본 ${original ?? '없음'}`}
				value={value ?? ''}
				onChange={(event) =>
					onChange(
						event.currentTarget.value ? Number(event.currentTarget.value) : undefined,
					)
				}
			/>
		</Controller.Row>
	)
}

function readRestrictions(value: unknown): StudioControllerRestrictions {
	if (
		!value ||
		typeof value !== 'object' ||
		!Array.isArray((value as { controls?: unknown }).controls)
	) {
		return { controls: [] }
	}
	return value as StudioControllerRestrictions
}

function readPresentation(value: unknown): StoredControllerPresentation {
	if (
		!value ||
		typeof value !== 'object' ||
		!Array.isArray((value as { groups?: unknown }).groups)
	) {
		return { groups: [] }
	}
	return value as StoredControllerPresentation
}
