import { existsSync } from 'node:fs'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ColorReference } from './color'
import { IconographyReference } from './iconography'

const downloadSectionAssets = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('@/features/guideline/services/download-section-assets.client', () => ({
	downloadSectionAssets,
}))
afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

it('선형·채움형 아이콘 각 10개와 제작 도판의 실제 파일을 연결한다', () => {
	const { container } = render(<IconographyReference />)
	expect(screen.getAllByRole('img', { name: /Type 아이콘$/ })).toHaveLength(20)
	for (const image of container.querySelectorAll('img')) {
		const src = image.getAttribute('src') ?? ''
		const path = src.startsWith('/_next/image')
			? new URL(src, 'http://localhost').searchParams.get('url')
			: src
		expect(existsSync(`public${path}`), `${path} 에셋이 있어야 합니다`).toBe(true)
	}
})

it('세 색상군에서 Brand를 조합하고 빈 카탈로그에 가짜 색상을 만들지 않는다', () => {
	const color = {
		id: 'green',
		label: 'Green',
		value: '#007332',
		logoUsage: { fullColor: false, whiteWordmark: true, mono: 'white' as const },
	}
	const { rerender } = render(
		<ColorReference
			catalog={{
				primary: { id: 'p', name: 'Primary', colors: [color] },
				supportive: {
					id: 's',
					name: 'Supportive',
					colors: [{ ...color, id: 'light', label: 'Light', value: '#dcf5d2' }],
				},
				monotone: {
					id: 'm',
					name: 'Monotone',
					colors: [{ ...color, id: 'black', label: 'Black', value: '#000000' }],
				},
			}}
		/>,
	)
	for (const name of [
		'Primary Palette',
		'Supportive Palette',
		'Monotone Palette',
		'Brand Palette',
	])
		expect(screen.getByRole('heading', { name, level: 2 })).toBeInTheDocument()
	rerender(<ColorReference catalog={{}} />)
	expect(screen.getByText('등록된 색상 그룹이 없습니다.')).toBeInTheDocument()
	expect(screen.queryByRole('heading', { name: 'Brand Palette', level: 2 })).toBeNull()
})

it('개별 SVG와 자기 레벨의 ZIP만 다운로드한다', async () => {
	const { container } = render(<IconographyReference />)
	const links = container.querySelectorAll('a[download]')
	expect(links).toHaveLength(23)
	for (const link of links) expect(existsSync(`public${link.getAttribute('href')}`)).toBe(true)
	expect(screen.getAllByRole('button', { name: /에셋 전체 다운로드$/ })).toHaveLength(2)
	for (const title of ['Overview', 'Line Type', 'Solid Type']) {
		expect(screen.queryByRole('button', { name: `${title} 에셋 전체 다운로드` })).toBeNull()
	}
	const section = container.querySelector('#outlined-icons') as HTMLElement
	fireEvent.click(within(section).getByRole('button', { name: 'Icons 에셋 전체 다운로드' }))
	await waitFor(() => expect(downloadSectionAssets).toHaveBeenCalledTimes(1))
	const zip = downloadSectionAssets.mock.calls[0][0]
	expect(zip.filename).toBe('hd-iconography-outlined.zip')
	expect(zip.assets).toHaveLength(10)
	for (const item of zip.assets) expect(item.url).toContain('/outlined/')
})
