'use client'

import { ArrowsHorizontal, ArrowsVertical, Copy, Crop, SquareOutline } from '@carbon/icons-react'
import type { ReactNode } from 'react'
import {
	ControllerInput,
	ControllerPresence,
	ControllerRow,
	ControllerSegmented,
	ControllerSelect,
	ControllerStack,
} from '@/components/shared/controller'
import {
	type ArtboardKey,
	matchArtboard,
	presetArtboard,
} from '@/components/studio/shared/output-controls'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
	fitsPrintOutput,
	formatMillimeters,
	isPrintPpi,
	millimetersToPixels,
	pixelsToMillimeters,
} from '@/features/studio-export/print-policy'
import { DEFAULT_GRAPHIC_OUTPUT_SIZE } from '@/features/studio-export/studio-output'
import { OutputDimensions } from './output-dimensions'

export type StudioOutput = {
	mode: 'print' | 'digital'
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
/**
 * 출력 프리셋. 🔑 선택 상태는 저장하지 않는다 — 크기가 정본이고, 표시는 현재 크기에서 계산한다.
 * 프리셋을 고르면 크기만 바꾸고, 크기를 고쳐 어느 프리셋과도 맞지 않으면 그대로 Custom이 된다.
 */
const PRESETS = {
	digital: [
		{ value: 'feed', label: 'Instagram Feed' },
		{ value: 'square', label: 'Square' },
		{ value: 'wide', label: '16:9' },
	],
	print: [
		{ value: 'a', label: 'A4' },
		{ value: 'banner', label: 'Banner' },
	],
} as const satisfies Record<StudioOutput['mode'], readonly { value: PresetKey; label: string }[]>
type PresetKey = 'feed' | ArtboardKey
const CUSTOM = { value: 'custom', label: 'Custom' }

function presetSize(key: PresetKey) {
	return key === 'feed' ? { ...DEFAULT_GRAPHIC_OUTPUT_SIZE, ppi: undefined } : presetArtboard(key)
}

/** Digital은 px가 같을 때, Print는 물리 크기(mm)가 같을 때 그 프리셋이다 — 해상도를 바꿔도 A4는 A4다. */
export function matchOutputPreset({ mode, width, height, ppi }: StudioOutput): string {
	const list: readonly { value: PresetKey }[] = PRESETS[mode]
	if (mode === 'print') {
		const key = matchArtboard({ width, height }, ppi)
		return list.some((preset) => preset.value === key) ? key : CUSTOM.value
	}
	return (
		list.find((preset) => {
			const size = presetSize(preset.value)
			return size.width === width && size.height === height
		})?.value ?? CUSTOM.value
	)
}
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
	printable = true,
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
	/** 프로파일에 인쇄(print) 계약이 있는가 — 없으면 Mode를 숨기고 Digital로만 다룬다. */
	printable?: boolean
	kind: 'graphic' | 'image' | 'template'
	value: StudioOutput
	onChange: (next: StudioOutput) => void
	format: string
	onFormatChange: (next: string) => void
	hasResult: boolean
	empty: boolean
}) {
	const mode = printable ? value.mode : 'digital'
	const physical = mode === 'print'
	const preset = matchOutputPreset({ ...value, mode })
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
			<div className="flex flex-col">
				<Typography
					as="h2"
					size="sm"
					weight="semibold"
					tone="muted"
					className="flex h-9 items-center"
				>
					Output
				</Typography>
				{/* 제목 아래 행 사이 4px은 각 행의 위 여백이다 — 모드·형식에 따라 생기는 행이 높이로 펼쳐진다. */}
				<ControllerPresence itemClassName="pt-1">
					{empty ? (
						<Typography size="sm" tone="muted" className="py-6">
							콘텐츠가 없습니다.
						</Typography>
					) : (
						<>
							{kind === 'graphic' && (
								<>
									{printable && (
										<ControllerRow label="Mode">
											<ControllerSegmented
												aria-label="출력 모드"
												options={MODES}
												value={mode}
												onChange={(next) => change({ mode: next })}
											/>
										</ControllerRow>
									)}
									<ControllerRow label="Preset">
										<ControllerSelect
											options={[...PRESETS[mode], CUSTOM]}
											value={preset}
											onChange={(next) => {
												// Custom은 크기를 그대로 두고 편집을 이어간다 — 이미 언제나 편집 가능하다.
												const key = PRESETS[mode].find(
													(item) => item.value === next,
												)?.value
												if (!key) return
												const size = presetSize(key)
												change({
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
											children: (
												<div className="flex min-w-0 flex-1 items-center justify-end gap-1 text-sm">
													<OutputNumber
														key={`${mode}-${value[id]}-${value.ppi}`}
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
														pixelsToMillimeters(
															value.height,
															value.ppi,
														),
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
				</ControllerPresence>
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
