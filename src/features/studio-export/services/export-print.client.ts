'use client'

import type { CmykIccProfile } from '../export-contract'
import { MAX_PRINT_PNG_BYTES, type PrintExportFormat, type PrintPpi } from '../print-policy'

export class PrintExportDownloadError extends Error {}

/** 브라우저 PNG를 공통 서버 인쇄 변환 경계로 전달한다. HTTP I/O는 이 adapter가 소유한다. */
export async function requestPrintExport({
	colorProfile,
	fileName,
	format,
	png,
	ppi,
}: {
	colorProfile: CmykIccProfile
	fileName: string
	format: PrintExportFormat
	png: Blob
	ppi: PrintPpi
}): Promise<Blob> {
	if (png.size > MAX_PRINT_PNG_BYTES) {
		throw new PrintExportDownloadError(
			`렌더된 PNG가 ${MAX_PRINT_PNG_BYTES / 1_000_000}MB를 초과합니다. 출력 크기를 줄여 주세요.`,
		)
	}

	const form = new FormData()
	form.set('colorProfile', colorProfile)
	form.set('ppi', String(ppi))
	form.set('image', png, `${fileName}.png`)

	const response = await fetch(`/api/studio-exports/print/${format}`, {
		body: form,
		method: 'POST',
	})
	// 🔴 서버는 원인을 구분해서 주는데 한 문구로 접으면 안내가 거짓이 된다 —
	//    401은 다시 눌러도 안 되고, 413은 크기를 줄여야 한다.
	if (!response.ok) {
		throw new PrintExportDownloadError(printFailureMessage(format, response.status))
	}
	return response.blob()
}

/** 상태코드를 「사용자가 다음에 무엇을 해야 하나」로 옮긴다. 벡터 PDF 경로도 같은 표를 쓴다. */
export function printFailureMessage(format: PrintExportFormat, status: number): string {
	const label = `${format.toUpperCase()} 내보내기`
	switch (status) {
		case 401:
			return `로그인이 만료되어 ${label}를 하지 못했습니다. 새로고침 후 다시 로그인해 주세요.`
		case 403:
			return `${label} 권한이 없습니다.`
		case 413:
			return `출력이 너무 커서 ${label}를 하지 못했습니다. 크기나 해상도를 줄여 주세요.`
		case 429:
			return `${label} 요청이 많습니다. 잠시 후 다시 시도해 주세요.`
		case 400:
			return `${label}가 지원하지 않는 출력입니다. 크기나 해상도를 줄여 주세요.`
		default:
			return `${label}에 실패했습니다. 잠시 후 다시 시도해 주세요.`
	}
}
