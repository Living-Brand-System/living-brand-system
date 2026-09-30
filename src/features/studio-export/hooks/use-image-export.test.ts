// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ImageArtifacts } from '@/features/image-generation/runtime/image-artifact.client'
import { exportResultsToZip } from '../adapters/export-results-to-zip.client'
import { executeArtifactExport } from '../services/export-artifact.client'
import { useImageExport } from './use-image-export'

vi.mock('../adapters/download-export-result.client', () => ({
	downloadExportResult: vi.fn(),
}))
vi.mock('../adapters/export-results-to-zip.client', () => ({
	exportResultsToZip: vi.fn().mockResolvedValue({
		data: new Blob(),
		filename: 'hd-images.zip',
		mimeType: 'application/zip',
	}),
}))
vi.mock('../services/export-artifact.client', () => ({
	executeArtifactExport: vi.fn(({ fileName }: { fileName: string }) =>
		Promise.resolve({ data: new Blob(), filename: `${fileName}.png`, mimeType: 'image/png' }),
	),
}))

describe('useImageExport', () => {
	it('all scope를 Artifact별로 실행한 뒤 ZIP delivery로 묶는다', async () => {
		const artifacts = {
			raster: [
				{ kind: 'raster', source: { withSurface: vi.fn() } },
				{ kind: 'raster', source: { withSurface: vi.fn() } },
			],
			original: [],
		} as ImageArtifacts
		const { result } = renderHook(() =>
			useImageExport({
				artifacts,
				capability: { formats: ['png'], original: false, packages: ['zip'] },
				selected: 0,
				size: { width: 1024, height: 1024 },
			}),
		)

		act(() => result.current.all.run())
		await waitFor(() => expect(exportResultsToZip).toHaveBeenCalledOnce())

		expect(executeArtifactExport).toHaveBeenCalledTimes(2)
		expect(exportResultsToZip).toHaveBeenCalledWith({
			format: 'zip',
			filename: 'hd-images.zip',
			items: [
				expect.objectContaining({ filename: 'hd-image-1.png' }),
				expect.objectContaining({ filename: 'hd-image-2.png' }),
			],
		})
	})
	it('생성 이름을 ZIP과 내부 순번에 적용한다', async () => {
		vi.clearAllMocks()
		const artifacts = {
			raster: [
				{ kind: 'raster', source: { withSurface: vi.fn() } },
				{ kind: 'raster', source: { withSurface: vi.fn() } },
			],
			original: [],
		} as ImageArtifacts
		const { result } = renderHook(() =>
			useImageExport({
				artifacts,
				metadata: {
					profileName: '제품컷',
					prompt: '굴착기',
					createdAt: '2026-09-10T03:00:00Z',
				},
				capability: { formats: ['png'], original: false, packages: ['zip'] },
				selected: 0,
				size: { width: 1024, height: 1024 },
			}),
		)

		act(() => result.current.all.run())
		await waitFor(() => expect(exportResultsToZip).toHaveBeenCalledOnce())

		expect(executeArtifactExport).toHaveBeenCalledTimes(2)
		expect(exportResultsToZip).toHaveBeenCalledWith({
			format: 'zip',
			filename: '제품컷-굴착기-20260910-120000.zip',
			items: [
				expect.objectContaining({ filename: '제품컷-굴착기-20260910-120000-01.png' }),
				expect.objectContaining({ filename: '제품컷-굴착기-20260910-120000-02.png' }),
			],
		})
	})
})
