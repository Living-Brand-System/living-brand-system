import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { GuidelineImage } from './guideline-image'

describe('GuidelineImage', () => {
	it('이미지가 없으면 플레이스홀더를 렌더한다', () => {
		render(createElement(GuidelineImage, {}))

		expect(screen.getByText('이미지 없음').parentElement).toHaveClass('aspect-video')
	})

	it.each([
		['16:9', undefined, 'aspect-video'],
		['4:3', '4:3', 'aspect-4/3'],
	] as const)('%s 비율로 이미지를 렌더한다', (name, ratio, aspectClass) => {
		render(
			createElement(GuidelineImage, {
				image: { url: `/${name}.png`, alt: name },
				ratio,
			}),
		)

		const image = screen.getByRole('img', { name })
		expect(image).toHaveAttribute('src', `/${name}.png`)
		expect(image.parentElement).toHaveClass(aspectClass)
	})

	it('원본 비율은 고정 비율을 적용하지 않고 빈 이미지에는 기본 비율을 유지한다', () => {
		const { container, rerender } = render(
			createElement(GuidelineImage, {
				image: { url: '/original.png', alt: '원본' },
				ratio: 'original',
			}),
		)

		expect(screen.getByRole('img', { name: '원본' }).parentElement?.className).not.toContain(
			'aspect-',
		)

		rerender(createElement(GuidelineImage, { ratio: 'original' }))

		expect(container.firstElementChild).toHaveClass('aspect-video')
	})
})
