import { convertFileListToFileUIParts, type FileUIPart } from 'ai'

/**
 * 채팅 이미지 첨부를 모델 한도 안으로 자동 축소한다.
 *
 * Anthropic은 이미지당 5MB를 거부하고, 라우트는 본문 25MB에서 413을 돌려준다.
 * 그 두 한도에 걸리기 전에 클라이언트에서 큰 이미지만 다운스케일 + JPEG 재인코딩한다.
 * WebP가 아니라 JPEG인 이유: Safari의 canvas.toDataURL('image/webp')는 조용히
 * PNG로 폴백해 압축이 무효가 된다.
 */

/** 모델 한도(이미지당 5MB)에 base64 팽창(~33%) 여유를 둔 값. */
export const MAX_IMAGE_ATTACHMENT_BYTES = 3_500_000

/** 다운스케일 상한 — 긴 변 기준. 모델도 이보다 큰 이미지는 스스로 줄여서 본다. */
const MAX_IMAGE_EDGE_PX = 2048

// ponytail: 고정 2단 품질 사다리 — 2048px JPEG이 0.6에서도 한도를 넘는 경우는 사실상 없다.
const JPEG_QUALITIES = [0.85, 0.6] as const

/** 긴 변이 maxEdge를 넘지 않도록 비율을 유지한 크기를 돌려준다. */
export function fitWithin(
	width: number,
	height: number,
	maxEdge: number,
): { width: number; height: number } {
	const scale = Math.min(1, maxEdge / Math.max(width, height, 1))
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	}
}

/** SVG는 래스터화 결과를 신뢰할 수 없어 건드리지 않는다 — 텍스트라 크기도 문제되지 않는다. */
export function needsImageCompression(file: { size: number; type: string }): boolean {
	return (
		file.type.startsWith('image/') &&
		file.type !== 'image/svg+xml' &&
		file.size > MAX_IMAGE_ATTACHMENT_BYTES
	)
}

/** data URL의 디코딩 후 바이트 수를 어림한다(base64 4자 = 3바이트). */
export function estimateDataUrlBytes(url: string): number {
	const payload = url.slice(url.indexOf(',') + 1)
	return Math.floor(payload.length * 0.75)
}

/**
 * 전송할 첨부를 FileUIPart 배열로 바꾸되 한도를 넘는 이미지만 축소한다.
 * 축소에 실패한 파일(디코딩 불가 등)은 원본 그대로 보낸다 — 서버 검증이 최종 경계다.
 *
 * FileList를 그대로 돌려주지 않는다: <input>의 FileList는 살아 있는 객체라, 호출자가
 * 이 함수를 await하는 사이 input을 비우면 같은 객체가 0개가 되어 첨부가 조용히 빠진다.
 * 그래서 첫 await 전에 동기로 떠 둔다(convertFileListToFileUIParts도 호출 즉시 읽는다).
 */
export async function prepareAgentChatFiles(
	files: FileList | undefined,
): Promise<FileUIPart[] | undefined> {
	if (!files?.length) return undefined

	const list = Array.from(files)
	const parts = await convertFileListToFileUIParts(files)
	return Promise.all(
		list.map(async (file, index) => {
			const original = parts[index] as FileUIPart
			if (!needsImageCompression(file)) return original
			const compressed = await compressImageFile(file).catch(() => null)
			return compressed ?? original
		}),
	)
}

async function compressImageFile(file: File): Promise<FileUIPart | null> {
	const bitmap = await createImageBitmap(file)
	try {
		const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_EDGE_PX)
		const canvas = document.createElement('canvas')
		canvas.width = width
		canvas.height = height
		const context = canvas.getContext('2d')
		if (!context) return null

		// JPEG은 알파를 못 가진다 — 투명 영역이 검게 뭉개지지 않게 흰 바탕을 깐다.
		context.fillStyle = '#ffffff'
		context.fillRect(0, 0, width, height)
		context.drawImage(bitmap, 0, 0, width, height)

		let url = ''
		for (const quality of JPEG_QUALITIES) {
			url = canvas.toDataURL('image/jpeg', quality)
			if (estimateDataUrlBytes(url) <= MAX_IMAGE_ATTACHMENT_BYTES) break
		}

		return {
			type: 'file',
			mediaType: 'image/jpeg',
			filename: file.name,
			url,
		}
	} finally {
		bitmap.close()
	}
}
