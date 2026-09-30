import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLazyResource } from './use-lazy-resource'

describe('useLazyResource', () => {
	it('여러 번 불러도 한 번만 가져온다', async () => {
		const fetcher = vi.fn(async () => ['a'])
		const { result } = renderHook(() => useLazyResource(fetcher))

		act(() => {
			result.current.load()
			result.current.load()
		})
		await waitFor(() => expect(result.current.status).toBe('ready'))

		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(result.current.data).toEqual(['a'])
	})

	it('reload는 가져온 뒤 서버가 바뀌었을 때 다시 가져온다', async () => {
		const fetcher = vi.fn(async () => ['old'])
		const { result } = renderHook(() => useLazyResource(fetcher))

		act(() => result.current.load())
		await waitFor(() => expect(result.current.data).toEqual(['old']))

		fetcher.mockResolvedValue(['new'])
		act(() => result.current.reload())
		await waitFor(() => expect(result.current.data).toEqual(['new']))

		expect(fetcher).toHaveBeenCalledTimes(2)
	})

	it('아직 가져온 적 없으면 reload는 아무것도 하지 않는다', () => {
		// 열지도 않은 자산 브라우저를 미리 채우지 않는다 — load가 여는 시점을 소유한다.
		const fetcher = vi.fn(async () => ['a'])
		const { result } = renderHook(() => useLazyResource(fetcher))

		act(() => result.current.reload())

		expect(fetcher).not.toHaveBeenCalled()
		expect(result.current.status).toBe('idle')
	})

	it('실패한 뒤에는 다시 시도할 수 있다', async () => {
		const fetcher = vi.fn(async () => {
			throw new Error('boom')
		})
		const { result } = renderHook(() => useLazyResource(fetcher))

		act(() => result.current.load())
		await waitFor(() => expect(result.current.status).toBe('error'))

		fetcher.mockResolvedValue(['ok'] as never)
		act(() => result.current.load())
		await waitFor(() => expect(result.current.data).toEqual(['ok']))
	})
})
