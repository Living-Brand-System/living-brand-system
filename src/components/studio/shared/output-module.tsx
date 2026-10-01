'use client'

import { ArrowsHorizontal, ArrowsVertical, Copy, Crop, SquareOutline } from '@carbon/icons-react'
import type { ReactNode } from 'react'
import { ControllerInput } from '@/components/shared/controller/input'
import { ControllerRow } from '@/components/shared/controller/row'
import { ControllerSegmented } from '@/components/shared/controller/segmented'
import { ControllerSelect } from '@/components/shared/controller/select'
import { ControllerStack } from '@/components/shared/controller/stack'
import { presetArtboard } from '@/components/studio/shared/output-controls'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
	fitsPrintOutput,
	formatMillimeters,
	isPrintPpi,
	millimetersToPixels,
	pixelsToMillimeters,
} from '@/features/studio-export/print-policy'
import { OutputDimensions } from './output-dimensions'

export type StudioOutput = {
	mode: 'print' | 'digital'
	preset: string
	width: number
	height: number
	ppi: number
	count: string
	ratio: string
	resolution: string
	notice: string
}

const MODES = [
	{ value: 'print', label: 'Print' },
	{ value: 'digital', label: 'Digital' },
] as const
const DIGITAL_PRESETS = [
	{ value: 'feed', label: 'Instagram Feed' },
	{ value: 'square', label: 'Square' },
	{ value: 'wide', label: '16:9' },
]
const PRINT_PRESETS = [
	{ value: 'a', label: 'A4' },
	{ value: 'banner', label: 'Banner' },
]
const CUSTOM = { value: 'custom', label: 'Custom' }
const FORMATS = ['PNG', 'JPEG', 'PDF'].map((value) => ({ value, label: value }))
const IMAGE_FIELDS = [
	{ id: 'count', label: '생성 수', Icon: Copy, options: ['1', '2', '4'] },
	{ id: 'ratio', label: '이미지 비율', Icon: SquareOutline, options: ['1:1', '4:3', '16:9'] },
	{ id: 'resolution', label: '이미지 해상도', Icon: Crop, options: ['1K', '2K', '4K'] },
] as const

/** 신규 Output 표면. 값과 저장 실행은 각 스튜디오의 실제 계약으로 연결한다. */
export function StudioOutputModule({
	kind,
	value,
	onChange,
	format,
	onFormatChange,
	hasResult,
	empty,
	formats = FORMATS,
	onSave,
	onSaveAll,
	canSaveAll = hasResult,
	busy = false,
	sizeControl,
	children,
	action,
	error,
}: {
	formats?: readonly { value: string; label: string }[]
	onSave?: () => void
	onSaveAll?: () => void
	canSaveAll?: boolean
	busy?: boolean
	sizeControl?: ReactNode
	children?: ReactNode
	/** 저장 위에 놓는 실행 버튼 — Image의 생성처럼 결과를 만드는 동작(Figma 529:19999). */
	action?: ReactNode
	error?: string | null
	kind: 'graphic' | 'image' | 'template'
	value: StudioOutput
	onChange: (next: StudioOutput) => void
	format: string
	onFormatChange: (next: string) => void
	hasResult: boolean
	empty: boolean
}) {
	const physical = value.mode === 'print'
	const fixed = value.preset !== 'custom'
	const unit = physical ? 'mm' : 'px'
	const change = (patch: Partial<StudioOutput>) => onChange({ ...value, notice: '', ...patch })
	const resize = (patch: Partial<StudioOutput>) => {
		const next = { ...value, ...patch }
		if (!fitsPrintOutput(next.width, next.height)) {
			change({ notice: '출력 가능한 크기를 초과했습니다. 이전 값을 유지합니다.' })
			return
		}
		change(patch)
	}
	const dimension = (axis: 'width' | 'height') =>
		physical
			? formatMillimeters(pixelsToMillimeters(value[axis], value.ppi))
			: String(value[axis])
	return (
		<section
			aria-label="출력 설정"
			data-slot="studio-output-module"
			className="flex flex-col gap-4"
		>
			<div className="flex flex-col gap-1">
				<Typography
					as="h2"
					size="sm"
					weight="semibold"
					tone="muted"
					className="flex h-9 items-center"
				>
					Output
				</Typography>
				{empty ? (
					<Typography size="sm" tone="muted" className="py-6">
						콘텐츠가 없습니다.
					</Typography>
				) : (
					<>
						{kind === 'graphic' && (
							<>
								<ControllerRow label="Mode">
									<ControllerSegmented
										aria-label="출력 모드"
										options={MODES}
										value={value.mode}
										onChange={(mode) => change({ mode, preset: 'custom' })}
									/>
								</ControllerRow>
								<ControllerRow label="Preset">
									<ControllerSelect
										options={[
											...(physical ? PRINT_PRESETS : DIGITAL_PRESETS),
											CUSTOM,
										]}
										value={value.preset}
										onChange={(preset) => {
											if (preset === 'custom') return change({ preset })
											if (preset === 'feed')
												return change({ preset, width: 1080, height: 1350 })
											if (
												preset !== 'a' &&
												preset !== 'banner' &&
												preset !== 'square' &&
												preset !== 'wide'
											)
												return
											const size = presetArtboard(preset)
											change({
												preset,
												width: size.width,
												height: size.height,
												ppi: size.ppi ?? value.ppi,
											})
										}}
									/>
								</ControllerRow>
							</>
						)}
						{sizeControl ??
							(kind === 'image' ? (
								<ControllerStack
									items={IMAGE_FIELDS.map(({ id, label, Icon, options }) => ({
										id,
										label,
										icon: <Icon />,
										children: (
											<ControllerSelect
												options={options.map((option) => ({
													value: option,
													label: option,
												}))}
												value={value[id]}
												onChange={(next) => change({ [id]: next })}
											/>
										),
									}))}
								/>
							) : kind === 'template' ? (
								<OutputDimensions
									width={dimension('width')}
									height={dimension('height')}
									unit={unit}
								/>
							) : (
								<ControllerStack
									labelDisplay="icon"
									items={(
										[
											{
												id: 'width',
												label: '출력 너비',
												Icon: ArrowsHorizontal,
											},
											{
												id: 'height',
												label: '출력 높이',
												Icon: ArrowsVertical,
											},
										] as const
									).map(({ id, label, Icon }) => ({
										id,
										label,
										icon: <Icon />,
										readonly: fixed,
										children: (
											<div className="flex min-w-0 flex-1 items-center justify-end gap-1 text-sm">
												{fixed ? (
													<span>{dimension(id)}</span>
												) : (
													<OutputNumber
														key={`${value.mode}-${value[id]}-${value.ppi}`}
														value={dimension(id)}
														onCommit={(next) =>
															resize({
																[id]: physical
																	? millimetersToPixels(
																			next,
																			value.ppi,
																		)
																	: Math.round(next),
															})
														}
														onInvalid={() =>
															change({
																notice: '0보다 큰 숫자를 입력해 주세요.',
															})
														}
													/>
												)}
												<span className="shrink-0 text-muted-foreground">
													{unit}
												</span>
											</div>
										),
									}))}
								/>
							))}
						<ControllerRow label="Format">
							<ControllerSelect
								options={formats}
								value={format}
								onChange={onFormatChange}
							/>
						</ControllerRow>
						{kind === 'graphic' && physical && (
							<ControllerRow label="Resolution">
								<div className="flex min-w-0 items-center gap-1 text-sm">
									<OutputNumber
										key={value.ppi}
										value={String(value.ppi)}
										onCommit={(ppi) => {
											if (!isPrintPpi(ppi))
												return change({
													notice: '해상도는 1~1200 ppi로 입력해 주세요.',
												})
											resize({
												ppi,
												width: millimetersToPixels(
													pixelsToMillimeters(value.width, value.ppi),
													ppi,
												),
												height: millimetersToPixels(
													pixelsToMillimeters(value.height, value.ppi),
													ppi,
												),
											})
										}}
										onInvalid={() =>
											change({
												notice: '해상도는 1~1200 ppi로 입력해 주세요.',
											})
										}
									/>
									<span className="text-muted-foreground">ppi</span>
								</div>
							</ControllerRow>
						)}
						{children}
					</>
				)}
			</div>
			<div className="flex flex-col gap-3">
				{action}
				<div className="flex gap-2">
					<Button
						disabled={busy || empty || !hasResult}
						className="h-11 min-w-0 flex-1 rounded-lg"
						onClick={onSave}
					>
						{kind === 'image' ? '선택 저장' : '저장'}
					</Button>
					{kind === 'image' && (
						<Button
							variant="muted"
							disabled={busy || empty || !canSaveAll}
							className="h-11 min-w-0 flex-1 rounded-lg text-foreground"
							onClick={onSaveAll}
						>
							전체 저장
						</Button>
					)}
				</div>
			</div>
			{error && (
				<Typography role="alert" size="sm" className="text-destructive">
					{error}
				</Typography>
			)}
			{value.notice && (
				<Typography role="status" size="xs" tone="muted">
					{value.notice}
				</Typography>
			)}
		</section>
	)
}

function OutputNumber({
	value,
	onCommit,
	onInvalid,
}: {
	value: string
	onCommit: (next: number) => void
	onInvalid: () => void
}) {
	return (
		<ControllerInput
			type="number"
			min="0.1"
			step="any"
			defaultValue={value}
			className="w-full tabular-nums"
			onBlur={(event) => {
				const raw = event.currentTarget.value
				const next = Number(raw)
				event.currentTarget.value = value
				if (raw === value) return
				if (!raw.trim() || !Number.isFinite(next) || next <= 0) return onInvalid()
				onCommit(next)
			}}
			onKeyDown={(event) => {
				if (event.key === 'Enter') event.currentTarget.blur()
			}}
		/>
	)
}
