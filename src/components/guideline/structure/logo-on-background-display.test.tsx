import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { GuidelineLogoOnBackgroundDisplay } from './logo-on-background-display'

afterEach(cleanup)
it('모든 색을 동시에 표시하고 허용·금지·미등록을 구분한다', () => {
	const { container } = render(
		<GuidelineLogoOnBackgroundDisplay
			logos={{
				default: '/brand/hd/ko-horizontal-default.svg',
				white: '/white.svg',
				mono: '/mono.svg',
			}}
			groups={[
				{
					id: 'primary',
					name: 'Primary',
					colors: [
						{
							id: 'a',
							label: '허용 배경',
							value: '#FFFFFF',
							logoUsage: { fullColor: true, whiteWordmark: true, mono: 'black' },
						},
						{
							id: 'b',
							label: '금지 배경',
							value: '#000000',
							logoUsage: { fullColor: false, whiteWordmark: false, mono: 'white' },
						},
						{ id: 'c', label: '미등록 배경', value: '#CCCCCC' },
					],
				},
			]}
		/>,
	)
	expect(screen.queryByText('허용 배경')).toBeNull()
	expect(screen.getByRole('img', { name: '허용 배경 배경 · 기본형' })).toBeTruthy()
	expect(screen.getByRole('img', { name: '허용 배경 배경 · WHITE 워드마크' })).toBeTruthy()
	expect(screen.getByRole('img', { name: '허용 배경 배경 · 검정 단색 로고' })).toBeTruthy()
	expect(screen.queryByRole('img', { name: '금지 배경 배경 · 기본형' })).toBeNull()
	expect(screen.queryByRole('img', { name: '금지 배경 배경 · WHITE 워드마크' })).toBeNull()
	expect(screen.getAllByText('규정 미등록')).toHaveLength(3)
	expect(screen.queryByRole('slider')).toBeNull()
	expect(
		(container.querySelector('[data-slot="guideline-card-display"]') as HTMLElement).style
			.aspectRatio,
	).toBe('48 / 27')
})
