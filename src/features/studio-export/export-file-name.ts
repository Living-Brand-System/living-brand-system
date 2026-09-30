/** 파일명 시각은 KST로 고정한다. 확장자는 내보내기가 붙인다. */
export function exportFileName(name: string, at: Date, content = ''): string {
	const part = (value: string, limit: number, fallback: string) =>
		Array.from(
			value
				.normalize('NFC')
				.replace(/[^\p{L}\p{N} _-]/gu, ' ')
				.trim()
				.replace(/[\s_-]+/g, '-'),
		)
			.slice(0, limit)
			.join('')
			.replace(/-+$/, '') || fallback
	const timestamp = new Date(at.getTime() + 9 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 19)
		.replace(/[-:]/g, '')
		.replace('T', '-')
	return [part(name, 32, 'output'), part(content, 48, ''), timestamp].filter(Boolean).join('-')
}

/** 순번은 1부터 시작한다. 확장자는 원본 또는 형식별 exporter가 붙인다. */
export function numberedExportFileName(name: string, index: number): string {
	return `${name}-${String(index + 1).padStart(2, '0')}`
}
