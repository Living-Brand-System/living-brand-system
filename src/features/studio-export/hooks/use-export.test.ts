// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ExportRequest } from '../export-contract'
import { useExport } from './use-export'

vi.mock('../adapters/download-export-result.client', () => ({
	downloadExportResult: vi.fn(),
}))

describe('useExport', () => {
	it('허용된 action만 한 번에 하나씩 실행하고 실패를 UI 상태로 반환한다', async () => {
		type Request = Extract<ExportRequest, { format: 'png' | 'pdf' }>
		const png = {
			artifact: 'raster',
			format: 'png',
			colorProfile: { space: 'rgb', icc: 'srgb' },
			options: { scale: 1, transparent: true },
		} as const satisfies Request
		const pdf = {
			artifact: 'raster',
			format: 'pdf',
			colorProfile: { space: 'cmyk', icc: 'cgats21-crpc6' },
			options: { bleedMm: 0, ppi: 300, scale: 1 },
		} as const satisfies Request
		const execute = vi.fn().mockRejectedValue(new Error('내보내기 실패'))
		const { result } = renderHook(() =>
			useExport<Request>({
				capability: { formats: ['png', 'pdf'], print: { ppi: [300] } },
				canExport: (request) => request.format === 'png',
				execute,
			}),
		)

		await act(() => Promise.all([result.current.run(png), result.current.run(png)]))
		expect(execute).toHaveBeenCalledOnce()
		expect(result.current.error).toBe('내보내기 실패')
		expect(result.current.exporting).toBeNull()

		expect(result.current.canExport(pdf)).toBe(false)
		await act(() => result.current.run(pdf))
		expect(execute).toHaveBeenCalledOnce()
		// 🔴 지원 밖 요청을 조용히 삼키지 않는다 — 예전에는 오류도 없이 무반응이라
		//    같은 버튼이 스튜디오마다 다르게 동작했다.
		expect(result.current.error).toBe('이 프로파일에서는 PDF 내보내기를 지원하지 않습니다.')
	})
})
