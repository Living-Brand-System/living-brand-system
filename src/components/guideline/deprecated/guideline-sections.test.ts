import { render } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { GuidelineDocument } from '@/payload-types'
import { GuidelineSections } from './guideline-sections'

const card = {
	id: 'card-1',
	ratio: '16:9' as const,
	display: [{ id: 'd1', blockType: 'staticDisplay' as const, image: { id: 1, url: '/a.png' } }],
}
const section = (extra: object): NonNullable<GuidelineDocument['blocks']>[number] =>
	({
		blockType: 'section',
		id: 'section-1',
		layout: 'grid',
		rowHeight: 'medium',
		cards: [card],
		...extra,
	}) as never

describe('GuidelineSections', () => {
	it('Better Editor preview에서만 블록 선택 ID를 노출한다', () => {
		const blocks = [section({ title: 'Color', anchor: 'color' })]
		const { container, rerender } = render(createElement(GuidelineSections, { blocks }))

		expect(container.querySelector('[data-better-editor-id]')).toBeNull()
		expect(container.querySelector('section')?.id).toBe('color')

		rerender(createElement(GuidelineSections, { blocks, betterEditor: true }))

		expect(container.querySelector('[data-better-editor-id]')).toHaveAttribute(
			'data-better-editor-id',
			'section-1',
		)
	})

	it('제목 없는 섹션은 헤딩과 앵커를 만들지 않는다', () => {
		const { container } = render(
			createElement(GuidelineSections, { blocks: [section({ id: 'hero', anchor: 'hero' })] }),
		)

		expect(container.querySelector('h2')).toBeNull()
		expect(container.querySelector('section')?.id).toBe('')
	})
})
