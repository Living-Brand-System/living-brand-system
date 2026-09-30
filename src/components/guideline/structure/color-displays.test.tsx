import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { GuidelineColorPaletteDisplay, GuidelineLogoBackgroundDisplay } from './color-displays'

it('배경 대비와 알파 합성으로 로고를 고르고 팔레트 배열을 유지한다', () => {
	const colors = [
		{ id: 'dark', label: 'Dark', value: '#000000' },
		{ id: 'light', label: 'Light', value: '#FFFFFF' },
	]
	const logos = { black: '/black.png', white: '/white.png' }
	const { rerender, container } = render(
		<GuidelineLogoBackgroundDisplay colors={colors} logos={logos} />,
	)
	expect(screen.getByRole('img')).toHaveAttribute('src', '/white.png')
	fireEvent.click(screen.getByRole('button', { name: 'Light' }))
	expect(screen.getByRole('img')).toHaveAttribute('src', '/black.png')
	fireEvent.click(screen.getByRole('button', { name: '배경색 초기화' }))
	expect(screen.getByRole('img')).toHaveAttribute('src', '/white.png')
	rerender(<GuidelineLogoBackgroundDisplay colors={colors} logos={logos} opacity={0} />)
	expect(screen.getByRole('img')).toHaveAttribute('src', '/black.png')
	const groups = [
		{ id: 'a', name: 'A', colors },
		{ id: 'b', name: 'B', colors: [colors[0]] },
	]
	rerender(<GuidelineColorPaletteDisplay groups={groups} />)
	expect(screen.getByRole('group', { name: 'B' })).toHaveStyle({
		gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
	})
	rerender(<GuidelineColorPaletteDisplay groups={groups} layout="ranked" />)
	expect(screen.getByRole('group', { name: 'A' }).style.flexGrow).toBe('2')
	expect(screen.getByRole('group', { name: 'B' })).toHaveStyle({
		gridTemplateRows: 'repeat(1, minmax(0, 1fr))',
	})
	expect(container.querySelectorAll('fieldset button')).toHaveLength(3)
})
