import { existsSync } from 'node:fs'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { InfographicsReference } from './infographics'

afterEach(cleanup)

it('Incorrect Usages에 승인한 6개 캡션과 금지 상태를 실제 에셋으로 표시한다', () => {
	const { container } = render(<InfographicsReference />)
	const section = screen.getByRole('region', { name: 'Incorrect Usages' })
	expect(within(section).getAllByRole('img', { name: '사용 금지' })).toHaveLength(6)
	for (const title of [
		'불필요한 아이콘 삽입',
		'이미지 중첩',
		'일관되지 않은 선 굵기',
		'부족한 명도 대비',
		'구분하기 어려운 영역',
		'불필요한 입체 표현',
	]) {
		expect(within(section).getByText(title).closest('figcaption')).toBeTruthy()
	}
	expect(section.textContent).not.toContain('서체')
	expect(section.querySelectorAll('figcaption')).toHaveLength(6)
	expect(screen.getByRole('link', { name: 'Infographic Builder 열기' })).toHaveAttribute(
		'href',
		'/studio/graph',
	)
	for (const image of container.querySelectorAll('img')) {
		const source = image.getAttribute('src') ?? ''
		const path = source.startsWith('/_next/image')
			? new URL(source, 'http://localhost').searchParams.get('url')
			: source
		expect(existsSync(`public${path}`)).toBe(true)
	}
})
