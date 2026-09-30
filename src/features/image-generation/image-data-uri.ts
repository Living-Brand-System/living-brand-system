import sharp from 'sharp'

export const MAX_IMAGE_BYTES = 20_000_000
// Nano Banana 2의 지원 4K 비율은 최대 17,203,200픽셀이다.
const MAX_IMAGE_PIXELS = 18_000_000

export interface DecodedImageDataUri {
	data: Buffer
	extension: 'jpg' | 'png' | 'webp'
	mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
}

/** 외부 생성 결과 data URI의 MIME·실제 이미지 형식·크기 상한을 함께 검증한다. */
export async function decodeImageDataUri(value: string): Promise<DecodedImageDataUri> {
	const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
	if (!match) throw new Error('Invalid image data URI.')

	const format = match[1] as 'jpeg' | 'png' | 'webp'
	return validateRasterImage(Buffer.from(match[2], 'base64'), `image/${format}`)
}

/** 저장소에서 읽은 raster 파일의 MIME·실제 이미지 형식·크기 상한을 검증한다. */
export async function validateRasterImage(
	data: Buffer,
	expectedMimeType?: string | null,
): Promise<DecodedImageDataUri> {
	if (data.byteLength === 0 || data.byteLength > MAX_IMAGE_BYTES) {
		throw new Error('Invalid raster image.')
	}

	const metadata = await sharp(data, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata()
	if (!['jpeg', 'png', 'webp'].includes(metadata.format ?? '')) {
		throw new Error('Invalid raster image.')
	}
	const format = metadata.format as 'jpeg' | 'png' | 'webp'
	const mimeType = `image/${format}` as DecodedImageDataUri['mimeType']
	if (expectedMimeType && expectedMimeType.split(';', 1)[0]?.trim() !== mimeType) {
		throw new Error('Invalid raster image.')
	}

	return {
		data,
		extension: format === 'jpeg' ? 'jpg' : format,
		mimeType,
	}
}
