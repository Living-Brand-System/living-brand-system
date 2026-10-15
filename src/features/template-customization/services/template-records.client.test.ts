import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	discardTemplateDraft,
	patchTemplate,
	publishTemplateDraft,
	setManagerDraft,
} from './template-records.client'

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

afterEach(() => {
	setManagerDraft(1, false)
	vi.unstubAllGlobals()
})

describe('Manager mode 초안', () => {
	it('모드가 켜진 템플릿의 쓰기는 게시본을 두고 초안으로만 쌓는다', async () => {
		const fetch = vi.fn(async () => ok({ doc: { id: 1, _status: 'draft' } }))
		vi.stubGlobal('fetch', fetch)
		setManagerDraft(1, true)

		await patchTemplate(1, { name: '새 이름' }, '실패')

		// 상태를 따로 읽지 않고 곧장 초안으로 쓴다.
		expect(fetch).toHaveBeenCalledTimes(1)
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
		expect(url).toBe('/api/templates/1?depth=0&draft=true')
		expect(JSON.parse(String(init.body))).toEqual({ name: '새 이름', _status: 'draft' })
	})

	it('저장은 상태만 보내 최신 초안을 게시하고, 버리기는 게시본을 그대로 다시 게시한다', async () => {
		const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
			init?.method === 'PATCH'
				? ok({ doc: { id: 1, _status: 'published' } })
				: ok({
						id: 1,
						createdAt: 'c',
						updatedAt: 'u',
						name: '게시본',
						_status: 'published',
					}),
		)
		vi.stubGlobal('fetch', fetch)

		await publishTemplateDraft(1)
		expect(fetch.mock.calls[0]?.[0]).toBe('/api/templates/1?depth=0')
		expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual({ _status: 'published' })

		await discardTemplateDraft(1)
		expect(fetch.mock.calls[1]?.[0]).toBe('/api/templates/1?depth=0')
		expect(JSON.parse(String(fetch.mock.calls[2]?.[1]?.body))).toEqual({
			name: '게시본',
			_status: 'published',
		})
	})
})
