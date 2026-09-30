import encode, { init } from '@jsquash/webp/encode.js'
import {
	IMAGE_REFERENCE_MAX_BYTES,
	IMAGE_REFERENCE_MAX_EDGE,
	type ReferenceImageResult,
} from '../../domain/reference-image/contract'

// 번들러가 두 WASM 파일을 정적 자산으로 배포하도록 명시한다.
const wasmUrls = {
	'webp_enc.wasm': new URL('@jsquash/webp/codec/enc/webp_enc.wasm', import.meta.url),
	'webp_enc_simd.wasm': new URL('@jsquash/webp/codec/enc/webp_enc_simd.wasm', import.meta.url),
}

self.onmessage = async ({ data: file }: MessageEvent<File>) => {
	let bitmap: ImageBitmap | undefined
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
		await init({ locateFile: (path: string) => wasmUrls[path as keyof typeof wasmUrls].href })
		for (const edge of [IMAGE_REFERENCE_MAX_EDGE, 896, 768]) {
			const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
			const canvas = new OffscreenCanvas(
				Math.max(1, Math.round(bitmap.width * scale)),
				Math.max(1, Math.round(bitmap.height * scale)),
			)
			const context = canvas.getContext('2d')
			if (!context) throw new Error('Canvas unavailable')
			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
			for (const quality of [85, 75, 65, 55]) {
				const bytes = await encode(pixels, { quality })
				if (bytes.byteLength <= IMAGE_REFERENCE_MAX_BYTES) {
					self.postMessage(
						new Blob([bytes], { type: 'image/webp' }) satisfies ReferenceImageResult,
					)
					return
				}
			}
		}
		self.postMessage({
			error: '이미지를 1MB 이하로 줄이지 못했어요. 더 작은 이미지를 선택해 주세요.',
		} satisfies ReferenceImageResult)
	} catch {
		self.postMessage({
			error: '이미지를 변환하지 못했어요. 다른 이미지를 선택해 주세요.',
		} satisfies ReferenceImageResult)
	} finally {
		bitmap?.close()
	}
}
