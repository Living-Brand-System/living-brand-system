'use client'

/**
 * 템플릿에 얹힌 래스터 이미지를 **상자에 맞춰 구운 data URI**로 바꾼다.
 *
 * 🔴 URL을 그대로 실으면 내보낸 파일 밖에서는 아무것도 안 보인다 — SVG의 `<image href>`는 상대
 *    경로를 못 풀고, PDF는 외부 URL을 임베드하지 않는다. 인쇄물이 빈 자리로 나가는 사고다.
 * 🔑 `cover`처럼 상자를 넘치는 맞춤은 **미리 잘라서** 굽는다. 클립 경로를 쓰면 `<defs>` 참조가
 *    생겨 Figma·Illustrator에서 깨진다 — 참조는 굽고 개체만 남긴다는 이 기능의 원칙과 같다.
 */
export type ImageFit = 'contain' | 'cover' | 'fill'

/** 인쇄 해상도를 위해 상자보다 크게 굽되 원본 해상도는 넘지 않는다 — 없는 화소를 만들지 않는다. */
const MAX_BAKE_SCALE = 3

const cache = new Map<string, Promise<string | null>>()

/**
 * `crop`은 상자 안에서 실제로 보이는 부분이다(조상 프레임이 `overflow: hidden`으로 자른 결과).
 * 🔴 자르기를 클립 경로로 하지 않고 **비트맵에서 잘라 낸다** — `<defs>` 참조가 생기면 디자인 툴에서
 *    깨진다. 그래서 넘치는 사진은 넘친 채로 실리지 않고 보이는 만큼만 실린다.
 */
export function toBakedImageDataUrl(
	source: string,
	box: { width: number; height: number },
	fit: ImageFit,
	crop?: { x: number; y: number; width: number; height: number },
): Promise<string | null> {
	const cropKey = crop
		? `|${Math.round(crop.x)},${Math.round(crop.y)},${Math.round(crop.width)}x${Math.round(crop.height)}`
		: ''
	const key = `${source}|${Math.round(box.width)}x${Math.round(box.height)}|${fit}${cropKey}`
	const cached = cache.get(key)
	if (cached) return cached
	const baking = bake(source, box, fit, crop).catch(() => null)
	cache.set(key, baking)
	return baking
}

async function bake(
	source: string,
	box: { width: number; height: number },
	fit: ImageFit,
	crop?: { x: number; y: number; width: number; height: number },
): Promise<string | null> {
	const image = await loadImage(source)
	if (!image) return null

	const natural = { width: image.naturalWidth, height: image.naturalHeight }
	if (natural.width === 0 || natural.height === 0) return null

	// 원본이 상자보다 작으면 확대해 굽지 않는다 — 파일만 커지고 화질은 그대로다.
	const resolution = Math.min(
		MAX_BAKE_SCALE,
		Math.max(1, natural.width / box.width, natural.height / box.height),
	)
	const visible = crop ?? { x: 0, y: 0, width: box.width, height: box.height }
	const canvas = document.createElement('canvas')
	canvas.width = Math.max(1, Math.round(visible.width * resolution))
	canvas.height = Math.max(1, Math.round(visible.height * resolution))
	const context = canvas.getContext('2d')
	if (!context) return null
	context.imageSmoothingQuality = 'high'

	// 맞춤은 **원래 상자** 기준으로 계산하고, 보이는 부분만큼 밀어 그린다.
	const placement = fitRect(
		natural,
		{ width: box.width * resolution, height: box.height * resolution },
		fit,
	)
	context.drawImage(
		image,
		placement.x - visible.x * resolution,
		placement.y - visible.y * resolution,
		placement.width,
		placement.height,
	)

	// 불투명하면 JPEG로 — 사진 한 장이 PNG로 수십 MB가 되면 인쇄 변환 상한에 걸린다.
	return isOpaque(context, canvas)
		? canvas.toDataURL('image/jpeg', 0.95)
		: canvas.toDataURL('image/png')
}

/**
 * 이미 구운 이미지를 **보이는 부분만** 잘라 낸다.
 *
 * 🔴 자르지 않고 좁은 상자에 밀어 넣으면 그림이 찌그러진다 — 2026-08-27에 3462×1932 비트맵이
 *    630×644 상자에 들어가 가로로 0.55배가 됐다. 조상 프레임이 자르는 만큼 **비트맵에서** 잘라야 한다.
 * `crop`은 원본 상자 안에서의 좌표이고, `sourceScale`은 그 상자 대비 비트맵의 배율이다.
 */
export async function cropBakedImage(
	dataUrl: string,
	crop: { x: number; y: number; width: number; height: number },
	sourceScale: number,
): Promise<string | null> {
	const image = await loadImage(dataUrl)
	if (!image) return null
	const canvas = document.createElement('canvas')
	canvas.width = Math.max(1, Math.round(crop.width * sourceScale))
	canvas.height = Math.max(1, Math.round(crop.height * sourceScale))
	const context = canvas.getContext('2d')
	if (!context) return null
	context.drawImage(image, -crop.x * sourceScale, -crop.y * sourceScale)
	// 마스크 밖이 투명이라 알파를 잃으면 안 된다 — 여기서는 항상 PNG다.
	return canvas.toDataURL('image/png')
}

/** CSS `object-fit`/`background-size`가 정하는 그리기 사각형. 원점은 캔버스 좌상단이다. */
export function fitRect(
	natural: { width: number; height: number },
	target: { width: number; height: number },
	fit: ImageFit,
): { x: number; y: number; width: number; height: number } {
	if (fit === 'fill') return { x: 0, y: 0, ...target }
	const scaleX = target.width / natural.width
	const scaleY = target.height / natural.height
	const scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)
	const width = natural.width * scale
	const height = natural.height * scale
	// 두 맞춤 모두 가운데 정렬이다(importer가 `background-position: center`를 심는다).
	return { x: (target.width - width) / 2, y: (target.height - height) / 2, width, height }
}

/**
 * 알파가 하나라도 있으면 PNG로 가야 한다. 전체를 훑되 화소를 건너뛰며 본다 —
 * ponytail: 4픽셀 간격 표본이다. 아주 가는 반투명 획만 있는 이미지는 놓칠 수 있고, 그때는 JPEG로
 * 구워져 그 부분이 흰 배경에 얹힌다. 놓치면 간격을 1로 내린다.
 */
function isOpaque(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): boolean {
	const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
	for (let index = 3; index < data.length; index += 16) {
		if (data[index] < 255) return false
	}
	return true
}

function loadImage(source: string): Promise<HTMLImageElement | null> {
	return new Promise((resolve) => {
		const image = new Image()
		image.decoding = 'sync'
		image.onload = () => resolve(image)
		image.onerror = () => resolve(null)
		image.src = source
	})
}
