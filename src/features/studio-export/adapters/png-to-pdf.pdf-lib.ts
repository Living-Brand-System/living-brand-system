import { PDFDocument } from 'pdf-lib'
import { millimetersToPdfPoints } from '../print-policy'

/**
 * PNG를 지정한 mm × mm 크기의 단일 페이지 PDF로 싣는다.
 *
 * 🔑 **이 경로는 RGB로 낸다.** 판 전체를 구운 이미지 한 장이므로 파일에 색 공간이 하나뿐이고,
 *    「한 파일 한 색상 모드」를 어기지 않는다. 인쇄용 CMYK가 필요한 판은 벡터 경로가 소유한다
 *    (`vector-scene-to-pdf` + `image-to-cmyk-samples`) — 거기서는 잉크 샘플을 그대로 싣는다.
 * 🔴 여기 있던 「CMYK JPEG은 Illustrator에서 반전돼 열리고 라이브러리 층에서 고칠 방법이 없다」는
 *    서술은 2026-09-09에 해소됐다. 원인은 JPEG을 CMYK 운반체로 쓴 것이었고(APP14 Adobe 관례),
 *    벡터 경로는 컨테이너를 없애 그 관례를 통째로 피한다. 그 근거로 이 경로를 CMYK로 바꾸지 말 것 —
 *    바꿔야 할 이유가 생기면 여기도 잉크 샘플을 쓴다.
 */
export async function createRgbPrintPdf({
	heightMm,
	png,
	widthMm,
}: {
	heightMm: number
	png: Buffer
	widthMm: number
}): Promise<Buffer | null> {
	try {
		const pdf = await PDFDocument.create()
		// 🔴 `embedPng`는 다루지 못하는 PNG(16bit·인터레이스 등)에서 던진다. 밖으로 새면 라우트가
		//    500을 내는데, 이건 서버 결함이 아니라 **입력 문제**다 — TIFF 분기와 같이 null로 답해
		//    호출부가 400을 내게 한다.
		const image = await pdf.embedPng(Uint8Array.from(png))
		const page = pdf.addPage([
			millimetersToPdfPoints(widthMm),
			millimetersToPdfPoints(heightMm),
		])
		const { height, width } = page.getSize()
		page.drawImage(image, { height, width, x: 0, y: 0 })
		return Buffer.from(await pdf.save())
	} catch {
		return null
	}
}
