import {
	millimetersToPixels,
	type PrintPpi,
	pixelsToMillimeters,
} from '@/features/studio-export/print-policy'
import { DEFAULT_GRAPHIC_OUTPUT_SIZE } from '@/features/studio-export/studio-output'

/**
 * 그래픽 Output의 판 프리셋 — 순수 계산. 크기가 정본이고, 어느 프리셋인지는 지금 크기에서 계산한다.
 * (옛 `output-controls`의 대지 프리셋과 `output-module`의 출력 프리셋을 그래픽 크기 편집기 곁으로 모았다.)
 */

export type OutputMode = 'print' | 'digital'
type OutputSizeUnit = 'px' | 'mm'

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

/**
 * 현재 판과 같은 프리셋을 찾는다. 없으면 직접 입력이다.
 * 🔑 mm 규격은 **물리 크기로 견준다** — 해상도를 바꾸면 픽셀 수는 달라져도 같은 A4다.
 *    px로 견주면 해상도를 건드리는 순간 선택이 「직접 입력」으로 튄다.
 */
export function matchArtboard(
	value: { width: number | null; height: number | null },
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

export const OUTPUT_MODES = [
	{ value: 'print', label: 'Print' },
	{ value: 'digital', label: 'Digital' },
] as const
/**
 * 출력 프리셋. 🔑 선택 상태는 저장하지 않는다 — 크기가 정본이고, 표시는 현재 크기에서 계산한다.
 * 프리셋을 고르면 크기만 바꾸고, 크기를 고쳐 어느 프리셋과도 맞지 않으면 그대로 Custom이 된다.
 */
export const OUTPUT_PRESETS = {
	digital: [
		{ value: 'feed', label: 'Instagram Feed' },
		{ value: 'square', label: 'Square' },
		{ value: 'wide', label: '16:9' },
	],
	print: [
		{ value: 'a', label: 'A4' },
		{ value: 'banner', label: 'Banner' },
	],
} as const satisfies Record<OutputMode, readonly { value: PresetKey; label: string }[]>
type PresetKey = 'feed' | ArtboardKey
export const CUSTOM_PRESET = { value: 'custom', label: 'Custom' }

export function presetSize(key: PresetKey) {
	return key === 'feed' ? { ...DEFAULT_GRAPHIC_OUTPUT_SIZE, ppi: undefined } : presetArtboard(key)
}

/** Digital은 px가 같을 때, Print는 물리 크기(mm)가 같을 때 그 프리셋이다 — 해상도를 바꿔도 A4는 A4다. */
export function matchOutputPreset({
	mode,
	width,
	height,
	ppi,
}: {
	mode: OutputMode
	width: number
	height: number
	ppi: PrintPpi
}): string {
	const list: readonly { value: PresetKey }[] = OUTPUT_PRESETS[mode]
	if (mode === 'print') {
		const key = matchArtboard({ width, height }, ppi)
		return list.some((preset) => preset.value === key) ? key : CUSTOM_PRESET.value
	}
	return (
		list.find((preset) => {
			const size = presetSize(preset.value)
			return size.width === width && size.height === height
		})?.value ?? CUSTOM_PRESET.value
	)
}
