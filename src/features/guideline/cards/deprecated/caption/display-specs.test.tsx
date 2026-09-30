import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { GuidelineCard } from '@/features/guideline/cards/deprecated/component'
import type { DisplayData } from '@/features/guideline/domain/contract/display'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import { GuidelineControllerScope } from '@/features/guideline/providers/guideline-controller-provider'
import { CardBlock } from '../../../blocks/card-block'
import { cardControllerFor } from '../../../controllers/registry'
import { TypeLanguageView } from '../displays/dynamics/type-language/view'
import { CardCaption } from './component'
import { DisplaySpecs, TypeLanguageCaptionTitle } from './display-specs'

afterEach(cleanup)

function LanguageCard({ id }: { id: string }) {
	const display: DisplayData = {
		blockType: 'typeLanguageWidget',
		initialLanguage: 'ko',
		layout: 'single',
	}
	const config = cardControllerFor(display)
	if (!config) throw new Error('언어 컨트롤러 없음')
	return (
		<div data-testid={id}>
			<GuidelineControllerScope {...config}>
				<TypeLanguageView initialLanguage="ko" layout="single" />
				<CardCaption
					layout="split"
					caption={{ title: '언어별 표본' }}
					title={<TypeLanguageCaptionTitle display={display} />}
				>
					<DisplaySpecs display={display} />
				</CardCaption>
				<Controls id={id} />
			</GuidelineControllerScope>
		</div>
	)
}
function Controls({ id }: { id: string }) {
	const { set, reset } = useGuidelineController()
	return (
		<>
			<button type="button" onClick={() => set('typeLanguage', 'en')}>
				{id} 영문
			</button>
			<button type="button" onClick={reset}>
				{id} 초기화
			</button>
		</>
	)
}

it('언어 표본과 캡션은 함께 바뀌고 다른 카드 및 초기화와 독립적이다', () => {
	render(
		<>
			<LanguageCard id="a" />
			<LanguageCard id="b" />
		</>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'a 영문' }))
	const a = within(screen.getByTestId('a'))
	const b = within(screen.getByTestId('b'))
	expect(a.getByText('영문')).toBeInTheDocument()
	expect(a.queryByText('언어별 표본')).toBeNull()
	const caption = screen.getByTestId('a').querySelector('figcaption') as HTMLElement
	expect(caption.firstElementChild?.firstElementChild).toHaveTextContent('영문')
	expect(caption.firstElementChild?.lastElementChild).not.toHaveTextContent('영문')
	expect(a.getByText('135–145% · 135% 적용')).toBeInTheDocument()
	expect(a.getByText(/HD Hyundai is the holding company/)).toBeInTheDocument()
	expect(b.getByText('국문')).toBeInTheDocument()
	expect(b.getByText('150–160% · 150% 적용')).toBeInTheDocument()
	fireEvent.click(screen.getByRole('button', { name: 'a 초기화' }))
	expect(a.getByText('국문')).toBeInTheDocument()
})

it('위계 명세는 디스플레이 밖 캡션에 있고 저작 캡션도 보존한다', () => {
	const { container } = render(
		<GuidelineCard
			card={{
				ratio: '16:9',
				caption: { title: '저작한 설명' },
				display: [{ blockType: 'typeHierarchyWidget', language: 'ko' }],
			}}
		/>,
	)
	const panel = container.querySelector('[data-slot="card-display"]') as HTMLElement
	expect(panel.parentElement).toHaveStyle({ '--card-ratio': String(5 / 7) })
	expect(within(panel).queryByText('Head Copy')).toBeNull()
	expect(within(panel).queryByRole('textbox')).toBeNull()
	const caption = container.querySelector('figcaption') as HTMLElement
	expect(caption).toHaveAttribute('data-layout', 'split')
	expect(within(caption).getByText('Head Copy')).toBeInTheDocument()
	expect(within(caption).getByText('저작한 설명')).toBeInTheDocument()
})

it('언어 비교는 세 카드로 나누며 각 카드의 명세를 연결한다', () => {
	const { container } = render(
		<CardBlock
			block={{
				layout: 'grid',
				rowHeight: 'medium',
				cards: [
					{
						id: 'languages',
						ratio: '1:1',
						display: [{ blockType: 'typeLanguageWidget', layout: 'compare' }],
					},
				],
			}}
		/>,
	)
	expect(container.querySelectorAll('figure')).toHaveLength(3)
	const captions = container.querySelectorAll('figcaption')
	expect(captions).toHaveLength(3)
	for (const [i, label] of ['국문', '영문', '영문 (All Caps)'].entries())
		expect(within(captions[i]).getByText(label)).toBeInTheDocument()
})
