import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { GuidelineCardCaption } from './caption'

it('캡션 형태를 바꿔도 제목·목록·명세는 하나의 figcaption 안에 유지된다', () => {
	const { container, rerender } = render(<GuidelineCardCaption title="제목" />)
	expect(container.querySelectorAll('figcaption')).toHaveLength(1)
	rerender(<GuidelineCardCaption type="list" title="목록" items={[{ description: '첫 지침' }]} />)
	expect(screen.getByRole('list')).toBeInTheDocument()
	rerender(
		<GuidelineCardCaption
			type="specification"
			title="명세"
			groups={[
				{ title: '색상', items: [{ label: 'HEX', value: '#000000' }] },
				{ title: '서체', items: [{ label: 'Weight', value: 'Bold' }] },
			]}
		/>,
	)
	expect(container.querySelectorAll('figcaption')).toHaveLength(1)
	expect(container.querySelectorAll('figcaption dl')).toHaveLength(2)
	expect(screen.getAllByRole('term')).toHaveLength(2)
	rerender(<GuidelineCardCaption />)
	expect(container).toBeEmptyDOMElement()
})
