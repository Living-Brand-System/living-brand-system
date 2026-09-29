import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePublishedBrandColorValues } from './use-published-brand-color-values'

describe('usePublishedBrandColorValues', () => {
	it('# 없이 저장된 hex도 도메인에 넣는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ docs: [{ hex: '00af41' }, { hex: '#003087' }] }),
				}),
			),
		)
		const { result } = renderHook(() => usePublishedBrandColorValues())

		await waitFor(() => expect(result.current.values).toEqual(['#00af41', '#003087']))
	})

	/**
	 * 🔴 실패는 「제한 없음」이 아니다. 여기서 목록을 비워 두는 것이 호출부가 색 고르기를
	 *    잠그는 근거이므로, 폴백 팔레트를 심으면 정본 밖 색이 조용히 통과한다.
	 */
	it('불러오지 못하면 목록을 비워 두고 실패를 알린다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve({ ok: false })),
		)
		const { result } = renderHook(() => usePublishedBrandColorValues())

		await waitFor(() => expect(result.current.loadError).toBe(true))
		expect(result.current.values).toEqual([])
	})
})
