import { afterEach, describe, expect, it, vi } from 'vitest'
import { readDroppedImageFile } from './read-dropped-image.client'

function transfer({ files = [] as File[], data = {} as Record<string, string> }): DataTransfer {
	return {
		files: files as unknown as FileList,
		types: [...(files.length ? ['Files'] : []), ...Object.keys(data)],
		getData: (type: string) => data[type] ?? '',
	} as unknown as DataTransfer
}

afterEach(() => vi.unstubAllGlobals())

function stubFetch(blob: Blob) {
	const fetchMock = vi.fn(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(blob) }))
	vi.stubGlobal('fetch', fetchMock)
	return fetchMock
}

describe('readDroppedImageFile', () => {
	it('바탕화면 파일은 그대로 쓴다 — 받아 오지 않는다', async () => {
		const fetchMock = stubFetch(new Blob())
		const dropped = new File(['x'], 'ref.png', { type: 'image/png' })

		await expect(readDroppedImageFile(transfer({ files: [dropped] }))).resolves.toBe(dropped)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('앱 안의 이미지는 주소로 오므로 받아 와서 File로 만든다', async () => {
		stubFetch(new Blob(['x'], { type: 'image/png' }))

		const file = await readDroppedImageFile(
			transfer({ data: { 'text/uri-list': 'http://localhost:3000/api/x/file/sub.png' } }),
		)

		expect(file?.name).toBe('sub.png')
		expect(file?.type).toBe('image/png')
	})

	/**
	 * 🔴 드롭에 실린 주소는 사용자가 아니라 끌어온 페이지가 정한다 — 남의 출처를 그대로 받아 오면
	 *    사용자의 브라우저가 우리가 모르는 곳을 대신 호출하게 된다.
	 */
	it('다른 출처 주소는 받아 오지 않는다', async () => {
		const fetchMock = stubFetch(new Blob())

		await expect(
			readDroppedImageFile(
				transfer({ data: { 'text/uri-list': 'https://evil.test/a.png' } }),
			),
		).resolves.toBeNull()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('uri-list의 주석 줄을 건너뛴다', async () => {
		stubFetch(new Blob(['x'], { type: 'image/webp' }))

		const file = await readDroppedImageFile(
			transfer({ data: { 'text/uri-list': '# comment\nhttp://localhost:3000/a/b.webp' } }),
		)

		expect(file?.name).toBe('b.webp')
	})

	it('받아 오지 못하면 아무것도 첨부하지 않는다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.reject(new Error('offline'))),
		)

		await expect(
			readDroppedImageFile(transfer({ data: { 'text/plain': '/api/x/file/sub.png' } })),
		).resolves.toBeNull()
	})
})
