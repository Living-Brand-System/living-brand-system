import { afterEach, expect, it, vi } from 'vitest'

const codec = vi.hoisted(() => ({ encode: vi.fn(), init: vi.fn() }))
vi.mock('@jsquash/webp/encode.js', () => ({ default: codec.encode, init: codec.init }))

afterEach(() => {
	vi.unstubAllGlobals()
	vi.resetAllMocks()
	vi.resetModules()
})

it('원본에서 비율을 유지해 축소하고 품질을 낮춰 1MB 이하 WebP를 반환한다', async () => {
	const close = vi.fn()
	const bitmap = { width: 4000, height: 3000, close }
	const decode = vi.fn().mockResolvedValue(bitmap)
	const drawImage = vi.fn()
	const canvasSizes: number[][] = []
	vi.stubGlobal('createImageBitmap', decode)
	vi.stubGlobal(
		'OffscreenCanvas',
		class {
			constructor(
				public width: number,
				public height: number,
			) {
				canvasSizes.push([width, height])
			}
			getContext() {
				return {
					drawImage,
					getImageData: () => ({ width: this.width, height: this.height }),
				}
			}
		},
	)
	const postMessage = vi.fn()
	vi.stubGlobal('postMessage', postMessage)
	codec.encode
		.mockResolvedValueOnce(new ArrayBuffer(1_000_001))
		.mockResolvedValueOnce(new ArrayBuffer(1_000_000))
	await import('./reference-image.worker')
	const file = new File(['image'], 'photo.jpg')
	await self.onmessage?.({ data: file } as MessageEvent)
	expect(decode).toHaveBeenCalledWith(file, { imageOrientation: 'from-image' })
	expect(canvasSizes).toEqual([[1024, 768]])
	expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1024, 768)
	expect(codec.encode.mock.calls.map((call) => call[1].quality)).toEqual([85, 75])
	expect(postMessage.mock.calls[0]?.[0]).toMatchObject({ size: 1_000_000, type: 'image/webp' })
	expect(close).toHaveBeenCalledOnce()
})

it('디코딩 실패 시 원본을 반환하지 않는다', async () => {
	vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('invalid')))
	const postMessage = vi.fn()
	vi.stubGlobal('postMessage', postMessage)
	await import('./reference-image.worker')
	await self.onmessage?.({ data: new File(['bad'], 'bad.png') } as MessageEvent)
	expect(postMessage).toHaveBeenCalledWith({ error: expect.any(String) })
	expect(codec.encode).not.toHaveBeenCalled()
})
