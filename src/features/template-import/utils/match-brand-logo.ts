import sharp from 'sharp'

/**
 * Figma 레이어 렌더를 등록된 브랜드 로고와 비교한다 — 실루엣(배치·비율)으로 로고를 고르고, 색으로 버전을 고른다.
 * 로고 목록은 데이터(brand-logos)에서 오므로 어떤 로고·몇 가지 색 버전이 있는지는 여기서 모른다.
 */

/** 비교 해상도(긴 변 px). */
const GRID = 64
/** 잉크(전경)로 볼 알파. */
const INK_ALPHA = 128
/** 색 비교에 쓰는 안쪽 픽셀 알파 — 안티앨리어싱 가장자리의 섞인 색을 뺀다. */
const SOLID_ALPHA = 250
/**
 * 같은 로고로 볼 실루엣 일치도(IoU). 2026-10-12 템플릿 31개 실측: 맞는 로고 0.90~0.99(작은 A3 로고가 아래 끝),
 * 다른 로고 0.46 언저리 — 가운데에 둔다.
 * ponytail: 고정 임계값 하나. 새 로고 계열에서 오인식이 나면 계열별 최소 간격(1위-2위)으로 바꾼다.
 */
const MIN_SHAPE_IOU = 0.75
/**
 * 같은 색 버전으로 볼 평균 RGB 거리(0~441). 실측: 디자이너의 #062812 로고 ↔ 단색 검정 44.
 * 기본(남색 HD)·white 워드마크·단색 사이 거리는 100을 넘는다.
 */
const MAX_COLOR_DISTANCE = 64
/** 잉크 비율이 이만큼(로그 비) 벗어난 로고는 늘여서 비교하지 않는다. */
const MAX_LOG_ASPECT_DIFF = 0.1

/** 두 비율이 같은 로고로 볼 만큼 가까운가 — 렌더 요청 전 후보 거르기와 비교가 같은 기준을 쓴다. */
export const isLogoAspectClose = (a: number, b: number): boolean =>
	Math.abs(Math.log(a / b)) <= MAX_LOG_ASPECT_DIFF

export interface LogoRaster {
	width: number
	height: number
	/** RGBA, row-major. 잉크 bbox로 잘라 GRID에 맞춘 것. */
	data: Buffer
}

export interface BrandLogoMatch<T> {
	logo: T
	iou: number
	colorDistance: number
	/** 실루엣과 색이 모두 맞으면 true. 실루엣만 맞으면 false(가장 가까운 버전을 진단용으로 돌려준다). */
	matched: boolean
}

/** 잉크 bbox로 잘라낸 렌더(PNG). 로고마다 한 번 굽고 후보마다 GRID로 줄여 쓴다. */
export interface LogoInk {
	png: Buffer
	width: number
	height: number
}

/** 이미지를 굽고 투명 여백을 잘라 잉크 bbox만 남긴다. 잉크가 없으면 null. */
export async function renderLogoInk(image: Buffer): Promise<LogoInk | null> {
	const meta = await sharp(image).metadata()
	// 작은 SVG(14px 로고)도 잘라낸 뒤 GRID보다 촘촘하게 남도록 키워서 굽는다.
	const longSide = Math.max(meta.width ?? 1, meta.height ?? 1)
	const density = Math.min(2400, Math.max(72, (72 * GRID * 4) / longSide))
	const rendered = await sharp(image, { density }).ensureAlpha().png().toBuffer()
	const trimmed = await sharp(rendered)
		.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
		.png()
		.toBuffer({ resolveWithObject: true })
		.catch(() => null) // 전부 투명하면 sharp가 던진다
	return trimmed && { png: trimmed.data, width: trimmed.info.width, height: trimmed.info.height }
}

const toGrid = (png: Buffer, width: number, height: number) =>
	sharp(png).resize(width, height, { fit: 'fill' }).ensureAlpha().raw().toBuffer()

/** 레이어 렌더 하나를 잉크 bbox 비율의 GRID로 굽는다 — 로고 쪽은 이 크기에 맞춰 굽는다. */
export async function rasterizeLogoSource(image: Buffer): Promise<LogoRaster | null> {
	const ink = await renderLogoInk(image)
	if (!ink) return null
	const aspect = ink.width / ink.height
	const size =
		aspect >= 1
			? { width: GRID, height: Math.max(1, Math.round(GRID / aspect)) }
			: { width: Math.max(1, Math.round(GRID * aspect)), height: GRID }
	return { ...size, data: await toGrid(ink.png, size.width, size.height) }
}

function compare(a: Buffer, b: Buffer, pixels: number): { iou: number; colorDistance: number } {
	let intersection = 0
	let union = 0
	let distanceSum = 0
	let solid = 0
	for (let i = 0; i < pixels; i++) {
		const o = i * 4
		const inkA = a[o + 3] >= INK_ALPHA
		const inkB = b[o + 3] >= INK_ALPHA
		if (inkA && inkB) intersection++
		if (inkA || inkB) union++
		if (a[o + 3] >= SOLID_ALPHA && b[o + 3] >= SOLID_ALPHA) {
			const dr = a[o] - b[o]
			const dg = a[o + 1] - b[o + 1]
			const db = a[o + 2] - b[o + 2]
			distanceSum += Math.sqrt(dr * dr + dg * dg + db * db)
			solid++
		}
	}
	return {
		iou: union ? intersection / union : 0,
		colorDistance: solid ? distanceSum / solid : Number.POSITIVE_INFINITY,
	}
}

/**
 * 레이어 렌더와 가장 가까운 로고를 고른다. 실루엣이 맞는 로고가 없으면 null.
 * 실루엣이 맞는 것들 중 색이 가장 가까운 것을 고르고, 그 색이 허용 오차 밖이면 matched=false.
 */
export async function matchBrandLogo<T>(
	source: LogoRaster,
	logos: readonly { logo: T; ink: LogoInk }[],
): Promise<BrandLogoMatch<T> | null> {
	let best: BrandLogoMatch<T> | null = null
	for (const { logo, ink } of logos) {
		if (!isLogoAspectClose(ink.width / ink.height, source.width / source.height)) continue
		const data = await toGrid(ink.png, source.width, source.height)
		const { iou, colorDistance } = compare(source.data, data, source.width * source.height)
		if (iou < MIN_SHAPE_IOU) continue
		if (!best || colorDistance < best.colorDistance) {
			best = { logo, iou, colorDistance, matched: colorDistance <= MAX_COLOR_DISTANCE }
		}
	}
	return best
}
