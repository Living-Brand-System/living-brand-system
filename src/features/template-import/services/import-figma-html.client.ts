import type { importFigmaHtml } from './import-figma-html.service'

/** 라우트가 서비스 결과를 그대로 `Response.json`으로 내리므로 응답 계약은 서비스 반환 타입이다. */
export type ImportedFigmaHtml = Awaited<ReturnType<typeof importFigmaHtml>>

/**
 * Figma URL의 프레임을 HTML로 변환 요청한다 — `POST /api/templates/import-figma-html` 호출을 소유한다.
 * 실패하면 서버가 준 사용자 문구를 담아 throw한다(토큰 미등록·한도·권한 안내가 전부 서버 문구다).
 */
export async function requestFigmaHtmlImport(sourceUrl: string): Promise<ImportedFigmaHtml> {
	const response = await fetch('/api/templates/import-figma-html', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ sourceUrl }),
	})
	const body = (await response.json().catch(() => null)) as
		| (ImportedFigmaHtml & { message?: string })
		| null
	if (!response.ok || !body) {
		throw new Error(body?.message || 'Figma 가져오기에 실패했습니다.')
	}
	return body
}
