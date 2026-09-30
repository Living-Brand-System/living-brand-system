// @vitest-environment node
// 🔴 jsdom에서는 pdf-lib이 node Buffer를 자기 realm의 Uint8Array로 못 알아본다. 제품은 서버에서만
//    도는 경로라 이 파일만 node 환경으로 돈다.
import { inflateSync } from 'node:zlib'
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { VectorScene } from '@/modules/studio-artifact/studio-artifact'
import type { CmykSamples } from './image-to-cmyk-samples.sharp'
import { vectorSceneToPdf } from './vector-scene-to-pdf.pdf-lib'

/** 2×1 판에 이미지 하나. 잉크 바이트는 「초록, 흰색」 두 픽셀이다. */
const GREEN_AND_WHITE = Buffer.from([194, 0, 243, 3, 0, 0, 0, 0])

function sceneWith(href: string): VectorScene {
	return {
		width: 100,
		height: 100,
		background: '#ffffff',
		primitives: [{ kind: 'image', x: 0, y: 0, width: 50, height: 50, href }],
	}
}

async function render(samples: CmykSamples | null) {
	const href = 'data:image/png;base64,IGNORED'
	return vectorSceneToPdf(sceneWith(href), {
		cmyk: {
			colors: new Map(),
			iccProfile: Buffer.alloc(0),
			iccProfileName: 'cgats21-crpc6',
			images: samples ? new Map([[href, samples]]) : new Map(),
		},
		ppi: 150,
	})
}

async function images(pdf: Buffer) {
	const doc = await PDFDocument.load(new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength))
	return doc.context
		.enumerateIndirectObjects()
		.map(([, object]) => object)
		.filter(
			(object): object is PDFRawStream =>
				object instanceof PDFRawStream &&
				String(object.dict.get(PDFName.of('Subtype'))) === '/Image',
		)
}

/**
 * 🔴 이 표현을 고른 이유가 반전이다. CMYK를 JPEG으로 운반하면 libjpeg이 APP14 Adobe 마커를 붙이고
 * 샘플을 반전해 저장하는데, PDF 리더는 그 마커를 읽지 않아 `/Decode [1 0 …]`가 되뒤집어야 한다.
 * 그 선언 한 줄이 지워지면 초록이 검정으로 열린다(2026-09-09 실물). raw 샘플에는 반전 관례가
 * **존재할 수 없으므로** `Decode`도 필요 없다 — 그래서 여기서 「없음」을 잠근다.
 */
describe('CMYK 잉크 샘플을 PDF에 싣기', () => {
	it('raw 샘플을 FlateDecode로 싣고 Decode를 넣지 않는다', async () => {
		const pdf = await render({ cmyk: GREEN_AND_WHITE, height: 1, width: 2 })
		const [image, ...rest] = await images(pdf)

		expect(rest).toHaveLength(0)
		expect(String(image.dict.get(PDFName.of('Filter')))).toBe('/FlateDecode')
		expect(String(image.dict.get(PDFName.of('BitsPerComponent')))).toBe('8')
		expect(String(image.dict.get(PDFName.of('Width')))).toBe('2')
		expect(String(image.dict.get(PDFName.of('Height')))).toBe('1')
		// 🔴 JPEG 경로가 심던 `Decode [1 0 …]`가 여기 있으면 색이 반전돼 인쇄된다.
		expect(image.dict.get(PDFName.of('Decode'))).toBeUndefined()
		// 잉크 바이트가 손실 없이 그대로 실렸는지 — 무손실이 이 경로의 이득이다.
		expect(inflateSync(Buffer.from(image.contents))).toEqual(GREEN_AND_WHITE)
	})

	it('알파가 있으면 같은 크기의 DeviceGray를 SMask로 문다', async () => {
		const alpha = Buffer.from([255, 0])
		const pdf = await render({ alpha, cmyk: GREEN_AND_WHITE, height: 1, width: 2 })
		const found = await images(pdf)
		const parent = found.find((image) => image.dict.get(PDFName.of('SMask')))
		const mask = found.find((image) => !image.dict.get(PDFName.of('SMask')))

		expect(parent).toBeDefined()
		expect(mask).toBeDefined()
		expect(String(mask?.dict.get(PDFName.of('ColorSpace')))).toBe('/DeviceGray')
		expect(String(mask?.dict.get(PDFName.of('Decode')))).toBe('[ 0 1 ]')
		expect(inflateSync(Buffer.from(mask?.contents ?? []))).toEqual(alpha)
	})

	it('알파가 없으면 SMask 키를 만들지 않는다', async () => {
		const pdf = await render({ cmyk: GREEN_AND_WHITE, height: 1, width: 2 })
		const [image] = await images(pdf)

		expect(image.dict.get(PDFName.of('SMask'))).toBeUndefined()
	})

	/**
	 * 🔴 샘플을 주지 않으면 그 이미지는 잉크 경로를 타지 않는다 — RGB로 나가 파일이 혼재가 되므로
	 * 호출부(`exportVectorPrint`)가 씬의 이미지를 **전수로** 채우고 못 채우면 거부해야 한다.
	 */
	it('샘플이 없는 이미지는 잉크 경로를 타지 않는다', async () => {
		// data URI가 아닌 href는 RGB 경로도 못 실어 아무것도 안 그린다.
		const pdf = await vectorSceneToPdf(sceneWith('/asset/photo.png'), {
			cmyk: {
				colors: new Map(),
				iccProfile: Buffer.alloc(0),
				iccProfileName: 'cgats21-crpc6',
				images: new Map(),
			},
			ppi: 150,
		})

		expect(await images(pdf)).toHaveLength(0)
	})
})

/**
 * 🔴 pdf-lib의 `JpegEmbedder`가 `imageData.buffer`를 읽으면서 `byteOffset`을 무시한다. Node의
 * Buffer 풀(4KB 이하)에서 잘라 온 버퍼는 오프셋이 0이 아니어서 `SOI not found in JPEG`으로
 * **내보내기가 통째로 죽었다**. 이 결함은 **이미지 크기에 달려 있다** — 큰 이미지로 테스트를 쓰면
 * 조용히 통과하므로 여기서는 반드시 4KB 아래를 쓴다.
 */
describe('4KB 이하 JPEG', () => {
	it('RGB 경로에서 내보내기를 죽이지 않는다', async () => {
		const jpeg = await sharp({
			create: { background: '#00AF41', channels: 3, height: 40, width: 40 },
		})
			.jpeg()
			.toBuffer()
		expect(jpeg.byteLength).toBeLessThan(4096)

		const pdf = await vectorSceneToPdf(
			sceneWith(`data:image/jpeg;base64,${jpeg.toString('base64')}`),
			{ ppi: 150 },
		)

		expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
	})
})
