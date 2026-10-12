import sharp, { type WebpOptions } from 'sharp'
import { FigmaImportError } from '@/lib/errors'

/** 가져온 이미지 하나를 저장하는 상한 — 업로드 상한(20MB, docs/07 #27) 안쪽에 여유를 둔다. */
export const MAX_STORED_IMAGE_BYTES = 15 * 1024 * 1024

/**
 * 화질 순서. 무손실이 먼저고, 그래도 넘치면 손실 압축을 한 단계씩 내린다. 픽셀 크기는 줄이지 않는다.
 * ponytail: 80 아래로는 내리지 않는다 — 그 밑은 「깨진 이미지」라 차라리 실패로 알린다.
 */
const WEBP_ATTEMPTS: readonly WebpOptions[] = [
	{ lossless: true },
	{ quality: 100 },
	{ quality: 95 },
	{ quality: 90 },
	{ quality: 85 },
	{ quality: 80 },
]

/**
 * 저장 상한을 넘는 래스터를 실패시키지 않고, 같은 해상도로 들어가는 가장 높은 화질로 다시 만든다.
 * 상한 안이거나 SVG면 그대로 돌려준다.
 */
export async function fitRasterToLimit(
	data: Buffer,
	mimeType: string,
	limit = MAX_STORED_IMAGE_BYTES,
): Promise<{ data: Buffer; mimeType: string }> {
	if (data.byteLength <= limit || mimeType === 'image/svg+xml') return { data, mimeType }
	for (const options of WEBP_ATTEMPTS) {
		const encoded = await sharp(data).webp(options).toBuffer()
		if (encoded.byteLength <= limit) return { data: encoded, mimeType: 'image/webp' }
	}
	throw new FigmaImportError(
		`Figma image cannot fit ${limit} bytes even at webp quality 80 (${data.byteLength} bytes).`,
		'Figma 레이어 이미지가 너무 커서 화질을 지키며 저장할 수 없습니다. 원본 이미지 크기를 줄여 다시 가져오세요.',
		413,
	)
}
