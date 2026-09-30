import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { TypeSpecimenWidget } from '@/features/guideline/cards/deprecated/displays/dynamics/type-specimen/component'
import { TypeWeightWidget } from '@/features/guideline/cards/deprecated/displays/dynamics/type-weight/component'
import { TIER_PRESETS } from '@/features/guideline/cards/displays/dynamics/type-specimen/manifest'
import { cardControllerFor } from '@/features/guideline/controllers/registry'
import type { DisplayData } from '@/features/guideline/domain/contract/display'
import { GuidelineControllerScope } from '@/features/guideline/providers/guideline-controller-provider'
import { GuidelineControllerPill } from './pill'

afterEach(cleanup)

function Preview({ id, display }: { id: string; display: DisplayData }) {
	const controller = cardControllerFor(display)
	if (!controller) throw new Error('조작형 카드의 컨트롤 없음')
	return (
		<section data-testid={id}>
			<GuidelineControllerScope {...controller}>
				<div data-testid={`${id}-display`}>
					{display.blockType === 'typeSpecimenWidget' ? (
						<TypeSpecimenWidget />
					) : (
						<TypeWeightWidget initialWeight="light" />
					)}
				</div>
				<GuidelineControllerPill />
			</GuidelineControllerScope>
		</section>
	)
}

it('표본 문구·스타일을 공통 컨트롤에서 바꾸고 전환·카드 격리·초기화를 유지한다', () => {
	render(
		<>
			<Preview id="a" display={{ blockType: 'typeSpecimenWidget' }} />
			<Preview id="b" display={{ blockType: 'typeSpecimenWidget' }} />
		</>,
	)
	const a = within(screen.getByTestId('a'))
	const b = within(screen.getByTestId('b'))
	const display = screen.getByTestId('a-display')
	expect(within(display).queryByRole('textbox')).toBeNull()
	fireEvent.change(a.getByRole('textbox', { name: 'Word 문구' }), {
		target: { value: '새 표본' },
	})
	expect(display).toHaveTextContent('새 표본')
	expect(screen.getByTestId('b-display')).toHaveTextContent('Aa')
	fireEvent.click(a.getByRole('radio', { name: 'Sentence' }))
	expect(display).toHaveTextContent(TIER_PRESETS.sentence.fallback)
	fireEvent.click(a.getByRole('radio', { name: 'Word' }))
	expect(display).toHaveTextContent('새 표본')
	fireEvent.click(a.getByRole('radio', { name: 'Right' }))
	expect(display.querySelector('p')).toHaveStyle({ textAlign: 'right' })
	fireEvent.click(a.getByRole('button', { name: '초기화' }))
	expect(display).toHaveTextContent('Aa')
	expect(display.querySelector('p')).toHaveStyle({ textAlign: 'center', lineHeight: '1.2' })
	expect(b.getByRole('textbox', { name: 'Word 문구' })).toHaveValue('Aa')
})

it('굵기 컨트롤은 CMS 초기값을 따르고 세 굵기만 선택하며 고정 표본에는 나타나지 않는다', () => {
	const display: DisplayData = {
		blockType: 'typeWeightWidget',
		initialWeight: 'light',
		layout: 'slider',
	}
	const { rerender } = render(<Preview id="weight" display={display} />)
	const sample = () => screen.getByTestId('weight-display').querySelector('p')
	expect(sample()).toHaveStyle({ fontWeight: '300' })
	expect(screen.getAllByRole('radio')).toHaveLength(3)
	fireEvent.click(screen.getByRole('radio', { name: 'Bold 700' }))
	expect(sample()).toHaveStyle({ fontWeight: '700' })
	fireEvent.click(screen.getByRole('button', { name: '초기화' }))
	expect(sample()).toHaveStyle({ fontWeight: '300' })
	rerender(<Preview id="weight" display={{ ...display, initialWeight: 'medium' }} />)
	expect(sample()).toHaveStyle({ fontWeight: '500' })
	expect(cardControllerFor({ ...display, layout: 'specimen' })).toBeNull()
})
