// @vitest-environment node
import { unzipSync } from 'fflate'
import { afterEach, expect, it, vi } from 'vitest'
import { downloadBlob } from '@/lib/object-url'
import { downloadSectionAssets } from './download-section-assets.client'

vi.mock('@/lib/object-url', () => ({ downloadBlob: vi.fn() }))
afterEach(() => {
	vi.unstubAllGlobals()
	vi.clearAllMocks()
})
it('명시한 파일만 ZIP에 넣고 하나라도 실패하면 다운로드하지 않는다', async () => {
	const fetchMock = vi.fn().mockResolvedValue(new Response('logo'))
	vi.stubGlobal('fetch', fetchMock)
	await downloadSectionAssets({
		filename: 'section.zip',
		assets: [{ url: '/logo.svg', filename: 'logo.svg' }],
	})
	const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0]
	expect(filename).toBe('section.zip')
	expect(Object.keys(unzipSync(new Uint8Array(await blob.arrayBuffer())))).toEqual(['logo.svg'])
	expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/logo.svg')
	vi.mocked(downloadBlob).mockClear()
	fetchMock.mockResolvedValue(new Response('', { status: 404 }))
	await expect(
		downloadSectionAssets({
			filename: 'section.zip',
			assets: [{ url: '/missing', filename: 'missing.svg' }],
		}),
	).rejects.toThrow()
	expect(downloadBlob).not.toHaveBeenCalled()
})
