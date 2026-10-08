'use client'

import { Reset } from '@carbon/icons-react'
import type { ReactNode } from 'react'
import { CONTROLLER_TOGGLE_OPTIONS, Controller } from '@/components/shared/controller'
import { FieldError } from '@/components/ui/field'
import {
	type ControllerAvailability,
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerRuntimeBinding,
	isControllerPadPairValue,
	isControllerPadValue,
	resolveControlAvailability,
} from '@/modules/studio-controller/controller-definition'

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
				availability={resolveControlAvailability(definition, binding)}
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
	availability: ControllerAvailability
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

export function ReadonlyRow({ label, value }: { label: string; value: string }) {
	return (
		<Controller.Row label={label} readonly>
			<span className="text-sm text-muted-foreground">{value}</span>
		</Controller.Row>
	)
}

function formatRange(value: number, display?: { unit?: string; precision?: number }) {
	return `${display?.precision === undefined ? value : value.toFixed(display.precision)}${display?.unit ?? ''}`
}
