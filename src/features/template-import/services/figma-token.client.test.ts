import { afterEach, expect, test, vi } from 'vitest'
import { requestFigmaTokenRegistration, requestFigmaTokenRemoval } from './figma-token.client'

afterEach(() => vi.unstubAllGlobals())

test('등록은 PUT에 토큰을 싣고, 204면 ok다', async () => {
	const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
	vi.stubGlobal('fetch', fetchMock)

	expect(await requestFigmaTokenRegistration('figd_x')).toEqual({ status: 'ok' })
	const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
	expect(url).toBe('/api/figma-token')
	expect(init.method).toBe('PUT')
	expect(init.body).toBe(JSON.stringify({ token: 'figd_x' }))
})

test('삭제는 본문 없는 DELETE다', async () => {
	const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
	vi.stubGlobal('fetch', fetchMock)

	await requestFigmaTokenRemoval()
	const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
	expect(init.method).toBe('DELETE')
	expect(init.body).toBeUndefined()
})

test('401은 unauthorized, 그 밖의 실패는 서버 문구를 담은 error다', async () => {
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
	expect(await requestFigmaTokenRemoval()).toEqual({ status: 'unauthorized' })

	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue({
			ok: false,
			status: 400,
			json: () => Promise.resolve({ message: '토큰을 입력하세요.' }),
		}),
	)
	expect(await requestFigmaTokenRegistration('')).toEqual({
		status: 'error',
		message: '토큰을 입력하세요.',
	})

	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
	expect(await requestFigmaTokenRemoval()).toEqual({ status: 'error', message: null })
})
