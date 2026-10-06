import { afterEach, describe, expect, it, vi } from 'vitest'
import { findFigmaImageUrls, findFigmaNodeTree } from './figma.rest.repository'

describe('findFigmaImageUrls', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('SVG는 원본 노드 전체 크기를 유지해 렌더링한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ images: { '1:2': 'https://figma.example/logo.svg' } }),
		})
		vi.stubGlobal('fetch', fetchMock)

		await findFigmaImageUrls('user-token', 'file', ['1:2'], 'svg')

		expect(fetchMock.mock.calls[0]?.[0]).toContain('format=svg&use_absolute_bounds=true')
		expect(fetchMock.mock.calls[0]?.[1]).toEqual({ headers: { 'X-Figma-Token': 'user-token' } })
	})
})

describe('findFigmaNodeTree', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('429 응답의 재시도·플랜·좌석 정보를 보존한다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				headers: new Headers({
					'Retry-After': '54',
					'X-Figma-Plan-Tier': 'starter',
					'X-Figma-Rate-Limit-Type': 'low',
				}),
				ok: false,
				status: 429,
			}),
		)

		await expect(findFigmaNodeTree('token', 'file', '1:2')).rejects.toEqual(
			expect.objectContaining({
				name: 'FigmaApiError',
				planTier: 'starter',
				rateLimitType: 'low',
				retryAfter: 54,
				stage: 'nodes',
				status: 429,
			}),
		)
	})

	it('Retry-After가 없는 오류에 0초 대기시간을 만들지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ headers: new Headers(), ok: false, status: 500 }),
		)

		await expect(findFigmaNodeTree('token', 'file', '1:2')).rejects.toEqual(
			expect.objectContaining({ retryAfter: undefined, status: 500 }),
		)
	})

	it('정밀 transform용 geometry path를 함께 요청한다', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ nodes: { '1:2': { document: { id: '1:2', type: 'FRAME' } } } }),
		})
		vi.stubGlobal('fetch', fetchMock)

		await findFigmaNodeTree('token', 'file', '1:2')

		expect(fetchMock.mock.calls[0]?.[0]).toContain('ids=1%3A2&geometry=paths')
	})
})
