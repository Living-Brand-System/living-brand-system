import { inspectPng } from '../adapters/inspect-png.sharp'
import { pngToCmykTiff } from '../adapters/png-to-cmyk-tiff.sharp'
import { createRgbPrintPdf } from '../adapters/png-to-pdf.pdf-lib'
import { DEFAULT_CMYK_ICC_PROFILE } from '../color-profile'
import { resolveCmykIccProfilePath } from '../color-profile.server'
import type { CmykIccProfile } from '../export-contract'
import {
	findPrintOutputBlocker,
	type PrintExportFormat,
	type PrintPpi,
	pixelsToMillimeters,
} from '../print-policy'

export class PrintExportInputError extends Error {}

/**
 * 검증된 PNG를 TIFF 또는 mm 단위 PDF로 변환한다. Sharp·pdf-lib I/O는 각 adapter가 소유한다.
 * 🔴 TIFF는 CMYK로, **PDF는 RGB로** 나간다 — PDF 안의 CMYK JPEG이 Illustrator에서 반전되는
 *    알려진 결함 때문이다(`png-to-pdf.pdf-lib`의 주석이 근거를 갖는다).
 */
export async function exportPrint({
	colorProfile = DEFAULT_CMYK_ICC_PROFILE,
	format,
	png,
	ppi,
}: {
	colorProfile?: CmykIccProfile
	format: PrintExportFormat
	png: Buffer
	ppi: PrintPpi
}): Promise<Buffer> {
	const image = await inspectPng(png)
	if (
		!image ||
		findPrintOutputBlocker({ enabled: true, height: image.height, width: image.width })
	) {
		throw new PrintExportInputError()
	}
	const icc = resolveCmykIccProfilePath(colorProfile)

	if (format === 'tiff') {
		const tiff = await pngToCmykTiff(png, ppi, icc)
		if (!tiff) throw new PrintExportInputError()
		return tiff
	}

	const pdf = await createRgbPrintPdf({
		heightMm: pixelsToMillimeters(image.height, ppi),
		png,
		widthMm: pixelsToMillimeters(image.width, ppi),
	})
	if (!pdf) throw new PrintExportInputError()
	return pdf
}
