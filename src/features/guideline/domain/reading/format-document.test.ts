import { expect, it } from 'vitest'
import type { BrandIcon } from '@/payload-types'
import type { CmsCard, CmsSection } from '../../sections/model'
import { formatSectionForAgent } from './format-document'
import { toGuidelineReadDocument } from './read-document'

const figure: CmsCard = {
	id: 'ship',
	ratio: '4:3',
	display: { type: 'image', alt: '선박 아이콘' },
	download: { source: 'none' },
	caption: { type: 'basic' },
}

function sectionWith(cards: CmsCard[], type: CmsSection['type'] = 'section') {
	const document = toGuidelineReadDocument({
		id: 1,
		title: 'Test',
		slug: 'test',
		contentModel: 'sections',
		sections: [
			{
				id: 'icons',
				type,
				title: 'Icons',
				download: { source: 'none' },
				containers: [{ type: 'grid', cards }],
			} satisfies CmsSection,
		],
	})
	if (document.contentModel !== 'sections') throw new Error('Expected sections')
	return document.sections[0]
}

it('도판별 기본·목록·명세의 관계를 보존하고 비활성 캡션 행을 제외한다', () => {
	const source = sectionWith([
		{
			...figure,
			caption: {
				type: 'basic',
				title: '기본 도판',
				description: '기본 설명',
				rows: [{ label: '비활성', value: '숨은 값' }],
			},
		},
		{
			...figure,
			id: 'list',
			caption: {
				type: 'list',
				rows: [{ label: '목록 항목', value: '항목 설명' }, { value: '제목 없는 항목' }],
			},
		},
		{
			...figure,
			id: 'spec',
			caption: {
				type: 'specification',
				title: '선박',
				rows: [
					{ label: '선 굵기', value: '1px' },
					{ label: '최소 너비', value: '24px\n인쇄물: 8mm' },
				],
			},
		},
	])
	const before = structuredClone(source)
	const text = formatSectionForAgent(source)
	const figures = text.split(/\n\n(?=Figure )/).slice(1)
	expect(figures).toHaveLength(3)
	expect(figures[0]).toContain('Caption (캡션):\nTitle: 기본 도판\nDescription: 기본 설명')
	expect(figures[0]).not.toContain('숨은 값')
	expect(figures[1]).toContain(
		'List (목록):\n1. Title: 목록 항목\n   Description: 항목 설명\n2. Description: 제목 없는 항목',
	)
	expect(figures[1]).not.toContain('선 굵기')
	expect(figures[2]).toContain(
		'Specification (명세):\n- 선 굵기: 1px\n- 최소 너비: 24px\n  인쇄물: 8mm',
	)
	expect(source).toEqual(before)
})

it('도판의 저작 상태는 Incorrect Usages 기본값과 명시적 재정의를 따른다', () => {
	const text = formatSectionForAgent(
		sectionWith(
			[figure, { ...figure, status: 'none' }, { ...figure, status: 'allowed' }],
			'incorrect-usages',
		),
	)
	expect(text.match(/Usage status \(author-assigned\): \w+/g)).toEqual([
		'Usage status (author-assigned): prohibited',
		'Usage status (author-assigned): none',
		'Usage status (author-assigned): allowed',
	])
})

it('유효한 도판 동작만 라벨·대상과 묶고 빈 설명이나 명세를 만들어내지 않는다', () => {
	const image = {
		relationTo: 'brand-icons' as const,
		value: {
			id: 1,
			name: '선박',
			filename: 'ship.svg',
			url: '/api/brand-icons/file/ship.svg',
		} as BrandIcon,
	}
	const text = formatSectionForAgent(
		sectionWith([
			{
				...figure,
				display: { type: 'image', image },
				download: { source: 'assets' },
				caption: { type: 'specification', rows: [] },
				endActions: [
					{ type: 'link', label: '관련 도구', href: '/studio/graph' },
					{ type: 'copy', label: '규정 복사', value: '첫 줄\n둘째 줄' },
					{ type: 'link', label: '잘못된 링크', href: 'javascript:alert(1)' },
					{ type: 'copy', label: '빈 복사', value: ' ' },
				],
			},
		]),
	)
	expect(text).toContain('"alt":"선박"')
	expect(text).toContain('Actions (동작):\n- Download: ship.svg 다운로드')
	expect(text).toContain('/api/brand-icons/file/ship.svg')
	expect(text).toContain(
		'- Link: 관련 도구\n  URL: /studio/graph\n- Copy: 규정 복사\n  Value: 첫 줄\n  둘째 줄',
	)
	expect(text).not.toMatch(/Specification|Caption|잘못된 링크|빈 복사|undefined/)
})
