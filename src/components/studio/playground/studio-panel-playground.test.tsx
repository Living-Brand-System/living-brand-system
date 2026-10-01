import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { StudioPanelPlayground } from './studio-panel-playground'

afterEach(cleanup)

it('카테고리 패널을 전환하며 템플릿·편집 대상·대상별 입력을 유지하고 적용할 때만 결과를 교체한다', () => {
	const { container } = render(<StudioPanelPlayground />)
	const modes = within(screen.getByRole('radiogroup', { name: '편집 모드' }))
	const preview = container.querySelector('[data-slot="template-preview"]')
	const background = () => preview?.querySelector('img')?.getAttribute('src')
	const initialBackground = background()

	expect(modes.getByRole('radio', { name: 'Image' })).toBeDisabled()
	expect(modes.getByRole('radio', { name: 'Graphic' })).toBeDisabled()
	fireEvent.change(screen.getByLabelText('제목'), { target: { value: '유지할 제목' } })
	fireEvent.click(screen.getByRole('button', { name: '배경' }))
	fireEvent.click(modes.getByRole('radio', { name: 'Image' }))
	expect(screen.getByText('Image 카테고리')).toBeVisible()
	const method = () => within(screen.getByRole('radiogroup', { name: '이미지 방식' }))
	fireEvent.click(method().getByRole('radio', { name: '생성' }))
	fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '배경 프롬프트' } })
	fireEvent.click(screen.getByRole('button', { name: '샘플 생성' }))
	expect(screen.getByRole('button', { name: /후보 1/ })).toBeVisible()

	fireEvent.click(modes.getByRole('radio', { name: 'Graphic' }))
	expect(screen.getByText('Graphic 카테고리')).toBeVisible()
	fireEvent.click(modes.getByRole('radio', { name: 'Template' }))
	expect(screen.getByText('Template 카테고리')).toBeVisible()
	expect(background()).toBe(initialBackground)
	expect(screen.getByRole('button', { name: '캔버스 텍스트 선택' })).toHaveTextContent(
		'유지할 제목',
	)

	fireEvent.click(screen.getByRole('button', { name: '이미지' }))
	fireEvent.click(modes.getByRole('radio', { name: 'Image' }))
	fireEvent.click(method().getByRole('radio', { name: '생성' }))
	expect(screen.getByLabelText('Prompt')).toHaveValue('')
	fireEvent.change(screen.getByLabelText('Prompt'), { target: { value: '이미지 프롬프트' } })
	fireEvent.click(screen.getByRole('button', { name: '배경' }))
	fireEvent.click(modes.getByRole('radio', { name: 'Image' }))
	expect(screen.getByLabelText('Prompt')).toHaveValue('배경 프롬프트')
	fireEvent.click(screen.getByRole('button', { name: '배경에 적용' }))
	expect(screen.getByText('Template 카테고리')).toBeVisible()
	expect(background()).not.toBe(initialBackground)
	expect(screen.getByRole('button', { name: '캔버스 텍스트 선택' })).toHaveTextContent(
		'유지할 제목',
	)

	const surface = within(screen.getByRole('radiogroup', { name: '작업 화면' }))
	fireEvent.click(surface.getByRole('radio', { name: 'Image' }))
	expect(screen.getByText('Image 카테고리')).toBeVisible()
	fireEvent.click(surface.getByRole('radio', { name: 'Graphic' }))
	expect(screen.getByText('Graphic 카테고리')).toBeVisible()
	fireEvent.click(surface.getByRole('radio', { name: 'Template' }))
	expect(screen.getByRole('button', { name: '캔버스 텍스트 선택' })).toHaveTextContent(
		'유지할 제목',
	)
})
