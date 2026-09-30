import { exportResultsToZip } from '@/features/studio-export/adapters/export-results-to-zip.client'
import { downloadBlob } from '@/lib/object-url'

export type SectionDownload = {
	filename: string
	assets: readonly { url: string; filename: string }[]
}

/** 호출자가 명시한 파일만 묶는다. 하위 섹션의 에셋은 탐색하지 않는다. */
export async function downloadSectionAssets(download: SectionDownload) {
	if (!download.assets.length) return
	const items = await Promise.all(
		download.assets.map(async (asset) => {
			const response = await fetch(asset.url)
			if (!response.ok) throw new Error('에셋을 불러오지 못했습니다.')
			return {
				data: await response.blob(),
				filename: asset.filename,
				mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
			}
		}),
	)
	const result = await exportResultsToZip({ format: 'zip', filename: download.filename, items })
	downloadBlob(result.data, result.filename)
}
