import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { fitRasterToLimit } from './fit-raster-to-limit'

// 압축이 잘 안 되는 잡음 이미지 — 상한을 넘기기 쉽다.
async function noisePng(size: number) {
	const raw = Buffer.alloc(size * size * 3)
	for (let i = 0; i < raw.length; i++) raw[i] = (i * 2654435761) >>> 24
	return sharp(raw, { raw: { width: size, height: size, channels: 3 } })
		.png()
		.toBuffer()
}

describe('fitRasterToLimit', () => {
	it('상한 안이면 손대지 않는다', async () => {
		const png = await noisePng(16)
		expect(await fitRasterToLimit(png, 'image/png', png.byteLength)).toEqual({
			data: png,
			mimeType: 'image/png',
		})
	})

	it('상한을 넘으면 같은 해상도로 들어가는 가장 높은 화질의 WebP로 다시 만든다', async () => {
		const png = await noisePng(256)
		const limit = Math.floor(png.byteLength / 2)

		const fitted = await fitRasterToLimit(png, 'image/png', limit)

		expect(fitted.mimeType).toBe('image/webp')
		expect(fitted.data.byteLength).toBeLessThanOrEqual(limit)
		const meta = await sharp(fitted.data).metadata()
		expect([meta.width, meta.height]).toEqual([256, 256])
	})

	it('최저 화질로도 안 들어가면 413으로 알린다', async () => {
		await expect(fitRasterToLimit(await noisePng(256), 'image/png', 100)).rejects.toMatchObject(
			{
				status: 413,
			},
		)
	})
})
