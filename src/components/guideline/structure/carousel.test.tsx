import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GuidelineCarouselContainer } from './carousel'
import { type GuidelineCardData, GuidelineGridContainer } from './grid'
import { GuidelineStickyContainer } from './sticky'

afterEach(cleanup)

const embla = vi.hoisted(() => {
	let selected = 0
	let playing = false
	let looping = false
	const listeners = new Map<string, () => void>()
	const player = {
		isPlaying: () => playing,
		play: () => {
			playing = true
			listeners.get('autoplay:play')?.()
		},
		stop: () => {
			playing = false
			listeners.get('autoplay:stop')?.()
		},
	}
	const api = {
		selectedScrollSnap: () => selected,
		canScrollPrev: () => looping || selected > 0,
		canScrollNext: () => looping || selected < 2,
		plugins: () => ({ autoplay: player }),
		on: (event: string, callback: () => void) => listeners.set(event, callback),
		off: (event: string) => listeners.delete(event),
		scrollTo: (index: number) => {
			selected = index
			listeners.get('select')?.()
		},
		scrollNext: () => {
			selected += 1
			listeners.get('select')?.()
		},
		scrollPrev: () => {
			selected -= 1
			listeners.get('select')?.()
		},
	}
	return {
		api,
		listeners,
		enableLoop: () => {
			looping = true
		},
	}
})
vi.mock('motion/react', async (importOriginal) => ({
	...(await importOriginal<typeof import('motion/react')>()),
	useReducedMotion: () => false,
}))
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), embla.api] }))

it('카드마다 카운터가 증가하며 마지막·빈 목록·재초기화와 이벤트 해제를 처리한다', () => {
	const cards = [
		{ id: 'square', ratio: '1:1' as const, display: '정사각형' },
		{ id: 'wide', ratio: '16:9' as const, display: '가로형' },
		{ id: 'portrait', ratio: '2:3' as const, display: '세로형' },
	]
	const { rerender, unmount } = render(
		<GuidelineCarouselContainer label="예시" cards={cards} loop={false} />,
	)
	expect(screen.getByLabelText('현재 카드')).toHaveTextContent('1 / 3')
	expect(screen.getByRole('button', { name: '이전 카드' })).toBeDisabled()
	fireEvent.click(screen.getByRole('button', { name: '다음 카드' }))
	fireEvent.click(screen.getByRole('button', { name: '다음 카드' }))
	expect(screen.getByLabelText('현재 카드')).toHaveTextContent('3 / 3')
	expect(screen.getByRole('button', { name: '다음 카드' })).toBeDisabled()
	fireEvent.click(screen.getByRole('button', { name: '이전 카드' }))
	act(() => embla.listeners.get('reInit')?.())
	expect(screen.getByLabelText('현재 카드')).toHaveTextContent('2 / 3')
	rerender(<GuidelineCarouselContainer label="예시" cards={cards.slice(0, 1)} loop={false} />)
	expect(screen.getByLabelText('현재 카드')).toHaveTextContent('1 / 1')
	rerender(<GuidelineCarouselContainer label="예시" cards={[]} loop={false} />)
	expect(screen.getByLabelText('현재 카드')).toHaveTextContent('0 / 0')
	expect(screen.getByRole('button', { name: '다음 카드' })).toBeDisabled()

	rerender(<GuidelineCarouselContainer label="예시" cards={cards} autoplay loop />)
	act(() => {
		embla.enableLoop()
		embla.listeners.get('reInit')?.()
	})
	fireEvent.click(screen.getByRole('button', { name: '다음 카드' }))
	expect(screen.getByRole('button', { name: '다음 카드' })).toBeEnabled()
	fireEvent.click(screen.getByRole('button', { name: '자동 재생 시작' }))
	expect(screen.getByLabelText('현재 카드')).toHaveAttribute('aria-live', 'off')
	fireEvent.click(screen.getByRole('button', { name: '자동 재생 정지' }))
	expect(screen.getByLabelText('현재 카드')).toHaveAttribute('aria-live', 'polite')
	fireEvent.click(screen.getByRole('button', { name: '자동 재생 시작' }))
	fireEvent.click(screen.getByRole('button', { name: '이전 카드' }))
	expect(screen.getByRole('button', { name: '자동 재생 시작' })).toBeEnabled()
	unmount()
	expect(embla.listeners.size).toBe(0)
})

it('같은 카드 입력의 판형·도판·캡션을 세 컨테이너가 유지한다', () => {
	const cards: GuidelineCardData[] = [
		{
			id: 'wide',
			ratio: '16:9',
			display: <button type="button">도판 액션</button>,
			caption: { type: 'list', title: '공통 캡션', items: [{ description: '비례 유지' }] },
		},
		{ id: 'portrait', ratio: '2:3', display: '캡션 없는 도판' },
	]
	const { container, rerender } = render(<GuidelineGridContainer cards={cards} />)
	const verify = () => {
		const figures = container.querySelectorAll('[data-slot="guideline-card"]')
		expect(figures).toHaveLength(2)
		expect(figures[0]).toHaveStyle({ '--display-ratio': '16 / 9' })
		expect(figures[1]).toHaveStyle({ '--display-ratio': '2 / 3' })
		expect(screen.getByRole('button', { name: '도판 액션' })).toBeEnabled()
		expect(screen.getByText('비례 유지').closest('figcaption')).toHaveAttribute(
			'data-type',
			'list',
		)
		expect(figures[1].querySelector('figcaption')).toBeNull()
	}
	verify()
	rerender(<GuidelineCarouselContainer label="공통 입력" cards={cards} />)
	verify()
	rerender(<GuidelineStickyContainer cards={cards} mode="individual" />)
	verify()
})

it('이름 선택과 드래그·재초기화가 같은 선택 상태를 공유하고 재생을 멈춘다', () => {
	embla.api.scrollTo(0)
	const cards = ['Box Truck', 'Flatbed Truck', 'Bus', 'Van'].map((selectionLabel) => ({
		id: selectionLabel,
		selectionLabel,
		ratio: '16:9' as const,
		display: selectionLabel,
	}))
	const { unmount, container } = render(
		<GuidelineCarouselContainer label="차량" navigation="labels" cards={cards} autoplay />,
	)
	expect(screen.queryByRole('button', { name: '다음 카드' })).toBeNull()
	expect(screen.getByRole('radio', { name: 'Box Truck' })).toHaveAttribute('aria-checked', 'true')
	fireEvent.click(screen.getByRole('button', { name: '자동 재생 시작' }))
	fireEvent.click(screen.getByRole('radio', { name: 'Bus' }))
	expect(embla.api.selectedScrollSnap()).toBe(2)
	expect(screen.getByRole('radio', { name: 'Bus' })).toHaveAttribute('aria-checked', 'true')
	expect(embla.api.plugins().autoplay.isPlaying()).toBe(false)
	act(() => embla.api.scrollNext())
	expect(screen.getByRole('radio', { name: 'Van' })).toHaveAttribute('aria-checked', 'true')
	act(() => {
		embla.api.scrollTo(0)
		embla.listeners.get('reInit')?.()
	})
	expect(screen.getByRole('radio', { name: 'Box Truck' })).toHaveAttribute('aria-checked', 'true')
	expect(container.querySelector('[data-slot="guideline-card"]')).toHaveStyle({ width: '100%' })
	unmount()
})
