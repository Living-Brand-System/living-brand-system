import type { ImageModelPreset } from '@/features/image-generation/domain/image-model'

export const IMAGE_ASPECT_RATIOS = [
	'1:1',
	'2:3',
	'3:2',
	'3:4',
	'4:3',
	'4:5',
	'5:4',
	'9:16',
	'16:9',
	'21:9',
] as const

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number]

export const IMAGE_ASPECT_RATIO_OPTIONS = IMAGE_ASPECT_RATIOS.map((value) => ({
	label: value,
	value,
}))

/**
 * 박스(px)에 가장 가까운 지원 비율을 고른다 — 로그 공간 거리로 비교해 가로형·세로형 편향을 없앤다.
 * 잘못된 입력(비유한·0 이하)은 undefined — 호출자가 프로파일 비율로 폴백한다.
 */
export function nearestImageAspectRatio(
	width: number,
	height: number,
): ImageAspectRatio | undefined {
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		return undefined
	}
	const target = Math.log(width / height)
	let nearest: ImageAspectRatio = IMAGE_ASPECT_RATIOS[0]
	let nearestDistance = Number.POSITIVE_INFINITY
	for (const ratio of IMAGE_ASPECT_RATIOS) {
		const [ratioWidth, ratioHeight] = ratio.split(':').map(Number)
		const distance = Math.abs(Math.log(ratioWidth / ratioHeight) - target)
		if (distance < nearestDistance) {
			nearest = ratio
			nearestDistance = distance
		}
	}
	return nearest
}

export const IMAGE_OUTPUT_SIZES = ['1K', '2K', '4K'] as const

export type ImageOutputSize = (typeof IMAGE_OUTPUT_SIZES)[number]

export const IMAGE_OUTPUT_SIZE_OPTIONS = IMAGE_OUTPUT_SIZES.map((value) => ({
	label: value,
	value,
}))

const TARGET_PIXELS_BY_SIZE: Record<ImageOutputSize, number> = {
	'1K': 1024 ** 2,
	'2K': 2048 ** 2,
	'4K': 3840 * 2160,
}

/** 제공자 중립 출력 계약을 gpt-image-2의 유효한 픽셀 크기로 변환한다. */
export function toOpenAIImageSize(
	aspectRatio: ImageAspectRatio,
	imageSize: ImageOutputSize,
): `${number}x${number}` {
	const [ratioWidth, ratioHeight] = aspectRatio.split(':').map(Number)
	const targetPixels = TARGET_PIXELS_BY_SIZE[imageSize]
	const rawWidth = Math.sqrt((targetPixels * ratioWidth) / ratioHeight)
	const rawHeight = rawWidth * (ratioHeight / ratioWidth)
	const scale = Math.min(1, 3840 / Math.max(rawWidth, rawHeight))
	let width = Math.round((rawWidth * scale) / 16) * 16
	let height = Math.round((rawHeight * scale) / 16) * 16

	while (width * height > TARGET_PIXELS_BY_SIZE['4K']) {
		if (width >= height) width -= 16
		else height -= 16
	}

	return `${width}x${height}`
}

export function supportsImageOutputSize(
	modelPreset: ImageModelPreset,
	imageSize: ImageOutputSize,
): boolean {
	return modelPreset !== 'google-nano-banana-2-lite' || imageSize === '1K'
}
