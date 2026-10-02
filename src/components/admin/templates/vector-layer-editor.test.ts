import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VectorLayerEditor } from './vector-layer-editor'

const responses = {
	'brand-logos': [{ id: 7, name: 'Wordmark', alt: 'Wordmark', url: '/logo.svg' }],
	'application-images': [],
	// 색 선택지는 발행된 컬러 그룹을 거쳐 온다.
	'brand-color-groups': [
		{
			colors: [
				{ id: 3, name: 'Primary', hex: '#112233', _status: 'published' },
				{
					id: 4,
					name: 'Unsafe',
					hex: 'url(https://example.com/pixel)',
					_status: 'published',
				},
			],
		},
	],
}

describe('VectorLayerEditor', () => {
	it('인가 자산·맞춤 방식·브랜드 컬러 변경을 전달한다', async () => {
		const fetchMock = vi.fn((url: string) => {
			const collection = Object.keys(responses).find((key) => url.includes(`/api/${key}?`))
			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve({ docs: responses[collection as keyof typeof responses] }),
			})
		})
		vi.stubGlobal('fetch', fetchMock)
		HTMLElement.prototype.scrollIntoView = vi.fn()
		const onChange = vi.fn()

		render(createElement(VectorLayerEditor, { config: {}, onChange }))

		const assetSelect = screen.getByRole('combobox', { name: '사용할 그래픽' })
		fireEvent.click(assetSelect)
		await waitFor(() =>
			expect(screen.getByRole('option', { name: '로고 — Wordmark' })).toBeTruthy(),
		)
		fireEvent.click(screen.getByRole('option', { name: '로고 — Wordmark' }))
		fireEvent.click(screen.getByRole('radio', { name: 'Contain' }))
		fireEvent.click(screen.getByRole('radio', { name: '#112233' }))

		expect(screen.queryByRole('radio', { name: /url\(/ })).toBeNull()
		expect(fetchMock).toHaveBeenCalledTimes(3)
		expect(onChange).toHaveBeenNthCalledWith(1, {
			vectorAsset: { collection: 'brand-logos', id: 7, src: '/logo.svg' },
		})
		expect(onChange).toHaveBeenNthCalledWith(2, { vectorFit: 'contain' })
		expect(onChange).toHaveBeenNthCalledWith(3, { vectorColor: '#112233' })
	})
})
