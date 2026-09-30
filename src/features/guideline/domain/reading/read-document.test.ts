import { expect, it } from 'vitest'
import type { ApplicationImage, BrandColor } from '@/payload-types'
import type { CmsCard, CmsSection } from '../../sections/model'
import type { PaletteCatalog } from '../contract/palette'
import { formatGuidelineReadDocument } from './format-document'
import { type GuidelineSourceDocument, toGuidelineReadDocument } from './read-document'

const image = {
	relationTo: 'application-images' as const,
	value: {
		id: 1,
		name: '도판',
		alt: '실제 도판',
		filename: 'image.png',
		url: '/api/application-images/file/image.png',
		width: 1200,
		height: 900,
	} as ApplicationImage,
}
const color = { id: 1, name: 'Green', hex: '008855', _status: 'published' } as BrandColor
const catalog: PaletteCatalog = {
	primary: { id: 'p', name: 'Primary', colors: [{ id: '1', label: 'Green', value: '#008855' }] },
}
const card = (display: CmsCard['display'], rest: Partial<CmsCard> = {}): CmsCard => ({
	ratio: '4:3',
	display,
	download: { source: 'none' },
	caption: { type: 'basic' },
	...rest,
})
const section = (cards: CmsCard[], rest: Partial<CmsSection> = {}): CmsSection => ({
	id: 'main',
	type: 'section',
	title: 'Main',
	download: { source: 'none' },
	containers: [{ type: 'grid', cards }],
	...rest,
})
const source = (sections: CmsSection[]): GuidelineSourceDocument => ({
	id: 1,
	title: 'Guide',
	slug: 'guide',
	contentModel: 'sections',
	sections,
})

it('위계·배치·명세·자기 섹션 다운로드를 해석하며 원본과 비활성 값을 분리한다', () => {
	const raw = source([
		section(
			[
				card(
					{ type: 'image', image, fit: 'cover', scale: 30, color },
					{
						id: 'a',
						caption: {
							type: 'basic',
							title: 'Basic',
							rows: [{ label: 'HIDDEN', value: 'HIDDEN' }],
						},
					},
				),
			],
			{ download: { source: 'assets' } },
		),
		section(
			[
				card(
					{ type: 'image', image },
					{
						id: 'b',
						caption: {
							type: 'specification',
							rows: [
								{ label: '두께', value: '1px' },
								{ label: '빈 값', value: '' },
							],
						},
					},
				),
			],
			{ id: 'sub', type: 'subsection' },
		),
		section(
			[card({ type: 'type-weight' }), card({ type: 'type-weight' }, { status: 'none' })],
			{ id: 'incorrect', type: 'incorrect-usages' },
		),
	])
	raw.blocks = [{ blockType: 'section', title: 'INACTIVE' } as never]
	const before = structuredClone(raw)
	const read = toGuidelineReadDocument(raw)
	if (read.contentModel !== 'sections') throw new Error('Expected sections')
	expect(
		read.sections.map(({ id, headingLevel, parentSectionId }) => [
			id,
			headingLevel,
			parentSectionId,
		]),
	).toEqual([
		['main', 2, null],
		['sub', 3, 'main'],
		['incorrect', 2, null],
	])
	const first = read.sections[0].contentGroups[0]
	expect(first.layout).toEqual({ type: 'grid', columns: 3, size: 'md' })
	expect(first.figures[0].visual).toEqual({
		type: 'image',
		image: { url: image.value.url, filename: 'image.png', alt: '실제 도판' },
		alt: '실제 도판',
		fit: 'cover',
	})
	expect(read.sections[0].actions).toMatchObject([
		{ kind: 'download', files: [{ filename: 'image.png' }] },
	])
	expect(
		read.sections[0].actions[0].kind === 'download' && read.sections[0].actions[0].files,
	).toHaveLength(1)
	expect(read.sections[1].contentGroups[0].figures[0].caption).toEqual({
		type: 'specification',
		title: null,
		description: null,
		rows: [
			{ label: '두께', value: '1px' },
			{ label: '빈 값', value: '' },
		],
	})
	expect(read.sections[2].contentGroups[0].figures.map((figure) => figure.usageStatus)).toEqual([
		'prohibited',
		'none',
	])
	expect(JSON.stringify(read)).not.toMatch(/HIDDEN|INACTIVE|containers|endActions/)
	expect(formatGuidelineReadDocument(read)).toContain(
		'Specification (명세):\n- 두께: 1px\n- 빈 값: ',
	)
	expect(raw).toEqual(before)
})

it('8종 도판에서 실제 지원하는 조작·동작과 기본값만 기술한다', () => {
	const read = toGuidelineReadDocument(
		source([
			section([
				card({ type: 'image', image }),
				card({ type: 'guide', image, guide: image }),
				card({ type: 'layout-grid' }),
				card({ type: 'layout-overlay', images: [image.value] }),
				card({
					type: 'type-weight',
					languages: [{ language: 'en' }, { language: 'ko' }],
					weight: 'bold',
				}),
				card({ type: 'palette', palette: 'primary' }),
				card({ type: 'swatch', color }),
				card({
					type: 'logo-background',
					palette: 'primary',
					logos: { black: image, white: image },
					opacity: 0,
				}),
				card({ type: 'type-weight', adjustable: false }),
				card({
					type: 'palette',
					variant: 'logo-backgrounds',
					palette: 'primary',
					logos: { default: image },
					paletteLayout: 'ranked',
				}),
			]),
		]),
		catalog,
	)
	if (read.contentModel !== 'sections') throw new Error('Expected sections')
	const figures = read.sections[0].contentGroups[0].figures
	expect(figures[0].controls).toEqual([])
	for (const figure of figures.slice(1, 4))
		expect(figure.controls[0]).toMatchObject({
			kind: 'toggle',
			defaultValue: 'off',
			options: [
				{ label: 'Off', value: 'off' },
				{ label: 'On', value: 'on' },
			],
		})
	expect(figures[4].controls[0]).toMatchObject({
		target: 'visual.weight',
		defaultValue: 'bold',
		options: [{ value: 'light' }, { value: 'medium' }, { value: 'bold' }],
	})
	expect(figures[5].actions).toEqual([
		{ kind: 'copy', label: 'Green 색상값 복사', value: '#008855' },
		{ kind: 'copy', label: '팔레트 전체 복사', value: 'Primary\nGreen: #008855' },
	])
	expect(figures[6].actions).toEqual([
		{ kind: 'copy', label: 'Green 색상값 복사', value: '#008855' },
	])
	expect(figures[7].controls[0]).toMatchObject({ kind: 'color', defaultValue: '#008855' })
	expect(figures[7].actions[0]).toMatchObject({ kind: 'reset', value: '#008855' })
	expect(figures[7].visual).toMatchObject({ opacity: 0 })
	expect(figures[8].controls).toEqual([])
	expect(figures[9].actions).toEqual([])
	expect(figures[9].visual).not.toHaveProperty('layout')
	const text = formatGuidelineReadDocument(read)
	for (const figure of figures) expect(text).toContain(JSON.stringify(figure.visual))
	expect(text).toContain('"defaultValue":"bold"')
	expect(JSON.parse(JSON.stringify(read))).toEqual(read)
})

it('읽을 수 없는 관계는 링크·프리셋을 추측하지 않으며 잘못된 실행 입력을 제외한다', () => {
	const read = toGuidelineReadDocument(
		source([
			section([
				card(
					{ type: 'guide', image: { ...image, value: 1 }, guide: image },
					{
						download: { source: 'assets' },
						endActions: [
							{ type: 'link', label: 'Bad', href: 'javascript:alert(1)' },
							{ type: 'copy', label: 'Empty', value: ' ' },
							{ type: 'link', label: 'Studio', href: '/studio/graph' },
						],
					},
				),
				card({ type: 'palette', palette: 'brand' }),
				card({ type: 'logo-background', logos: { black: image, white: image } }),
			]),
		]),
		catalog,
	)
	if (read.contentModel !== 'sections') throw new Error('Expected sections')
	const figures = read.sections[0].contentGroups[0].figures
	expect(figures[0].visual).toMatchObject({ image: null })
	expect(figures[0].controls).toEqual([])
	expect(figures[0].actions).toHaveLength(2)
	expect(figures[0].actions[1]).toEqual({ kind: 'link', label: 'Studio', href: '/studio/graph' })
	for (const figure of figures.slice(1)) {
		expect(figure.visual).toMatchObject({ palette: null })
		expect(figure.controls).toEqual([])
		expect(figure.actions).toEqual([])
	}
})

it('빈 신규 본문은 레거시로 되돌리지 않고 레거시는 기존 필드와 해석된 평문을 유지한다', () => {
	const raw = {
		...source([]),
		blocks: [
			{
				blockType: 'section' as const,
				title: 'Legacy',
				anchor: 'legacy',
				layout: 'grid' as const,
			},
		],
	}
	expect(toGuidelineReadDocument(raw)).toMatchObject({ contentModel: 'sections', sections: [] })
	expect(toGuidelineReadDocument(raw)).not.toHaveProperty('blocks')
	const legacy = toGuidelineReadDocument({ ...raw, contentModel: 'legacy' })
	expect(legacy).not.toHaveProperty('sections')
	expect(legacy).toMatchObject({
		blocks: [{ blockType: 'section', title: 'Legacy', text: 'Legacy\nlegacy' }],
	})
})
