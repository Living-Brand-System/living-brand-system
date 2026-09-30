import sharp from 'sharp'
import { expect, it } from 'vitest'
import { decodeImageDataUri } from './image-data-uri'

it.each([
	[4800, 3584, true], // 지원하는 Nano Banana 2 4K 비율 중 최대 픽셀 수
	[6000, 3000, true], // 18MP 경계
	[6000, 3001, false],
])('%i × %i 이미지의 픽셀 상한을 검증한다', async (width, height, allowed) => {
	const data = await sharp({
		create: { width, height, channels: 3, background: '#ffffff' },
	})
		.png()
		.toBuffer()
	const result = decodeImageDataUri(`data:image/png;base64,${data.toString('base64')}`)
	if (allowed) {
		await expect(result).resolves.toMatchObject({ data, mimeType: 'image/png' })
	} else {
		await expect(result).rejects.toThrow('Input image exceeds pixel limit')
	}
})
