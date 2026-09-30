import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TypeSpecimenReview } from './display-review-controls'

afterEach(cleanup)

it('표본 편집과 초기화가 같은 검토 카드에 반영된다', () => {
	const { container } = render(<TypeSpecimenReview />)
	const sample = () => container.querySelector('[data-slot="type-specimen-text"]')
	const original = sample()?.textContent
	fireEvent.change(screen.getByRole('textbox', { name: 'Word 문구' }), {
		target: { value: '검토 표본' },
	})
	expect(sample()?.textContent).toBe('검토 표본')
	fireEvent.click(screen.getByRole('button', { name: '초기화' }))
	expect(sample()?.textContent).toBe(original)
})
