import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CardBlock } from '../../blocks/card-block'
import { GuidelineCard } from './component'

// embla는 jsdom에 없는 브라우저 API를 요구한다 — 리포 선례(review-canvas.test)대로 껍데기로 바꾼다.
vi.mock('@/components/ui/carousel', () => ({
	Carousel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	CarouselContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	CarouselItem: ({ children, className }: { children: ReactNode; className?: string }) => (
		<div data-slot="slide" className={className}>
			{children}
		</div>
	),
}))
// 이 검증은 카드의 경계를 본다. Slider의 ResizeObserver는 실제 브라우저에서 확인한다.
vi.mock('@/components/ui/slider', () => ({ Slider: () => null }))
afterEach(() => {
	cleanup()
})

const image = (id: number) => ({ id, url: `/img-${id}.png`, alt: `그림 ${id}` })
const staticCard = (id: string, extra: object = {}) => ({
	id,
	ratio: '16:9',
	display: [{ id: `${id}-d`, blockType: 'staticDisplay', image: image(1) }],
	...extra,
})

describe('GuidelineCard', () => {
	it('동적 디스플레이는 판 내부 스크롤을 만들지 않는다', () => {
		const { container } = render(
			<GuidelineCard
				card={{ ratio: '1:1', display: [{ blockType: 'typeSpecimenWidget' }] } as never}
			/>,
		)
		expect(container.querySelector('[data-slot="card-display"]')).toHaveClass('overflow-clip')
		expect(container.querySelector('figure > div')).toHaveClass('overflow-clip')
		expect(container.querySelector('[data-slot="type-specimen-text"]')).toHaveClass('min-h-0')
		expect(container.querySelector('[data-slot="card-display"] textarea')).toBeNull()
	})

	it('기존 로고 크기와 오버레이 배율은 카드 크기를 바꾸지 않는다', () => {
		const { container, rerender } = render(
			<GuidelineCard
				card={
					{
						display: [
							{
								blockType: 'logoDisplayWidget',
								logo: image(1),
								width: 2000,
								height: 1000,
							},
						],
					} as never
				}
			/>,
		)
		const displayRoot = () => container.querySelector('[data-slot="card-display"] > div')
		expect(displayRoot()).toHaveClass('size-full')
		expect(screen.getByRole('img')).toHaveClass('size-full', 'object-contain')
		expect(screen.getByRole('img').style.width).toBe('')
		expect(screen.getByRole('img').style.height).toBe('')
		rerender(
			<GuidelineCard
				card={
					{
						display: [
							{
								blockType: 'clearspaceOverlayWidget',
								logoLayer: image(1),
								gridLayer: image(2),
								scalePercent: 200,
							},
						],
					} as never
				}
			/>,
		)
		expect(displayRoot()).toHaveClass('size-full')
		expect((displayRoot() as HTMLElement).style.transform).toBe('')
		for (const layer of container.querySelectorAll('img')) {
			expect(layer).toHaveClass('absolute', 'inset-0', 'size-full', 'object-contain')
		}
	})

	it('정적 디스플레이와 캡션(제목만)을 그린다', () => {
		const { container } = render(
			<GuidelineCard
				card={
					staticCard('a', { ratio: '1:1', caption: { title: 'Forward Mark' } }) as never
				}
			/>,
		)
		expect(screen.getByRole('img')).toHaveAttribute('src', '/img-1.png')
		expect(container.querySelector('.aspect-square')).not.toBeNull()
		expect(screen.getByText('Forward Mark')).toBeInTheDocument()
	})

	it('카드 표식이 있으면 판 모서리에 배지를 그리고 none이면 그리지 않는다', () => {
		render(<GuidelineCard card={staticCard('a', { mark: 'dont' }) as never} />)
		expect(screen.getByRole('img', { name: "Don't" })).toHaveClass('text-destructive')
		cleanup()
		render(<GuidelineCard card={staticCard('a', { mark: 'none' }) as never} />)
		expect(screen.queryByRole('img', { name: "Don't" })).toBeNull()
	})

	it('캡션이 비면 figcaption을 만들지 않고, 디스플레이가 없으면 카드 자체를 그리지 않는다', () => {
		const { container } = render(<GuidelineCard card={staticCard('a') as never} />)
		expect(container.querySelector('figcaption')).toBeNull()

		const empty = render(
			<GuidelineCard card={{ id: 'b', ratio: '16:9', display: [] } as never} />,
		)
		expect(empty.container).toBeEmptyDOMElement()
	})

	it('기존 캡션은 아래에 두고 오버레이는 figure의 접근 가능한 마지막 자식으로 그린다', () => {
		const { container, rerender } = render(
			<GuidelineCard card={staticCard('a', { caption: { title: '기존 캡션' } }) as never} />,
		)
		expect(container.querySelector('figcaption')).toHaveAttribute('data-placement', 'below')
		expect(container.querySelector('figcaption')).not.toHaveAttribute('tabindex')
		rerender(
			<GuidelineCard
				card={
					staticCard('a', {
						caption: { placement: 'overlay', title: '오버레이 캡션' },
					}) as never
				}
			/>,
		)
		const caption = container.querySelector('figure > figcaption:last-child')
		expect(caption).toHaveAttribute('data-placement', 'overlay')
		expect(caption).toHaveAttribute('tabindex', '0')
		expect(screen.getByText('오버레이 캡션')).toBeInTheDocument()
		rerender(
			<GuidelineCard
				card={staticCard('a', { caption: { placement: 'overlay', title: ' ' } }) as never}
			/>,
		)
		expect(container.querySelector('figcaption')).toBeNull()
	})
})

describe('CardBlock', () => {
	it('카드 없이도 제목·앵커를 유지하고 카드 프레임은 만들지 않는다', () => {
		const { container, rerender } = render(
			<CardBlock
				id="text-only"
				block={{ title: '사용 원칙', cards: [], layout: 'grid', rowHeight: 'medium' }}
			/>,
		)
		expect(
			screen.getByRole('heading', { name: '사용 원칙', level: 2 }).closest('section'),
		).toHaveAttribute('id', 'text-only')
		expect(container.querySelector('section')?.children).toHaveLength(1)
		rerender(<CardBlock block={{ title: ' ', cards: [{ display: [] }] } as never} />)
		expect(container).toBeEmptyDOMElement()
	})

	it('제목과 카드가 없어도 설명을 표시한다', () => {
		const description = {
			root: {
				type: 'root',
				version: 1,
				direction: null,
				format: '',
				indent: 0,
				children: [
					{
						type: 'paragraph',
						version: 1,
						direction: null,
						format: '',
						indent: 0,
						children: [
							{
								type: 'text',
								version: 1,
								text: '브랜드 사용 원칙',
								format: 0,
								detail: 0,
								mode: 'normal',
								style: '',
							},
						],
					},
				],
			},
		}
		render(<CardBlock block={{ description, layout: 'carousel', cards: [] } as never} />)
		expect(screen.getByText('브랜드 사용 원칙')).toBeInTheDocument()
		expect(screen.queryByRole('heading')).toBeNull()
	})

	it.each([
		'grid',
		'carousel',
	])('%s 안에서 카드별 표식을 섞고 생략한 카드는 표시하지 않는다', (layout) => {
		render(
			<CardBlock
				block={
					{
						layout,
						cards: [
							staticCard('a', { mark: 'do' }),
							staticCard('b', { mark: 'ok' }),
							staticCard('c', { mark: 'dont' }),
							staticCard('d', { mark: 'none' }),
							staticCard('e'),
						],
					} as never
				}
			/>,
		)
		for (const label of ['Do', 'OK', "Don't"]) {
			expect(screen.getAllByRole('img', { name: label })).toHaveLength(1)
		}
		expect(screen.getAllByRole('img')).toHaveLength(8)
	})

	it('블록의 줄 높이를 모든 카드 판에 주고 폭은 카드 비율이 정한다', () => {
		const { container } = render(
			<CardBlock
				title="한 눈에 보기"
				block={
					{
						layout: 'carousel',
						rowHeight: 'high',
						cards: [staticCard('a', { ratio: '9:16' }), staticCard('b')],
					} as never
				}
			/>,
		)
		expect(screen.getByRole('heading', { level: 2, name: '한 눈에 보기' })).toBeInTheDocument()
		const panels = [...container.querySelectorAll('figure > div')]
		expect(panels.map((el) => el.className.includes('md:h-[min(60vw,60rem)]'))).toEqual([
			true,
			true,
		])
		expect(panels[0]).toHaveClass('aspect-[9/16]')
		expect(panels[1]).toHaveClass('aspect-video')
		// 슬라이드 폭은 카드가 정한다.
		expect(container.querySelector('[data-slot="slide"]')).toHaveClass('md:basis-auto')
	})

	it('격자는 기본 2열이며 높이 설정을 적용하지 않는다', () => {
		const { container } = render(
			<CardBlock block={{ layout: 'grid', cards: [staticCard('a')] } as never} />,
		)
		expect(container.querySelector('[data-slot="grid-container"]')).toHaveStyle({
			'--grid-columns': '2',
		})
		expect(container.querySelector('figure > div')).not.toHaveClass('md:h-[min(45vw,46rem)]')
	})
})
