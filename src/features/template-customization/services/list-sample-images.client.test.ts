import { describe, expect, it, vi } from 'vitest'
import { fetchSampleImages } from './list-sample-images.client'

function respondWith(docs: unknown[]) {
	vi.stubGlobal(
		'fetch',
		vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ docs }) })),
	)
}

const doc = (overrides: Record<string, unknown> = {}) => ({
	id: 1,
	name: '잠수함',
	alt: '잠수함',
	url: '/api/sample-images/file/sub.png',
	...overrides,
})

describe('fetchSampleImages', () => {
	it('원본 판형을 카드까지 실어 나른다', async () => {
		respondWith([doc({ width: 1024, height: 768 })])

		const [option] = await fetchSampleImages()

		expect(option).toMatchObject({ width: 1024, height: 768 })
	})

	// 🔴 크기를 못 읽은 업로드는 0이 아니라 null이다 — 0이면 카드가 「0 × 0」을 적는다.
	it('크기를 모르는 문서는 null로 남긴다', async () => {
		respondWith([doc()])

		const [option] = await fetchSampleImages()

		expect(option).toMatchObject({ width: null, height: null })
	})
})
