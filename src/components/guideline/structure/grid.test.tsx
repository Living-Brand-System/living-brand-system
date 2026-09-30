import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { GuidelineGridPlayground } from './grid-playground'

vi.mock('next/image', () => ({
	default: ({ fill: _fill, alt, ...props }: Record<string, unknown>) => (
		// biome-ignore lint/performance/noImgElement: next/image 테스트 대역입니다.
		<img alt={String(alt)} {...props} />
	),
}))

it('Contain은 80%로 시작하고 Cover는 스케일 조작 없이 100%를 적용한다', () => {
	const { container } = render(<GuidelineGridPlayground />)
	const image = screen.getByAltText('컨테이너선')
	expect(image).toHaveStyle({ objectFit: 'contain', transform: 'scale(0.8)' })
	fireEvent.change(screen.getByRole('slider', { name: 'Contain 스케일' }), {
		target: { value: '30' },
	})
	expect(image).toHaveStyle({ transform: 'scale(0.3)' })
	fireEvent.change(screen.getByLabelText('이미지 맞춤'), { target: { value: 'cover' } })
	expect(screen.queryByRole('slider')).toBeNull()
	expect(image).toHaveStyle({ objectFit: 'cover', transform: 'scale(1)' })
	fireEvent.change(screen.getByLabelText('카드 수'), { target: { value: '1' } })
	const grid = container.querySelector('[data-slot="guideline-grid-container"]')
	expect(grid?.children).toHaveLength(1)
	expect(grid).toHaveStyle({ '--grid-columns': '3' })
})
