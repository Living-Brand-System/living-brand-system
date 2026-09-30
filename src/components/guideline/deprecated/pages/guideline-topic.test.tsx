import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { GuidelineTopic } from './guideline-topic'

afterEach(cleanup)

it('대표 제목, 섹션, 빈 푸터 순서와 CMS 앵커를 유지한다', () => {
	const { container } = render(
		<GuidelineTopic
			topic={{
				title: 'Typography',
				headerImage: null,
				blocks: [
					{
						blockType: 'section',
						id: 's1',
						title: '언어별 표본',
						anchor: 'language',
						layout: 'grid',
						columns: '3',
						cards: [
							{
								id: 'c1',
								display: [
									{
										blockType: 'staticDisplay',
										image: { id: 1, url: '/sample.png' },
									},
								],
							},
						],
					},
				] as never,
			}}
		/>,
	)
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Typography')
	expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('언어별 표본')
	const section = container.querySelector('#language')
	if (!section) throw new Error('섹션 누락')
	expect(section.querySelector('[data-slot="section-headings"]')).not.toBeNull()
	expect(section.querySelector('[data-slot="grid-container"]')).toHaveStyle({
		'--grid-columns': '3',
	})
	const footer = container.querySelector('[data-slot="guideline-footer"]')
	if (!footer) throw new Error('푸터 누락')
	expect(footer).toBeEmptyDOMElement()
	expect(section.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	expect(container.querySelectorAll('figure')).toHaveLength(1)
})

it('콘텐츠 없는 페이지도 빈 섹션을 만들지 않고 푸터 자리를 유지한다', () => {
	const { container } = render(
		<GuidelineTopic topic={{ title: 'Empty', headerImage: null, blocks: [] }} />,
	)
	expect(container.querySelector('[data-slot="guideline-sections"]')).toBeNull()
	expect(container.querySelector('[data-slot="guideline-footer"]')).toBeEmptyDOMElement()
})

it('신규 본문을 비워도 기존 블록이 다시 나타나지 않는다', () => {
	const { container } = render(
		<GuidelineTopic
			topic={{
				title: 'New document',
				headerImage: null,
				contentModel: 'sections',
				sections: [],
				blocks: [
					{
						blockType: 'section',
						title: 'Legacy content',
						anchor: 'legacy',
						layout: 'grid',
						rowHeight: 'medium',
						cards: [],
					},
				],
			}}
		/>,
	)
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('New document')
	expect(screen.queryByText('Legacy content')).not.toBeInTheDocument()
	expect(container.querySelector('[data-slot="guideline-footer"]')).toBeNull()
	expect(container.querySelector('[data-slot="guideline-display-footer"] img')).toHaveAttribute(
		'alt',
		'HD현대',
	)
})
