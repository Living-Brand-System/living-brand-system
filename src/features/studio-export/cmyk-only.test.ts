// @vitest-environment node
import { cmyk, grayscale, PDFDocument, PDFName, rgb } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { findNonCmykColors } from './cmyk-only'

/**
 * 🔴 「검사기가 안 보는 것은 승인된다」가 이 리포의 원칙이다. 이 검사기는 완성된 인쇄 PDF에 CMYK
 * 아닌 색이 남았는지 보는 **마지막 방어선**이므로, 각 위반을 실제로 심어 잡히는지 확인한다.
 * 통과 케이스도 함께 잠근다 — 오탐하면 정상 판이 안 나간다.
 */
async function pdfWith(build: (doc: PDFDocument) => void): Promise<Buffer> {
	const doc = await PDFDocument.create()
	doc.addPage([100, 100])
	build(doc)
	return Buffer.from(await doc.save())
}

/** 4채널 ICC 프로파일 스트림. 실제 프로파일 바이트는 검사 대상이 아니다. */
function cmykProfile(doc: PDFDocument) {
	return doc.context.register(
		doc.context.flateStream(Uint8Array.from([1, 2, 3, 4]), { Alternate: 'DeviceCMYK', N: 4 }),
	)
}

function image(doc: PDFDocument, dict: Record<string, unknown>) {
	const ref = doc.context.register(
		doc.context.flateStream(Uint8Array.from([0, 0, 0, 0]), {
			BitsPerComponent: 8,
			Height: 1,
			Subtype: 'Image',
			Type: 'XObject',
			Width: 1,
			...dict,
		}),
	)
	doc.getPage(0).node.newXObject('Img', ref)
	return ref
}

describe('findNonCmykColors', () => {
	it('CMYK만 쓴 판은 통과한다 — 오탐하면 정상 판이 막힌다', async () => {
		const pdf = await pdfWith((doc) => {
			const page = doc.getPage(0)
			page.drawRectangle({ color: cmyk(1, 0, 1, 0) })
			image(doc, { ColorSpace: [PDFName.of('ICCBased'), cmykProfile(doc)] })
		})

		expect(await findNonCmykColors(pdf)).toEqual([])
	})

	it('🔴 RGB 도형을 잡는다', async () => {
		const pdf = await pdfWith((doc) => {
			doc.getPage(0).drawRectangle({ color: rgb(0, 1, 0) })
		})

		expect((await findNonCmykColors(pdf)).join()).toContain('RGB 도형')
	})

	/**
	 * 🔴 판의 도형은 대부분 페이지가 아니라 **묶음 form** 안에서 그려진다. 페이지만 보면 그 색이
	 * 전부 검사 밖에 남는다 — 검사기가 안 보는 것은 승인된 것과 같다.
	 */
	it('🔴 form XObject 안의 RGB 도형을 잡는다', async () => {
		const pdf = await pdfWith((doc) => {
			const form = doc.context.register(
				doc.context.flateStream(new TextEncoder().encode('0 1 0 rg 0 0 10 10 re f'), {
					BBox: [0, 0, 100, 100],
					FormType: 1,
					Subtype: 'Form',
					Type: 'XObject',
				}),
			)
			doc.getPage(0).node.newXObject('Layer', form)
		})

		expect((await findNonCmykColors(pdf)).join()).toContain('RGB 도형')
	})

	it('🔴 회색조 도형을 잡는다', async () => {
		const pdf = await pdfWith((doc) => {
			doc.getPage(0).drawRectangle({ color: grayscale(0.5) })
		})

		expect((await findNonCmykColors(pdf)).join()).toContain('회색조')
	})

	it('🔴 DeviceRGB 이미지를 잡는다', async () => {
		const pdf = await pdfWith((doc) => {
			image(doc, { ColorSpace: 'DeviceRGB' })
		})

		expect((await findNonCmykColors(pdf)).join()).toContain('CMYK가 아니다')
	})

	/** 🔴 CMYK를 JPEG으로 실으면 APP14 반전 관례가 딸려온다. 그 표현을 쓰지 않기로 정했다. */
	it('🔴 CMYK 이미지를 DCTDecode로 실으면 잡는다', async () => {
		const pdf = await pdfWith((doc) => {
			const ref = doc.context.register(
				doc.context.stream(Uint8Array.from([0xff, 0xd8]), {
					BitsPerComponent: 8,
					ColorSpace: [PDFName.of('ICCBased'), cmykProfile(doc)],
					Filter: 'DCTDecode',
					Height: 1,
					Subtype: 'Image',
					Type: 'XObject',
					Width: 1,
				}),
			)
			doc.getPage(0).node.newXObject('Jpeg', ref)
		})

		expect((await findNonCmykColors(pdf)).join()).toContain('DCTDecode')
	})

	/** 🔴 `[/ICCBased ref]`라는 이름만으로는 CMYK가 아니다 — 채널 수는 프로파일의 `/N`이 갖는다. */
	it('🔴 ICC 프로파일이 3채널이면 잡는다', async () => {
		const pdf = await pdfWith((doc) => {
			const rgbProfile = doc.context.register(
				doc.context.flateStream(Uint8Array.from([1]), { Alternate: 'DeviceRGB', N: 3 }),
			)
			image(doc, { ColorSpace: [PDFName.of('ICCBased'), rgbProfile] })
		})

		expect((await findNonCmykColors(pdf)).join()).toContain('N=3')
	})

	/** 🔑 알파 마스크는 DeviceGray가 정상이다 — 색이 아니라 투명도를 싣는다. */
	it('SMask의 DeviceGray는 오탐하지 않는다', async () => {
		const pdf = await pdfWith((doc) => {
			const mask = image(doc, { ColorSpace: 'DeviceGray', Decode: [0, 1] })
			image(doc, { ColorSpace: [PDFName.of('ICCBased'), cmykProfile(doc)], SMask: mask })
		})

		expect(await findNonCmykColors(pdf)).toEqual([])
	})
})
