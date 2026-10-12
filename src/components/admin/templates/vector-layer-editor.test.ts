import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { VectorLayerEditor } from './vector-layer-editor'

const logos = [
	{ id: 14, url: '/default.svg', ciShape: 'hd-horizontal', ciVariant: 'default' },
	{ id: 15, url: '/mono.svg', ciShape: 'hd-horizontal', ciVariant: 'mono-black' },
	{ id: 35, url: '/mono-white.svg', ciShape: 'hd-horizontal', ciVariant: 'mono-white' },
	// 다른 모양은 선택지에 끼지 않는다.
	{ id: 33, url: '/symbol.svg', ciShape: 'symbol', ciVariant: 'default' },
]

describe('VectorLayerEditor', () => {
	it('같은 CI 모양의 색 버전만 고르게 하고, 고르면 그 로고 파일을 끼운다', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() =>
				Promise.resolve({ ok: true, json: () => Promise.resolve({ docs: logos }) }),
			),
		)
		const onChange = vi.fn()

		render(createElement(VectorLayerEditor, { logoId: 15, onChange }))

		await waitFor(() => expect(screen.getByRole('radio', { name: '단색(블랙)' })).toBeTruthy())
		expect(
			screen
				.getAllByRole('radio')
				.map((radio) => radio.getAttribute('aria-label') ?? radio.textContent),
		).toEqual(['기본형', '단색(블랙)', '단색(화이트)'])
		fireEvent.click(screen.getByRole('radio', { name: '단색(화이트)' }))

		expect(onChange).toHaveBeenCalledWith({
			vectorAsset: { collection: 'brand-logos', id: 35, src: '/mono-white.svg' },
		})
	})
})
