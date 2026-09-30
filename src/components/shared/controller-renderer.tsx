'use client'

import { Reset } from '@carbon/icons-react'
import type { ReactNode } from 'react'
import { Controller } from '@/components/shared/controller'
import type { ControllerGroupSectionProps } from '@/components/shared/controller/group'
import { FieldError } from '@/components/ui/field'
import type {
	ControllerControlDefinition,
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerGroupPresentation,
	ControllerRuntimeBinding,
	ControllerRuntimeBindings,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'
import {
	isControllerPadPairValue,
	isControllerPadValue,
	resolveControllerAvailability,
} from '@/modules/studio-controller/controller-definition'

/**
 * toggle(boolean)의 표현은 세그먼트 On|Off 하나뿐이다 — 계약 밖 boolean 행(레이어 가시성)도 이걸 쓴다.
 * 순서는 디자인 SSOT(Figma HD_LBS_UI 4:5822 "Toggle")가 정한다 — On이 왼쪽이다.
 */
export const CONTROLLER_TOGGLE_OPTIONS = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

/**
 * `asset` control의 출처별 화면. 🔴 킷은 목록을 모른다 — 도메인을 아는 쪽이 이 맵으로 주입한다.
 * 주지 않으면 그 control은 읽기 전용 행으로 떨어진다(화면이 비어 죽지 않게).
 */
export type ControllerAssetSources = Partial<
	Record<
		Extract<ControllerControlDefinition, { kind: 'asset' }>['source'],
		(props: {
			label: string
			value: string | null
			disabled?: boolean
			onChange: (value: string | null) => void
		}) => ReactNode
	>
>

type ControllerRendererProps = {
	groups: readonly ControllerGroupDefinition[]
	presentation?: { groups: readonly ControllerGroupPresentation[] }
	values: ControllerValues
	bindings?: ControllerRuntimeBindings
	onChange: (controlId: string, value: ControllerControlValue) => void
	assetSources?: ControllerAssetSources
	/** 첫 그룹의 위 구분선을 걷는다. 이 목록 앞에 다른 그룹이 서면 `false`를 준다. */
	first?: boolean
}

/** 직렬화된 Definition과 세션 값을 도메인 지식 없이 Controller primitive로 투영한다. */
export function ControllerRenderer({
	groups,
	presentation,
	values,
	bindings,
	onChange,
	assetSources,
	first = true,
}: ControllerRendererProps) {
	return (
		<>
			{groups.map((group, index) => {
				const combination = resolveColorCombinationGroup(group)
				const content = combination ? (
					<ColorStripGroup
						palette={combination.palette}
						colors={combination.colors}
						title={group.title}
						values={values}
						bindings={bindings}
						onChange={onChange}
					/>
				) : (
					group.controls.map((control) => (
						<ControllerControlRenderer
							key={control.id}
							definition={control}
							value={control.id in values ? values[control.id] : control.defaultValue}
							binding={bindings?.[control.id]}
							assetSources={assetSources}
							onChange={(value) => onChange(control.id, value)}
						/>
					))
				)

				return (
					<ControllerGroupRenderer
						key={group.id}
						definition={group}
						first={first && index === 0}
						presentation={presentation?.groups.find(
							({ groupId }) => groupId === group.id,
						)}
					>
						{content}
					</ControllerGroupRenderer>
				)
			})}
		</>
	)
}

type ColorControl = Extract<ControllerControlDefinition, { kind: 'color' }>
type SelectControl = Extract<ControllerControlDefinition, { kind: 'select' }>

/**
 * 🔑 그룹의 컨트롤이 전부 색이면 그 그룹은 「색 조합」이다 — 행으로 쌓지 않고 한 띠로 그린다.
 *
 * 데이터 모양으로 판정하는 것은 「선택지가 전부 색이면 칩 그리드」와 같은 방식이다(아래 select).
 * 계약에 표현 플래그를 더하지 않는 이유가 그것이다 — 색만 모인 그룹은 이미 조합을 뜻한다.
 * 칸이 하나뿐이면 띠가 될 것이 없으므로 평소의 색 행으로 떨어진다.
 *
 * 🔑 색 칸 앞에 **조합을 고르는 select 하나**가 서 있어도 같은 그룹이다. 그때는 칩 그리드가 띠 위에
 *    서고, 고르면 선택지의 `colors`가 **칸 순서대로** 띠를 채운다 — 고르기와 편집이 한 자리에 있고
 *    띠는 언제나 화면에 그려지는 색을 보여준다. 선택지의 색 개수가 칸 수와 어긋나면 채울 짝이
 *    없으므로 조합으로 보지 않는다(평소의 행으로 떨어진다).
 */
function resolveColorCombinationGroup(group: ControllerGroupDefinition) {
	const colors = group.controls.filter(
		(control): control is ColorControl => control.kind === 'color' && !control.values?.length,
	)
	if (colors.length < 2) return null
	const rest = group.controls.filter((control) => !colors.includes(control as ColorControl))
	if (rest.length === 0) return { palette: null, colors }
	if (rest.length > 1) return null
	const [palette] = rest
	if (palette.kind !== 'select') return null
	return palette.options.every((option) => option.colors?.length === colors.length)
		? { palette: palette as SelectControl, colors }
		: null
}

/** 색 조합 그룹을 「팔레트 칩 + 한 띠」로 투영한다. 되돌리기는 조합을 한 번에 비운다. */
function ColorStripGroup({
	palette,
	colors,
	title,
	values,
	bindings,
	onChange,
}: {
	palette: SelectControl | null
	colors: readonly ColorControl[]
	title: string
	values: ControllerValues
	bindings?: ControllerRuntimeBindings
	onChange: (controlId: string, value: ControllerControlValue) => void
}) {
	const resolved = colors.map((control) => {
		const value = control.id in values ? values[control.id] : control.defaultValue
		return {
			control,
			availability: resolveControllerAvailability(
				control.availability,
				bindings?.[control.id]?.availability,
			),
			color: typeof value === 'string' ? value : null,
		}
	})
	// 한 칸이라도 잠기면 띠를 통째로 잠근다 — 칸마다 다른 잠금은 띠 안에서 읽히지 않는다.
	const disabled = resolved.some(({ availability }) => availability === 'disabled')
	const readonly = resolved.some(({ availability }) => availability === 'readonly')
	const selected = palette && typeof values[palette.id] === 'string' ? values[palette.id] : null
	const selectedPalette =
		palette && (selected ?? palette.defaultValue) !== null
			? ((selected ?? palette.defaultValue) as string)
			: undefined
	if (!disabled && readonly) {
		return (
			<>
				{palette && (
					<ReadonlyRow
						label={palette.label}
						value={
							palette.options.find((option) => option.value === selectedPalette)
								?.label ?? '—'
						}
					/>
				)}
				{resolved.map(({ control, color }) => (
					<ReadonlyRow key={control.id} label={control.label} value={color ?? '—'} />
				))}
			</>
		)
	}

	return (
		<>
			{palette && (
				<Controller.ColorChips
					label={palette.label}
					options={palette.options}
					value={selectedPalette}
					disabled={disabled}
					onChange={(value) => {
						onChange(palette.id, value)
						// 고른 조합이 칸을 순서대로 채운다 — 띠가 화면의 색과 어긋나지 않는다.
						const option = palette.options.find(
							(candidate) => candidate.value === value,
						)
						for (const [index, hex] of (option?.colors ?? []).entries()) {
							const control = colors[index]
							if (control) onChange(control.id, hex)
						}
					}}
				/>
			)}
			<Controller.ColorStrip
				label={title}
				disabled={disabled}
				swatches={resolved.map(({ control, color }) => ({
					id: control.id,
					label: control.label,
					value: color ?? '#000000',
					isEmpty: color === null,
				}))}
				onChange={(id, hex) => onChange(id, hex)}
				onReset={() => {
					// 조합이 한 단위이므로 고른 조합까지 함께 되돌린다.
					// 🔴 칸을 비우지 않고 **원래 색으로 채운다.** null은 「미설정」이라 띠가 흐린 검정이
					//    되는데 화면에는 기본색이 그려져 띠가 거짓말을 한다. 되돌릴 색은 팔레트가 있으면
					//    기본 조합이고, 없으면 각 칸이 선언한 기본값이다(팔레트 없는 런타임도 같아야 한다).
					if (palette) onChange(palette.id, null)
					const fallback = palette?.options.find(
						(option) => option.value === palette.defaultValue,
					)?.colors
					for (const [index, { control }] of resolved.entries()) {
						onChange(control.id, fallback?.[index] ?? control.defaultValue)
					}
				}}
			/>
		</>
	)
}

/** bespoke slot/feature layout에서도 Definition의 그룹 제목·접힘 정책을 그대로 투영한다. */
export function ControllerGroupRenderer({
	definition,
	presentation,
	children,
	first = false,
	attached = false,
	section,
}: {
	definition: ControllerGroupDefinition
	presentation?: ControllerGroupPresentation
	children: ReactNode
	first?: boolean
	/**
	 * 앞 컨트롤을 소유하는 그룹의 하위 섹션으로 그린다 — 구분선을 걷고 여백만 둔다.
	 * 🔴 접히지 않는 그룹은 애초에 구분선이 없다(`Controller.Group`의 non-collapsible 갈래) —
	 *    그래서 이 값은 접히는 갈래에만 넘긴다.
	 */
	attached?: boolean
	/** 섹션 활성화 배선 — `Controller.Group`에 그대로 얹힌다(계약은 그쪽이 갖는다). */
	section?: ControllerGroupSectionProps
}) {
	return (presentation?.collapsible ?? true) ? (
		<Controller.Group
			title={definition.title}
			collapsible
			defaultOpen={presentation?.defaultOpen ?? true}
			attached={attached}
			{...section}
			className={first ? 'border-t-0' : undefined}
		>
			{children}
		</Controller.Group>
	) : (
		<Controller.Group
			title={definition.title}
			collapsible={false}
			{...section}
			className={first ? 'border-t-0' : undefined}
		>
			{children}
		</Controller.Group>
	)
}

type ControllerControlRendererProps = {
	definition: ControllerControlDefinition
	value: ControllerControlValue
	binding?: ControllerRuntimeBinding
	assetSources?: ControllerAssetSources
	onChange: (value: ControllerControlValue) => void
}

/** custom layout에서도 같은 availability·error·readonly·Pad 투영을 재사용하는 단일 control renderer. */
export function ControllerControlRenderer({
	definition,
	value,
	binding,
	assetSources,
	onChange,
}: ControllerControlRendererProps) {
	return (
		<div data-slot="controller-renderer-control" className="flex flex-col gap-1">
			<ControllerControl
				definition={definition}
				value={value}
				availability={resolveControllerAvailability(
					definition.availability,
					binding?.availability,
				)}
				padAspectRatio={binding?.padAspectRatio}
				assetSources={assetSources}
				onChange={onChange}
			/>
			{binding?.error && <FieldError>{binding.error}</FieldError>}
		</div>
	)
}

type ControllerControlProps = {
	definition: ControllerControlDefinition
	value: ControllerControlValue
	availability: ReturnType<typeof resolveControllerAvailability>
	padAspectRatio?: number
	assetSources?: ControllerAssetSources
	onChange: (value: ControllerControlValue) => void
}

function ControllerControl({
	definition,
	value,
	availability,
	padAspectRatio,
	assetSources,
	onChange,
}: ControllerControlProps) {
	const disabled = availability === 'disabled'
	const readonly = availability === 'readonly'

	switch (definition.kind) {
		case 'text': {
			const text = typeof value === 'string' ? value : ''
			if (readonly) return <ReadonlyRow label={definition.label} value={text || '—'} />
			if (definition.multiline) {
				// 되돌릴 것이 없으면 버튼도 없다 — 눌러도 아무 일이 없는 조작 요소를 두지 않는다.
				const resettable = definition.resettable && text !== (definition.defaultValue ?? '')
				return (
					<Controller.Field
						label={definition.label}
						counter={
							definition.maxLength
								? `${text.length}/${definition.maxLength}`
								: undefined
						}
						action={
							resettable ? (
								<Controller.Action
									aria-label={`${definition.label} 초기화`}
									title="기본값으로 되돌리기"
									onClick={() => onChange(definition.defaultValue ?? '')}
								>
									<Reset aria-hidden />
								</Controller.Action>
							) : undefined
						}
						disabled={disabled}
					>
						{definition.grid && (
							<Controller.DataGrid
								value={text}
								columnLabels={definition.grid}
								onChange={onChange}
							/>
						)}
						{/* 격자가 있어도 입력창은 남는다 — 붙여넣기와 통째로 고쳐 쓰기는 격자가 대신하지 못한다. */}
						<Controller.Textarea
							rows={definition.rows ?? 3}
							className="field-sizing-fixed min-h-0 overflow-y-auto scrollbar-none"
							value={text}
							maxLength={definition.maxLength}
							placeholder={definition.placeholder}
							onChange={(event) => onChange(event.target.value)}
						/>
					</Controller.Field>
				)
			}
			return (
				<Controller.Row label={definition.label} disabled={disabled}>
					<Controller.Input
						value={text}
						maxLength={definition.maxLength}
						placeholder={definition.placeholder}
						onChange={(event) => onChange(event.target.value)}
					/>
				</Controller.Row>
			)
		}
		case 'toggle': {
			const enabled = value === true
			if (readonly)
				return <ReadonlyRow label={definition.label} value={enabled ? 'On' : 'Off'} />
			return (
				<Controller.Row label={definition.label} disabled={disabled}>
					<Controller.Segmented
						aria-label={definition.label}
						options={CONTROLLER_TOGGLE_OPTIONS}
						value={enabled ? 'on' : 'off'}
						onChange={(next) => onChange(next === 'on')}
					/>
				</Controller.Row>
			)
		}
		case 'select': {
			const selected = typeof value === 'string' ? value : undefined
			const selectedLabel =
				definition.options.find((option) => option.value === selected)?.label ?? '—'
			if (!disabled && (readonly || definition.options.length <= 1)) {
				return <ReadonlyRow label={definition.label} value={selectedLabel} />
			}
			// 🔑 선택지 전부가 색 조합이면 칩 그리드다 — 여기서는 라벨이 아니라 **색이 정보**라서
			//    목록도 pill도 무엇을 고르는지 보여주지 못한다. 계약이 부분 선언을 막지만,
			//    검증을 거치지 않은 정의도 화면이 죽지 않게 every로 판정한다(섞이면 목록으로 떨어진다).
			// 🔑 선택지 전부가 형태면 썸네일 그리드다 — 색 조합과 같은 근거로, 이름은 무엇을 고르는지
			//    보여주지 못한다. 색 판정보다 먼저 본다(둘을 함께 든 선택지는 형태가 더 큰 정보다).
			if (definition.options.every((option) => option.preview?.length)) {
				return (
					<Controller.PreviewChips
						label={definition.label}
						options={definition.options}
						value={selected}
						disabled={disabled}
						onChange={onChange}
					/>
				)
			}
			if (definition.options.every((option) => option.colors?.length)) {
				return (
					<Controller.ColorChips
						label={definition.label}
						options={definition.options}
						value={selected}
						disabled={disabled}
						onChange={onChange}
					/>
				)
			}
			// 🔑 선택지를 펼쳐 두는 축은 segmented다 — 드롭다운은 누르기 전까지 무엇이 있는지 숨긴다.
			//    값이 비어 있을 수 없으므로(항상 하나가 켜져 있다) 첫 선택지로 떨군다.
			if (definition.variant === 'segmented') {
				return (
					<Controller.Row label={definition.label} disabled={disabled}>
						<Controller.Segmented
							aria-label={definition.label}
							options={definition.options}
							value={
								selected && definition.options.some((o) => o.value === selected)
									? selected
									: (definition.defaultValue ?? definition.options[0].value)
							}
							onChange={onChange}
						/>
					</Controller.Row>
				)
			}
			return (
				<Controller.Row label={definition.label} disabled={disabled}>
					<Controller.Select
						options={definition.options}
						value={selected}
						placeholder={definition.placeholder}
						onChange={onChange}
					/>
				</Controller.Row>
			)
		}
		case 'color': {
			const color = typeof value === 'string' ? value : null
			if (readonly) return <ReadonlyRow label={definition.label} value={color ?? '—'} />
			return (
				<Controller.ColorRow
					label={definition.label}
					value={color ?? '#000000'}
					isEmpty={color === null}
					values={definition.values}
					disabled={disabled}
					onReset={() => onChange(null)}
					onChange={onChange}
				/>
			)
		}
		case 'range': {
			const number = typeof value === 'number' ? value : definition.defaultValue
			const format = (next: number) => formatRange(next, definition.display)
			if (readonly) return <ReadonlyRow label={definition.label} value={format(number)} />
			return (
				<Controller.Range
					label={definition.label}
					value={number}
					min={definition.min}
					max={definition.max}
					step={definition.step}
					format={format}
					disabled={disabled}
					onChange={onChange}
				/>
			)
		}
		case 'pad': {
			const point = isControllerPadValue(value) ? value : definition.defaultValue
			if (readonly) {
				return (
					<ReadonlyRow
						label={definition.label}
						value={`${Math.round(point.x * 100)}, ${Math.round(point.y * 100)}`}
					/>
				)
			}
			return (
				<Controller.Pad
					aria-label={definition.label}
					value={point}
					aspectRatio={padAspectRatio ?? definition.aspectRatio}
					disabled={disabled}
					onChange={onChange}
				/>
			)
		}
		case 'asset': {
			const asset = typeof value === 'string' ? value : null
			const Source = assetSources?.[definition.source]
			// 출처 화면이 없으면 읽기 전용이다 — 킷이 목록을 모르므로 대신 그릴 수 있는 것이 없다.
			if (readonly || !Source) {
				return <ReadonlyRow label={definition.label} value={asset ? '선택됨' : '없음'} />
			}
			return (
				<Source
					label={definition.label}
					value={asset}
					disabled={disabled}
					onChange={onChange}
				/>
			)
		}
		case 'pad-pair': {
			const pair = isControllerPadPairValue(value) ? value : definition.defaultValue
			if (readonly) {
				return (
					<ReadonlyRow
						label={definition.label}
						value={`${formatPoint(pair.a)} / ${formatPoint(pair.b)}`}
					/>
				)
			}
			return (
				<Controller.PadPair
					aria-label={definition.label}
					value={pair}
					aspectRatio={padAspectRatio ?? definition.aspectRatio}
					disabled={disabled}
					onChange={onChange}
				/>
			)
		}
	}
}

function formatPoint(point: { x: number; y: number }) {
	return `${Math.round(point.x * 100)}, ${Math.round(point.y * 100)}`
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
	return (
		<Controller.Row label={label} readonly>
			<span className="text-sm text-muted-foreground">{value}</span>
		</Controller.Row>
	)
}

function formatRange(value: number, display?: { unit?: string; precision?: number }) {
	return `${display?.precision === undefined ? value : value.toFixed(display.precision)}${display?.unit ?? ''}`
}
