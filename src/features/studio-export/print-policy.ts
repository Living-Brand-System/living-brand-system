export const PRINT_PPI_VALUES = [72, 150, 300] as const

/**
 * 고르지 않은 판이 시작하는 해상도. 상업 인쇄의 표준값이라 여기서 출발한다.
 * 🔴 목록의 첫 값(72)을 기본으로 삼으면 인쇄물이 조용히 4배 크게 나간다.
 */
export const DEFAULT_PRINT_PPI = 300

export const PRINT_PPI_OPTIONS = [
	{ label: '대형 인쇄 (72ppi)', value: '72' },
	{ label: '일반 용지 인쇄 (150ppi)', value: '150' },
	{ label: '고급 용지 인쇄 (300ppi)', value: '300' },
] as const

export const MAX_PRINT_PIXELS = 67_108_864
// 브라우저 캔버스(html-to-image)가 16,384px 초과 변을 조용히 축소해 서버의 정확한 크기 검증이 영원히 실패한다.
export const MAX_PRINT_SIDE_PIXELS = 16_384
export const MAX_PRINT_PNG_BYTES = 20_000_000

const MILLIMETERS_PER_INCH = 25.4
const PDF_POINTS_PER_INCH = 72

/**
 * 인쇄 해상도의 유효 범위. 🔑 `PRINT_PPI_VALUES`는 드롭다운에 띄우는 **프리셋**일 뿐이고
 * 사람이 직접 입력한 값도 받으므로, 유효성은 목록이 아니라 이 범위가 정한다.
 * 하한은 품질 기준이 아니라 나눗셈이 성립하는 최소값이다.
 */
export const MIN_PRINT_PPI = 1
/** 이미지 해상도의 상한. 출력기의 장치 dpi와는 다른 개념이라 이 위로는 인쇄물에서 얻는 것이 없다. */
export const MAX_PRINT_PPI = 1200

/** 인쇄 해상도(ppi). 프리셋 밖의 값이 직접 입력으로 들어오므로 유니온이 아니다. */
export type PrintPpi = number
export type PrintExportFormat = 'pdf' | 'tiff'

/**
 * 🔴 **정수가 아니어도 된다**(2026-09-10). 정수만 받으면 **표준 판형을 정확히 선언할 수 없다** —
 *    630×891px 판은 A4(210×297mm)인데 그 ppi가 `630 × 25.4 ÷ 210 = 76.2`다. 76으로 내리면 판이
 *    0.26% 커져 **210.55 × 297.78mm**가 되고, 그 소수가 아트보드 치수로 그대로 나갔다
 *    (사용자 지적: 「artboard가 mm 기준인데 값이 소수점 단위임」).
 * 🔑 DB 컬럼은 이미 `numeric`이라 마이그레이션이 필요 없다.
 */
export function isPrintPpi(value: unknown): value is PrintPpi {
	return (
		typeof value === 'number' &&
		Number.isFinite(value) &&
		value >= MIN_PRINT_PPI &&
		value <= MAX_PRINT_PPI
	)
}

/**
 * 물리 크기 표기의 단일 소유자.
 *
 * 🔴 **반올림으로 거짓말하지 않는다.** 사이드바만 `Math.round`를 걸어 210.55를 **211**로 올리고
 *    있었는데, 그것이 「이 판은 A4가 아니다」를 가려 주면서 실제 파일 치수와도 어긋났다
 *    (사용자 지적: 「실제 수치랑 Settings에 보이는 수치랑 완전 동일한 게 나은 듯」).
 * 🔑 **판형 해상도가 정확하면 파일과 완전히 같은 수가 된다** — `poster`를 76.2로 선언한 뒤
 *    화면 `210 × 297mm` · MediaBox `595.2756 × 841.8898pt`(= A4 정본)로 일치했다(실측).
 * 🔴 해상도가 어긋난 판은 `210.6`으로 보인다. 그때는 화면과 파일이 **소수 아래에서 여전히 다르다**
 *    (Illustrator는 24.1부터 소수 4자리를 보여 준다) — 이 함수가 약속하는 것은 「같은 수」가 아니라
 *    「어긋남을 가리지 않는 것」이고, 완전히 같게 만드는 길은 ppi를 맞추는 것이다.
 */
export function formatMillimeters(millimeters: number): string {
	const rounded = Math.round(millimeters * 10) / 10
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function parsePrintPpi(value: unknown): PrintPpi | undefined {
	const ppi = Number(value)
	return isPrintPpi(ppi) ? ppi : undefined
}

/** 프리셋 목록에서 기본으로 고를 해상도. 표준값이 없는 목록이면 가장 낮은 것으로 떨어진다. */
export function resolveDefaultPrintPpi(options: readonly PrintPpi[] | undefined): PrintPpi {
	if (!options || options.length === 0) return DEFAULT_PRINT_PPI
	return options.includes(DEFAULT_PRINT_PPI)
		? DEFAULT_PRINT_PPI
		: (options[0] ?? DEFAULT_PRINT_PPI)
}

export function pixelsToMillimeters(pixels: number, ppi: PrintPpi): number {
	return (pixels / ppi) * MILLIMETERS_PER_INCH
}

/** 물리 크기를 그 해상도로 채우는 픽셀 수. 판을 mm로 잡을 때 렌더 크기가 여기서 나온다. */
export function millimetersToPixels(millimeters: number, ppi: PrintPpi): number {
	return Math.round((millimeters / MILLIMETERS_PER_INCH) * ppi)
}

export function millimetersToPdfPoints(millimeters: number): number {
	return (millimeters / MILLIMETERS_PER_INCH) * PDF_POINTS_PER_INCH
}

/**
 * 픽셀 좌표를 PDF 페이지 단위(pt)로 옮긴다.
 * 🔴 이것 없이 px를 pt에 그대로 꽂으면 **그 판이 72ppi라고 선언하는 것**이 된다(pt = 1/72인치).
 */
export function pixelsToPdfPoints(pixels: number, ppi: PrintPpi): number {
	// 🔑 나눗셈을 뒤에 둔다 — `(1 / 300) * 72`는 0.24000000000000002가 되어 그 잡음이
	//    PDF 변환 행렬에 17자리로 그대로 박힌다. `(1 * 72) / 300`은 0.24로 떨어진다.
	return (pixels * PDF_POINTS_PER_INCH) / ppi
}

/**
 * 종횡비를 지킨 채 래스터 인쇄 한도 안에 들어가는 가장 큰 판.
 * 변 한도(`MAX_PRINT_SIDE_PIXELS`)와 총 픽셀(`MAX_PRINT_PIXELS`)이 **따로** 걸리므로 둘 다 본다.
 *
 * 🔴 인쇄 상한을 영상 인코더 예산(H.264 매크로블록)으로 대신하면 안 된다 — 그 예산은 1080px
 *    판을 2배까지만 허용해 A4 300ppi가 요구하는 2,480px을 막는다.
 */
export function maxPrintSize(width: number, height: number): { width: number; height: number } {
	const ratio = width / height
	// width × (width / ratio) ≤ MAX_PRINT_PIXELS  →  width ≤ √(MAX × ratio)
	const byTotal = Math.floor(Math.sqrt(MAX_PRINT_PIXELS * ratio))
	const maxWidth = Math.max(1, Math.min(MAX_PRINT_SIDE_PIXELS, byTotal))
	const maxHeight = Math.max(1, Math.min(MAX_PRINT_SIDE_PIXELS, Math.floor(maxWidth / ratio)))
	// 높이 쪽 한도에 먼저 걸리면 너비를 그 비율로 되돌려 준다.
	return { width: Math.max(1, Math.round(maxHeight * ratio)), height: maxHeight }
}

/**
 * 이 픽셀 크기를 인쇄 출력으로 만들 수 있는가. 서버가 쓰는 `findPrintOutputBlocker`와 **같은
 * 기준**을 쓴다 — 화면과 서버가 다른 잣대를 들면 「화면에선 고를 수 있는데 저장만 실패」가 된다.
 */
export function fitsPrintOutput(width: number, height: number): boolean {
	return findPrintOutputBlocker({ enabled: true, height, width }) === null
}

/**
 * 이 물리 크기를 채울 수 있는 해상도만 남긴다.
 *
 * 🔴 판이 커질수록 고를 수 있는 해상도가 줄어든다 — A0를 300ppi로 채우면 1억 4천만 픽셀이라
 *    브라우저 캔버스가 못 만든다. 창작자에게는 「너무 큽니다」가 아니라 **고를 수 있는 것만**
 *    보이는 편이 낫다.
 * 🔑 비활성이 아니라 목록에서 빼는 이유는 `ControllerOption`에 `disabled`가 없어서다 —
 *    비활성으로 남기면 고를 수 있어 보이는데 조용히 무시된다.
 */
export function printablePpiOptions(
	widthMillimeters: number,
	heightMillimeters: number,
	options: readonly PrintPpi[],
): readonly PrintPpi[] {
	return options.filter((ppi) =>
		fitsPrintOutput(
			millimetersToPixels(widthMillimeters, ppi),
			millimetersToPixels(heightMillimeters, ppi),
		),
	)
}

export function findPrintOutputBlocker(candidate: {
	enabled?: unknown
	height?: unknown
	width?: unknown
}): string | null {
	if (!candidate.enabled) return null
	const width = Number(candidate.width)
	const height = Number(candidate.height)
	if (
		!Number.isSafeInteger(width) ||
		width <= 0 ||
		!Number.isSafeInteger(height) ||
		height <= 0
	) {
		return '인쇄용 TIFF를 사용하려면 너비와 높이가 양의 정수여야 합니다.'
	}
	if (width > MAX_PRINT_SIDE_PIXELS || height > MAX_PRINT_SIDE_PIXELS) {
		return `인쇄용 출력은 너비·높이 각각 최대 ${MAX_PRINT_SIDE_PIXELS.toLocaleString('en-US')}px까지 지원합니다. 브라우저 캔버스가 이보다 큰 변을 축소해 인쇄 크기 검증에 실패합니다.`
	}
	if (width * height > MAX_PRINT_PIXELS) {
		return `인쇄용 TIFF는 최대 ${MAX_PRINT_PIXELS.toLocaleString('en-US')}픽셀까지 지원합니다.`
	}
	return null
}
