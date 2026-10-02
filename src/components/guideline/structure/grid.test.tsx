import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { GuidelineCardDisplay, GuidelineGridContainer } from './grid'

vi.mock('next/image', () => ({
	default: ({ fill: _fill, alt, ...props }: Record<string, unknown>) => (
		// biome-ignore lint/performance/noImgElement: next/image 테스트 대역입니다.
		<img alt={String(alt)} {...props} />
	),
}))

const card = (id: string, display: React.ReactNode) => ({
	id,
	ratio: '1:1' as const,
	display,
	caption: { title: id },
})

it('Contain은 80%로 시작하고 scale을 따르며, Cover는 스케일 없이 100%를 적용한다', () => {
	const { container } = render(
		<GuidelineGridContainer
			columns={3}
			cards={[
				card('기본', <GuidelineCardDisplay src="/a.webp" alt="기본" />),
				card(
					'축소',
					<GuidelineCardDisplay src="/a.webp" alt="축소" fit="contain" scale={30} />,
				),
				card('덮기', <GuidelineCardDisplay src="/a.webp" alt="덮기" fit="cover" />),
			]}
		/>,
	)
	expect(screen.getByAltText('기본')).toHaveStyle({
		objectFit: 'contain',
		transform: 'scale(0.8)',
	})
	expect(screen.getByAltText('축소')).toHaveStyle({ transform: 'scale(0.3)' })
	expect(screen.getByAltText('덮기')).toHaveStyle({ objectFit: 'cover', transform: 'scale(1)' })
	const grid = container.querySelector('[data-slot="guideline-grid-container"]')
	expect(grid?.children).toHaveLength(3)
	expect(grid).toHaveStyle({ '--grid-columns': '3' })
})

it('카드가 열 수보다 적어도 지정한 열 수를 유지한다', () => {
	const { container } = render(
		<GuidelineGridContainer
			columns={3}
			cards={[card('하나', <GuidelineCardDisplay src="/a.webp" alt="하나" />)]}
		/>,
	)
	const grid = container.querySelector('[data-slot="guideline-grid-container"]')
	expect(grid?.children).toHaveLength(1)
	expect(grid).toHaveStyle({ '--grid-columns': '3' })
})
