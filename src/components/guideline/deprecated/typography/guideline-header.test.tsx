import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GuidelineHeader } from './guideline-header'

afterEach(cleanup)

describe('GuidelineHeader', () => {
	it.each([
		['topic', 1, '6xl'],
		['section', 2, '5xl'],
	] as const)('%s variant의 문서 수준과 크기를 유지한다', (variant, level, size) => {
		const { container } = render(<GuidelineHeader variant={variant} title="Color" />)

		expect(screen.getByRole('heading', { level, name: 'Color' })).toBeInTheDocument()
		expect(container.querySelector('[data-slot="typography"]')).toHaveAttribute(
			'data-size',
			size,
		)
	})
})
