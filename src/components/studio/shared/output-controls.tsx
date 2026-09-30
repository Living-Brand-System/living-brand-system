'use client'

import { useState } from 'react'
import { Controller } from '@/components/shared/controller'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import type { VideoExportSpec } from '@/features/studio-export/export-contract'
import {
	MAX_PRINT_PPI,
	MIN_PRINT_PPI,
	maxPrintSize,
	millimetersToPixels,
	PRINT_PPI_OPTIONS,
	type PrintPpi,
	pixelsToMillimeters,
} from '@/features/studio-export/print-policy'

export type OutputSizeValue = {
	width: number | null
	height: number | null
}

type OutputSizeUnit = 'px' | 'mm'

/** 프리셋 목록에 없는 해상도를 직접 넣는 항목. 대지의 `CUSTOM_ARTBOARD`와 같은 방식이다. */
const MANUAL_PPI = 'manual'

/**
 * 대지 프리셋. 값·단위·dpi는 디자이너 원본 `RATIO_PRESETS`를 그대로 옮겼다.
 *
 * 🔑 `unit`은 그 규격을 사람이 말할 때 쓰는 단위다 — px 규격은 디지털, mm 규격은 인쇄다.
 * 🔑 `dpi`는 mm 규격을 고를 때 **함께 적용되는 권장 해상도**이지 환산율이 아니다. 판의 물리
 *    크기는 mm가 갖고, 그 mm를 몇 픽셀로 채울지는 사용자가 고른 해상도가 정한다.
 * 🔴 배너가 72인 이유는 화질이 아니라 크기다 — 600×1800mm를 300ppi로 채우면 7,087×21,260px이
 *    되어 브라우저 캔버스 한도(16,384px)를 넘는다.
 */
const ARTBOARD_PRESETS = {
	square: {
		label: '1:1',
		caption: '인스타·프로필',
		width: 1080,
		height: 1080,
		unit: 'px',
		dpi: 300,
	},
	banner: { label: '1:3', caption: '배너·현수막', width: 600, height: 1800, unit: 'mm', dpi: 72 },
	wide: {
		label: '16:9',
		caption: '프레젠테이션·미디어',
		width: 1920,
		height: 1080,
		unit: 'px',
		dpi: 300,
	},
	a: { label: 'A size', caption: '홍보인쇄물', width: 210, height: 297, unit: 'mm', dpi: 300 },
} as const satisfies Record<
	string,
	{
		label: string
		caption: string
		width: number
		height: number
		unit: OutputSizeUnit
		dpi: number
	}
>

export type ArtboardKey = keyof typeof ARTBOARD_PRESETS
/** 어느 프리셋과도 맞지 않는 크기. 사용자가 직접 넣은 값이다. */
export const CUSTOM_ARTBOARD = 'custom'

/** 프리셋을 고르면 적용될 판. mm 규격은 자기 권장 해상도를 함께 들고 온다. */
export function presetArtboard(key: ArtboardKey) {
	const preset = ARTBOARD_PRESETS[key]
	return preset.unit === 'mm'
		? {
				width: millimetersToPixels(preset.width, preset.dpi),
				height: millimetersToPixels(preset.height, preset.dpi),
				ppi: preset.dpi,
				unit: 'mm' as const,
			}
		: { width: preset.width, height: preset.height, ppi: undefined, unit: 'px' as const }
}

/** 프리셋을 고르면 나올 픽셀 크기. 목록에서 한도 초과 규격을 거를 때 쓴다. */
export function presetSizeInPx(key: ArtboardKey) {
	const { width, height } = presetArtboard(key)
	return { width, height }
}

/**
 * 현재 판과 같은 프리셋을 찾는다. 없으면 직접 입력이다.
 * 🔑 mm 규격은 **물리 크기로 견준다** — 해상도를 바꾸면 픽셀 수는 달라져도 같은 A4다.
 *    px로 견주면 해상도를 건드리는 순간 선택이 「직접 입력」으로 튄다.
 */
export function matchArtboard(
	value: OutputSizeValue,
	ppi: PrintPpi,
): ArtboardKey | typeof CUSTOM_ARTBOARD {
	const keys = Object.keys(ARTBOARD_PRESETS) as ArtboardKey[]
	return (
		keys.find((key) => {
			const preset = ARTBOARD_PRESETS[key]
			if (value.width === null || value.height === null) return false
			if (preset.unit === 'px') {
				return preset.width === value.width && preset.height === value.height
			}
			// 반올림으로 1px이 어긋나도 같은 판이므로 0.5mm 안이면 같다고 본다.
			return (
				Math.abs(pixelsToMillimeters(value.width, ppi) - preset.width) < 0.5 &&
				Math.abs(pixelsToMillimeters(value.height, ppi) - preset.height) < 0.5
			)
		}) ?? CUSTOM_ARTBOARD
	)
}

const UNIT_OPTIONS = [
	{ value: 'px', label: 'px' },
	{ value: 'mm', label: 'mm' },
] as const

/**
 * 🔑 저장되는 값은 언제나 px다. 단위는 **입력란의 표시·입력만** 바꾼다(원본과 같은 규칙).
 * 그 환산율이 해상도이고, 환산 자체는 `print-policy`가 소유한다 — 여기서 다시 나눗셈을 쓰면
 * 화면과 파일이 서로 다른 기준을 갖게 된다.
 */
function pxToUnit(px: number, unit: OutputSizeUnit, ppi: PrintPpi) {
	return unit === 'mm' ? pixelsToMillimeters(px, ppi) : px
}

function unitToPx(value: number, unit: OutputSizeUnit, ppi: PrintPpi) {
	return unit === 'mm' ? millimetersToPixels(value, ppi) : value
}

/** 정수로만 보여주고 받는다 — 원본의 `formatSizeValue`도 반올림한다. */
function displayValue(px: number | null, unit: OutputSizeUnit, ppi: PrintPpi) {
	return px === null ? null : Math.round(pxToUnit(px, unit, ppi))
}

function displayMax(px: number | undefined, unit: OutputSizeUnit, ppi: PrintPpi) {
	return px === undefined ? undefined : Math.floor(pxToUnit(px, unit, ppi))
}

/**
 * 고를 수 있는 대지 목록. 🔴 한도를 넘는 규격은 **목록에서 뺀다** — `ControllerOption`에
 * `disabled`가 없어서 비활성으로 남기면 고를 수 있어 보이는데 조용히 무시된다.
 * 현재 크기가 어느 프리셋과도 다를 때만 「직접 입력」 항목을 실어 선택 상태를 표현한다.
 */
export function listArtboardOptions({
	maxWidth,
	maxHeight,
	current,
}: {
	maxWidth?: number
	maxHeight?: number
	current: ArtboardKey | typeof CUSTOM_ARTBOARD
}) {
	const presets = (Object.keys(ARTBOARD_PRESETS) as ArtboardKey[])
		.filter((key) => {
			const size = presetSizeInPx(key)
			return (
				(maxWidth === undefined || size.width <= maxWidth) &&
				(maxHeight === undefined || size.height <= maxHeight)
			)
		})
		.map((key) => ({
			value: key as string,
			label: `${ARTBOARD_PRESETS[key].label} · ${ARTBOARD_PRESETS[key].caption}`,
		}))
	return current === CUSTOM_ARTBOARD
		? [...presets, { value: CUSTOM_ARTBOARD, label: '직접 입력' }]
		: presets
}

type SizingControlsProps = {
	value: OutputSizeValue
	maxWidth?: number
	maxHeight?: number
	/**
	 * 판의 물리 크기를 정하는 해상도. mm 표시·입력의 환산율이자, 인쇄 형식이 나갈 때의
	 * 페이지 치수를 정한다. px 모드에서도 값은 살아 있고 화면에 안 보일 뿐이다.
	 */
	ppi: PrintPpi
	/** 드롭다운에 띄울 해상도 프리셋. 목록 밖 값은 「직접 입력」으로 들어온다. */
	ppiOptions: readonly PrintPpi[]
	/**
	 * 🔴 **거부하면 `false`를 돌려줘야 한다.** 해상도 변경은 「픽셀을 다시 잡고 → ppi를 확정」하는
	 * 한 쌍인데, 앞쪽만 거부되고 뒤쪽이 통과하면 `mm = px ÷ ppi`가 깨져 판형이 조용히 바뀐다.
	 */
	onChange: (value: { width: number; height: number }) => boolean
	onPpiChange: (ppi: PrintPpi) => void
}

/** 해상도 프리셋의 사람이 읽는 이름. 목록에 없는 값은 숫자로만 보여 준다. */
function ppiLabel(ppi: PrintPpi) {
	return PRINT_PPI_OPTIONS.find((option) => option.value === String(ppi))?.label ?? `${ppi}ppi`
}

/**
 * Footer에서 정적 이미지와 영상 출력 크기를 같은 Width·Height 행으로 편집한다.
 * 단위 선택은 이 컴포넌트가 소유한다 — 세션에 저장할 값이 아니라 보는 방식이다.
 *
 * 🔑 px와 mm는 대등한 두 축이지 표시 설정이 아니다. px는 디지털이라 해상도라는 개념이 없고,
 *    mm는 인쇄라 「그 mm를 몇 픽셀로 채울까」가 따라온다. 그래서 해상도 행은 mm에서만 뜬다.
 */
export function SizingControls({
	value,
	maxWidth,
	maxHeight,
	ppi,
	ppiOptions,
	onChange,
	onPpiChange,
}: SizingControlsProps) {
	const [unit, setUnit] = useState<OutputSizeUnit>('px')
	const [manualPpi, setManualPpi] = useState(false)
	/**
	 * 거부된 입력을 되돌리고 이유를 남긴다.
	 * 🔑 `revision`은 `NumberRow`의 `key`를 흔들어 **입력란이 붙들고 있는 값을 버리게** 한다 —
	 *    state가 안 바뀌면 `defaultValue`도 안 바뀌어서, 화면에는 통과한 것처럼 보인다.
	 */
	const [notice, setNotice] = useState<string | null>(null)
	const [revision, setRevision] = useState(0)
	const reject = (reason: string) => {
		setNotice(reason)
		setRevision((current) => current + 1)
	}
	const accept = () => {
		setNotice(null)
	}
	// 🔑 선택 상태를 따로 들지 않는다 — 현재 크기에서 파생한다. 크기를 직접 고치면 저절로 「직접 입력」이 된다.
	const artboard = matchArtboard(value, ppi)
	const artboardOptions = listArtboardOptions({ maxWidth, maxHeight, current: artboard })
	const showManualPpi = manualPpi || !ppiOptions.includes(ppi)

	/** 한 축을 고친다. 저장값은 언제나 px이므로 입력 단위를 여기서 되돌린다. */
	const resize = (axis: 'width' | 'height', next: number) => {
		const px = Math.max(1, Math.round(unitToPx(next, unit, ppi)))
		const { width, height } = value
		if (width === null || height === null) return
		const applied = onChange(axis === 'width' ? { width: px, height } : { width, height: px })
		if (applied) {
			accept()
			return
		}
		const limit = maxPrintSize(axis === 'width' ? px : width, axis === 'height' ? px : height)
		reject(
			`이 비율에서는 최대 ${displayValue(limit.width, unit, ppi)}×${displayValue(limit.height, unit, ppi)}${unit}까지 만들 수 있습니다.`,
		)
	}

	/**
	 * 해상도가 바뀌면 **mm를 지키고 픽셀을 다시 잡는다** — A4를 300에서 150으로 내리면
	 * 판은 여전히 A4여야 한다. px 모드에서는 픽셀이 정본이므로 판을 건드리지 않는다.
	 */
	const changePpi = (next: PrintPpi) => {
		if (unit === 'mm' && value.width !== null && value.height !== null) {
			const applied = onChange({
				width: millimetersToPixels(pixelsToMillimeters(value.width, ppi), next),
				height: millimetersToPixels(pixelsToMillimeters(value.height, ppi), next),
			})
			// 🔴 픽셀을 못 바꿨으면 해상도도 바꾸지 않는다 — 한쪽만 적용하면 판형이 조용히 줄어든다.
			//    Select의 값이 `ppi`에서 파생되므로 선택이 눈에 보이게 원래 값으로 되돌아간다.
			if (!applied) {
				// 목록이 비면 아래에서 이 컨트롤 자체를 안 그리므로 여기서는 늘 비어 있지 않다.
				reject(`이 판형은 최대 ${Math.max(...ppiOptions)}ppi까지 만들 수 있습니다.`)
				return
			}
		}
		accept()
		onPpiChange(next)
	}

	return (
		<div data-slot="sizing-controls" className="flex flex-col gap-1">
			<Controller.Row label="대지">
				<Controller.Select
					options={artboardOptions}
					value={artboard}
					onChange={(next) => {
						if (next === CUSTOM_ARTBOARD) return
						const preset = presetArtboard(next as ArtboardKey)
						// 🔴 크기를 못 바꿨으면 단위·해상도도 건드리지 않는다 — `changePpi`와 같은 이유다.
						if (!onChange({ width: preset.width, height: preset.height })) {
							reject('이 판형은 지금 형식으로 만들 수 없습니다.')
							return
						}
						accept()
						// 규격을 말할 때 쓰는 단위로 입력란을 맞춘다(원본도 프리셋 단위를 따라간다).
						setUnit(preset.unit)
						// mm 규격은 자기 권장 해상도를 갖는다 — 배너를 300ppi로 채우면 한도를 넘는다.
						if (preset.ppi !== undefined) {
							setManualPpi(false)
							onPpiChange(preset.ppi)
						}
					}}
				/>
			</Controller.Row>
			<Controller.Row label="Unit">
				<Controller.Segmented
					aria-label="크기 단위"
					options={UNIT_OPTIONS}
					value={unit}
					onChange={(next) => setUnit(next as OutputSizeUnit)}
				/>
			</Controller.Row>
			<NumberRow
				key={`width-${revision}`}
				label="Width"
				value={displayValue(value.width, unit, ppi)}
				max={displayMax(maxWidth, unit, ppi)}
				suffix={unit}
				onChange={(width) => resize('width', width)}
			/>
			<NumberRow
				key={`height-${revision}`}
				label="Height"
				value={displayValue(value.height, unit, ppi)}
				max={displayMax(maxHeight, unit, ppi)}
				suffix={unit}
				onChange={(height) => resize('height', height)}
			/>
			{unit === 'mm' && ppiOptions.length === 0 && (
				<Typography role="status" size="sm" className="text-warning">
					이 판형은 인쇄할 수 없습니다. 크기를 줄여 주세요.
				</Typography>
			)}
			{unit === 'mm' && ppiOptions.length > 0 && (
				<>
					<Controller.Row label="해상도">
						<Controller.Select
							options={[
								...ppiOptions.map((option) => ({
									value: String(option),
									label: ppiLabel(option),
								})),
								{ value: MANUAL_PPI, label: '직접 입력' },
							]}
							value={showManualPpi ? MANUAL_PPI : String(ppi)}
							onChange={(next) => {
								if (next === MANUAL_PPI) {
									setManualPpi(true)
									return
								}
								setManualPpi(false)
								changePpi(Number(next))
							}}
						/>
					</Controller.Row>
					{showManualPpi && (
						<NumberRow
							key={`ppi-${revision}`}
							label="직접 입력"
							value={ppi}
							min={MIN_PRINT_PPI}
							max={MAX_PRINT_PPI}
							suffix="ppi"
							onChange={changePpi}
						/>
					)}
				</>
			)}
			{notice && (
				<Typography role="status" size="sm" className="text-warning">
					{notice}
				</Typography>
			)}
		</div>
	)
}

type VideoControlsProps = {
	fps: VideoExportSpec['fps']
	fpsOptions: readonly VideoExportSpec['fps'][]
	durationSeconds: number
	maxDurationSeconds: number
	onFpsChange: (fps: VideoExportSpec['fps']) => void
	onDurationChange: (durationSeconds: number) => void
}

/** Footer에서 영상 포맷에만 필요한 FPS와 길이를 편집한다. 해상도는 SizingControls가 소유한다. */
export function VideoControls({
	fps,
	fpsOptions,
	durationSeconds,
	maxDurationSeconds,
	onFpsChange,
	onDurationChange,
}: VideoControlsProps) {
	return (
		<div data-slot="video-controls" className="flex flex-col gap-1">
			<Controller.Row label="FPS" readonly={fpsOptions.length <= 1}>
				{fpsOptions.length <= 1 ? (
					<span className="text-sm text-muted-foreground">{fps}</span>
				) : (
					<Controller.Select
						options={fpsOptions.map((option) => ({
							value: String(option),
							label: String(option),
						}))}
						value={String(fps)}
						onChange={(next) => onFpsChange(Number(next) as VideoExportSpec['fps'])}
					/>
				)}
			</Controller.Row>
			<NumberRow
				label="Duration"
				value={durationSeconds}
				max={maxDurationSeconds}
				suffix="sec"
				onChange={onDurationChange}
			/>
		</div>
	)
}

/**
 * Footer에서 캔버스 좌표계 대비 출력 배율을 고른다.
 * 선택지가 하나뿐이면(캔버스가 이미 인코딩 한도에 가까우면) 읽기 전용으로 둔다.
 */
export function ScaleControls({
	scale,
	options,
	onChange,
}: {
	scale: number
	options: readonly number[]
	onChange: (scale: number) => void
}) {
	return (
		<Controller.Row label="Scale" readonly={options.length <= 1}>
			{options.length <= 1 ? (
				<span className="text-sm text-muted-foreground">{scale}×</span>
			) : (
				<Controller.Select
					options={options.map((value) => ({ value: String(value), label: `${value}×` }))}
					value={String(scale)}
					onChange={(next) => onChange(Number(next))}
				/>
			)}
		</Controller.Row>
	)
}

/** Footer에서 인쇄 포맷에 필요한 Effective PPI만 선택한다. */
export function PrintControls({
	ppi,
	options,
	onChange,
}: {
	ppi: PrintPpi
	options: readonly PrintPpi[]
	onChange: (ppi: PrintPpi) => void
}) {
	return (
		<Controller.Row label="Resolution" readonly={options.length <= 1}>
			{options.length <= 1 ? (
				<span className="text-sm text-muted-foreground">{ppi}ppi</span>
			) : (
				<Controller.Select
					options={options.map((value) => ({
						value: String(value),
						label: `${value}ppi`,
					}))}
					value={String(ppi)}
					onChange={(value) => onChange(Number(value) as PrintPpi)}
				/>
			)}
		</Controller.Row>
	)
}

type ExportActionProps = {
	busy: boolean
	disabled: boolean
	error: string | null
	/**
	 * 실패는 아니지만 결과물이 원본과 다른 점. 🔴 인쇄물은 되돌릴 수 없어서 조용히 넘기면 안 된다 —
	 * 파일은 나왔는데 무엇이 빠졌는지 모르는 상태가 가장 나쁘다.
	 */
	warnings?: readonly string[]
	onExport: () => void
}

/** Footer의 공통 내보내기 실행 상태와 오류·경고 표현을 묶는다. */
export function ExportAction({ busy, disabled, error, warnings, onExport }: ExportActionProps) {
	return (
		<div data-slot="export-action" className="flex flex-col gap-2">
			<Button className="h-11 w-full" onClick={onExport} disabled={disabled || busy}>
				{busy ? '내보내는 중...' : '내보내기'}
			</Button>
			{error && (
				<Typography role="alert" size="sm" className="text-destructive">
					{error}
				</Typography>
			)}
			{warnings?.map((warning) => (
				<Typography key={warning} role="status" size="sm" className="text-warning">
					{warning}
				</Typography>
			))}
		</div>
	)
}

function NumberRow({
	label,
	value,
	min = 1,
	max,
	suffix,
	onChange,
}: {
	label: string
	value: number | null
	min?: number
	max?: number
	suffix: string
	onChange: (value: number) => void
}) {
	return (
		<Controller.Row label={label}>
			<div className="flex items-center gap-1 text-muted-foreground">
				<Controller.Input
					key={`${label}-${value ?? 'empty'}`}
					type="number"
					inputMode="numeric"
					min={min}
					max={max}
					step={1}
					defaultValue={value ?? ''}
					placeholder="—"
					className="w-20 text-right"
					onBlur={(event) => {
						const next = event.currentTarget.valueAsNumber
						if (
							Number.isInteger(next) &&
							next >= min &&
							(max === undefined || next <= max)
						) {
							onChange(next)
						} else {
							event.currentTarget.value = value === null ? '' : String(value)
						}
					}}
					onKeyDown={(event) => {
						if (event.key === 'Enter') event.currentTarget.blur()
					}}
				/>
				<span className="text-sm">{suffix}</span>
			</div>
		</Controller.Row>
	)
}
