import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { BrandColor, BrandIcon } from '@/payload-types'
import { buildCheckSourceSnapshot } from '../checks/build-check-source-snapshot'
import { buildGuidelineSearchText } from '../utils/guideline-search-text'
import {
	type CmsCard,
	type CmsSection,
	cardFiles,
	isGuidelineActionHref,
	sectionFiles,
} from './model'
import { CmsGuidelineSections } from './render'

const download = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('@/features/guideline/services/download-section-assets.client', () => ({
	downloadSectionAssets: download,
}))
afterEach(() => {
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), undefined] }))
const image = {
	relationTo: 'brand-icons' as const,
	value: { id: 1, name: '컨테이너선', filename: 'ship.svg', url: '/ship.svg' } as BrandIcon,
}
const section = {
	type: 'section',
	title: 'Icons',
	anchor: 'icons',
	download: { source: 'assets' },
	containers: [
		{
			type: 'grid',
			size: 'xs',
			columns: '5',
			cards: [
				{
					id: 'ship',
					ratio: '5:4',
					display: { type: 'image', image, fit: 'contain' },
					download: { source: 'assets' },
					caption: { type: 'basic', title: '컨테이너선' },
				},
			],
		},
	],
} satisfies CmsSection

it('CMS 이미지 관계를 공통 카드와 개별·섹션 다운로드로 연결한다', async () => {
	const { container } = render(<CmsGuidelineSections sections={[section]} />)
	expect(screen.getByRole('heading', { name: 'Icons', level: 2 })).toBeInTheDocument()
	expect(screen.getByRole('img', { name: '컨테이너선' })).toHaveStyle({ transform: 'scale(0.8)' })
	expect(container.querySelector('[data-slot="guideline-card"]')).toHaveStyle({
		'--display-ratio': '5 / 4',
	})
	expect(screen.getByRole('link', { name: 'ship.svg 다운로드' })).toHaveAttribute(
		'download',
		'ship.svg',
	)
	fireEvent.click(screen.getByRole('button', { name: 'Icons 에셋 전체 다운로드' }))
	await waitFor(() =>
		expect(download).toHaveBeenCalledWith({
			filename: 'icons.zip',
			assets: [expect.objectContaining({ url: '/ship.svg' })],
		}),
	)
})

it('본문은 평면 배치를 유지하면서 조회 위계대로 H2/H3와 섹션 이름을 연결한다', () => {
	const { container } = render(
		<CmsGuidelineSections
			sections={[
				{ ...section, id: 'main', containers: [] },
				{
					...section,
					id: 'sub',
					anchor: 'details',
					type: 'subsection',
					title: 'Details',
					containers: [],
				},
				{
					...section,
					id: 'incorrect',
					anchor: 'incorrect',
					type: 'incorrect-usages',
					containers: [],
				},
			]}
		/>,
	)
	expect(
		screen.getAllByRole('heading').map((heading) => [heading.tagName, heading.textContent]),
	).toEqual([
		['H2', 'Icons'],
		['H3', 'Details'],
		['H2', 'Incorrect Usages'],
	])
	expect(screen.getByRole('region', { name: 'Details' })).toHaveAttribute(
		'aria-labelledby',
		'details-heading',
	)
	expect(
		container.querySelectorAll('[data-slot="cms-guideline-sections"] > section'),
	).toHaveLength(3)
})

it('Incorrect Usages는 금지 기본이며 명시적인 없음은 유지한다', () => {
	const card = section.containers[0].cards[0]
	const { rerender } = render(
		<CmsGuidelineSections sections={[{ ...section, type: 'incorrect-usages' }]} />,
	)
	expect(screen.getByRole('heading', { name: 'Incorrect Usages' })).toBeInTheDocument()
	expect(screen.getByRole('img', { name: '금지' })).toBeInTheDocument()
	rerender(
		<CmsGuidelineSections
			sections={[
				{
					...section,
					type: 'incorrect-usages',
					containers: [
						{
							...section.containers[0],
							cards: [
								{
									...card,
									status: 'none',
									display: { ...card.display, fit: 'cover', scale: 30 },
								},
							],
						},
					],
				},
			]}
		/>,
	)
	expect(screen.queryByRole('img', { name: '금지' })).toBeNull()
	expect(screen.getByRole('img', { name: '컨테이너선' })).toHaveStyle({ transform: 'scale(1)' })
})

it('다운로드는 자기 섹션의 중복 없는 파일만 포함하고 미해석 관계는 제외한다', () => {
	const card = section.containers[0].cards[0]
	expect(
		sectionFiles({
			...section,
			containers: [
				{
					...section.containers[0],
					cards: [
						card,
						card,
						{
							...card,
							display: {
								...card.display,
								image: { relationTo: 'brand-icons', value: 99 },
							},
						},
					],
				},
			],
		}),
	).toHaveLength(1)
	expect(sectionFiles({ ...section, download: { source: 'none' } })).toEqual([])
})

it('검색·검수는 선택한 신규 본문과 명세 행을 읽는다', () => {
	const card = section.containers[0].cards[0]
	const spec = {
		...section,
		containers: [
			{
				...section.containers[0],
				cards: [
					{
						...card,
						caption: {
							type: 'specification' as const,
							rows: [{ label: 'Stroke', value: '1px' }],
						},
					},
				],
			},
		],
	}
	const doc = {
		id: 1,
		chapter: 1,
		displayOrder: 0,
		createdAt: '',
		updatedAt: '',
		title: 'Iconography',
		slug: 'icons',
		contentModel: 'sections' as const,
		sections: [spec],
		blocks: [],
		headerImage: null,
	}
	expect(
		buildGuidelineSearchText(doc as Parameters<typeof buildGuidelineSearchText>[0]),
	).toContain('Stroke\n1px')
	expect(buildCheckSourceSnapshot(doc)?.evidence).toMatchObject({
		type: 'document',
		blocks: [{ title: 'Icons', captions: ['Stroke', '1px'] }],
	})
})

it('세 컨테이너가 동적 카드의 Off/On·상태·다운로드와 캡션을 함께 표시한다', () => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	const guide: CmsCard = {
		ratio: '4:3',
		selectionLabel: '가이드',
		backgroundColor: { id: 1, name: '배경', hex: '#DDF8CD' } as BrandColor,
		foregroundColor: { id: 2, name: '전경', hex: '#007332' } as BrandColor,
		endActions: [
			{ type: 'link', label: '그래프 도구', href: '/studio/graph' },
			{ type: 'copy', label: '규정 복사', value: '안전 공간을 확보합니다.' },
			{ type: 'link', label: '잘못된 링크', href: 'javascript:alert(1)' },
		],
		display: { type: 'guide', image, guide: image },
		status: 'allowed',
		download: { source: 'assets' },
		caption: { type: 'basic', title: '안전 공간' },
	}
	const { container, rerender } = render(
		<CmsGuidelineSections
			sections={[{ ...section, containers: [{ type: 'grid', cards: [guide] }] }]}
		/>,
	)
	for (const type of ['grid', 'carousel', 'sticky'] as const) {
		rerender(
			<CmsGuidelineSections
				sections={[{ ...section, containers: [{ type, cards: [guide] }] }]}
			/>,
		)
		expect(
			container.querySelector(`[data-slot="guideline-${type}-container"]`),
		).toBeInTheDocument()
		expect(container.querySelector('[data-slot="guideline-card"]')).toHaveStyle({
			'--guideline-card-background': '#DDF8CD',
			'--guideline-card-foreground': '#007332',
		})
		expect(screen.getByRole('link', { name: '그래프 도구' })).toHaveAttribute(
			'href',
			'/studio/graph',
		)
		expect(screen.getByRole('button', { name: '규정 복사' })).toBeInTheDocument()
		expect(screen.queryByRole('link', { name: '잘못된 링크' })).toBeNull()
		if (type === 'sticky')
			expect(container.querySelector('[data-mode="switch"]')).toBeInTheDocument()
		expect(screen.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
		expect(screen.getByRole('img', { name: '허용' })).toBeInTheDocument()
		expect(screen.getAllByRole('link', { name: 'ship.svg 다운로드' })).toHaveLength(1)
		fireEvent.click(screen.getByRole('radio', { name: 'On' }))
		expect(container.querySelector('[data-slot="clearspace-overlay"]')).toBeInTheDocument()
	}

	const staleImage: CmsCard = {
		ratio: '4:3',
		display: { type: 'type-weight', image },
		download: { source: 'assets' },
		caption: { type: 'basic' },
	}
	expect(cardFiles(staleImage)).toEqual([])
})

it('이름 탐색·서체 언어/굵기·팔레트 액션과 셀 고유 비율을 연결한다', () => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	const catalog = {
		primary: {
			id: 'primary',
			name: 'Primary',
			colors: [
				{
					id: 'green',
					label: 'Green',
					value: '#007A3E',
					logoUsage: { fullColor: true, whiteWordmark: true, mono: 'white' as const },
				},
			],
		},
	}
	const weight: CmsCard = {
		ratio: '2:3',
		download: { source: 'none' },
		caption: { type: 'basic' },
		selectionLabel: 'Weight',
		display: {
			type: 'type-weight',
			weight: 'bold',
			languages: [{ language: 'ko' }, { language: 'en' }],
		},
	}
	const { container, rerender } = render(
		<CmsGuidelineSections
			sections={[
				{
					...section,
					containers: [{ type: 'carousel', navigation: 'labels', cards: [weight] }],
				},
			]}
		/>,
	)
	expect(screen.getByRole('radio', { name: 'Weight' })).toBeInTheDocument()
	expect(screen.getByRole('radio', { name: 'Bold' })).toHaveAttribute('aria-checked', 'true')
	expect(container.querySelectorAll('[data-slot="type-weight-specimen"]')).toHaveLength(2)
	const palette: CmsCard = {
		ratio: '4:3',
		display: { type: 'palette', palette: 'primary' },
		download: { source: 'registered', files: [image] },
		caption: { type: 'basic' },
	}
	rerender(
		<CmsGuidelineSections
			paletteCatalog={catalog}
			sections={[{ ...section, containers: [{ type: 'grid', cards: [palette] }] }]}
		/>,
	)
	expect(screen.getByRole('button', { name: '팔레트 전체 복사' })).toBeInTheDocument()
	expect(screen.getByRole('link', { name: 'ship.svg 다운로드' })).toBeInTheDocument()
	expect(container.querySelectorAll('[data-slot="guideline-card-actions"]')).toHaveLength(1)
	palette.display.variant = 'logo-backgrounds'
	rerender(
		<CmsGuidelineSections
			paletteCatalog={catalog}
			sections={[{ ...section, containers: [{ type: 'carousel', cards: [palette] }] }]}
		/>,
	)
	expect(container.querySelector('[data-slot="guideline-card"]')).toHaveStyle({
		'--display-ratio': String(48 / 9),
	})
})

it('CMS 링크는 내부 경로·앵커·HTTP(S)만 허용한다', () => {
	for (const href of [
		'/studio/graph',
		'#icons',
		'https://example.com/guide?q=1',
		'http://localhost:3102/',
	]) {
		expect(isGuidelineActionHref(href), href).toBe(true)
	}
	for (const href of [
		'',
		'#',
		'//example.com',
		'/\\example.com',
		'javascript:alert(1)',
		'data:text/html,test',
		'https://',
		'https://user:pass@example.com',
		' https://example.com',
		'/\u0000/evil',
		'/\n/evil',
	]) {
		expect(isGuidelineActionHref(href), href).toBe(false)
	}
})
