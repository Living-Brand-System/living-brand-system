import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GuidelineDescription } from './guideline-description'

afterEach(cleanup)

const text = (t: string) => ({ type: 'text', text: t, version: 1 })
const cell = (t: string) => ({
	type: 'tablecell',
	version: 1,
	headerState: 0,
	children: [{ type: 'paragraph', version: 1, children: [text(t)] }],
})
const row = (...cells: string[]) => ({ type: 'tablerow', version: 1, children: cells.map(cell) })
const doc = (...rows: ReturnType<typeof row>[]) =>
	({
		root: {
			type: 'root',
			version: 1,
			children: [{ type: 'table', version: 1, children: rows }],
		},
	}) as never

describe('표 → 스펙 리스트', () => {
	it.each([
		'description',
		'caption',
		'overlayCaption',
	] as const)('%s 안에서도 스펙 라벨·값의 밀도를 유지한다', (variant) => {
		const { container } = render(
			<GuidelineDescription variant={variant} description={doc(row('Weight', 'Regular'))} />,
		)
		expect(container.querySelector('dt')).toHaveClass(
			'text-sm',
			'font-medium',
			'leading-[1.55]',
		)
		expect(container.querySelector('dd')).toHaveClass(
			'text-sm',
			'font-normal',
			'leading-[1.55]',
		)
	})

	it('2열 표는 라벨·값 dl로 그린다', () => {
		const { container } = render(
			<GuidelineDescription
				description={doc(row('Weight', 'Regular'), row('Leading', '150 – 160%'))}
			/>,
		)
		expect(container.querySelector('table')).toBeNull()
		expect([...container.querySelectorAll('dt')].map((el) => el.textContent)).toEqual([
			'Weight',
			'Leading',
		])
		expect(screen.getByText('150 – 160%').closest('dd')).toHaveClass('text-muted-foreground')
	})

	// 🔴 "첫 열이 라벨"은 2열에서만 성립한다. 그 밖은 기본 표다.
	it('열이 2개가 아니면 기본 표로 폴백한다', () => {
		const { container } = render(<GuidelineDescription description={doc(row('a', 'b', 'c'))} />)
		expect(container.querySelector('table')).not.toBeNull()
		expect(container.querySelector('dl')).toBeNull()
	})
})
