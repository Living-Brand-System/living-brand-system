'use client'

import { ArrowLeft, ArrowRight } from '@carbon/icons-react'
import Autoplay from 'embla-carousel-autoplay'
import useEmblaCarousel from 'embla-carousel-react'
import { useReducedMotion } from 'motion/react'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import styles from './carousel.module.css'
import { GuidelineCard, GuidelineCardCaption, type GuidelineCardData } from './grid'
import { GuidelineSelection } from './selection'

/** 카드 비율은 항목이, 공통 높이·이동·카운터는 캐러셀이 소유합니다. */
export function GuidelineCarouselContainer({
	label,
	cards,
	displayHeight = 320,
	loop = true,
	autoplay = false,
	navigation = 'counter',
}: {
	label: string
	displayHeight?: 240 | 320 | 480 | 720
	loop?: boolean
	autoplay?: boolean
} & (
	| { navigation?: 'counter'; cards: readonly GuidelineCardData[] }
	| { navigation: 'labels'; cards: readonly (GuidelineCardData & { selectionLabel: string })[] }
)) {
	const reducedMotion = useReducedMotion()
	const plugins = useMemo(
		() => [
			Autoplay({
				active: autoplay && !reducedMotion,
				delay: 3000,
				stopOnInteraction: true,
				stopOnMouseEnter: true,
				stopOnLastSnap: !loop,
			}),
		],
		[autoplay, loop, reducedMotion],
	)
	const [viewportRef, api] = useEmblaCarousel(
		{
			align: 'start',
			containScroll: false,
			slidesToScroll: 1,
			loop,
		},
		plugins,
	)
	const [canPrev, setCanPrev] = useState(false)
	const [canNext, setCanNext] = useState(false)
	const [playing, setPlaying] = useState(false)
	const [selected, setSelected] = useState(0)
	useEffect(() => {
		if (!api) return
		const sync = () => {
			setSelected(api.selectedScrollSnap())
			setCanPrev(api.canScrollPrev())
			setCanNext(api.canScrollNext())
			setPlaying(api.plugins().autoplay?.isPlaying() ?? false)
		}
		sync()
		api.on('select', sync)
		api.on('reInit', sync)
		api.on('autoplay:play', sync)
		api.on('autoplay:stop', sync)
		return () => {
			api.off('select', sync)
			api.off('reInit', sync)
			api.off('autoplay:play', sync)
			api.off('autoplay:stop', sync)
		}
	}, [api])
	const ratios = cards.map(({ ratio, displayAspectRatio }) => {
		const [width, height] = ratio.split(':').map(Number)
		return displayAspectRatio ?? width / height
	})
	const current = cards.length ? Math.min(selected + 1, cards.length) : 0
	return (
		<section
			aria-label={label}
			aria-roledescription="캐러셀"
			data-slot="guideline-carousel-container"
		>
			<div ref={viewportRef} className={styles.viewport}>
				<div
					className={styles.track}
					style={
						{
							'--carousel-height': `min(${displayHeight}px, calc(100cqw / ${ratios.length ? Math.max(...ratios) : 1}))`,
						} as CSSProperties
					}
				>
					{cards.map((card, index) => (
						<GuidelineCard
							key={card.id}
							backgroundColor={card.backgroundColor}
							foregroundColor={card.foregroundColor}
							className={styles.slide}
							aria-label={`${index + 1} / ${cards.length}`}
							style={
								{
									width:
										navigation === 'labels'
											? '100%'
											: `calc(var(--carousel-height) * ${ratios[index]})`,
									'--display-ratio':
										card.displayAspectRatio ?? card.ratio.replace(':', ' / '),
								} as CSSProperties
							}
						>
							{card.display}
							{card.caption && <GuidelineCardCaption {...card.caption} />}
						</GuidelineCard>
					))}
				</div>
			</div>
			<div
				className="mt-6 flex flex-wrap items-center justify-center gap-3"
				data-slot="guideline-carousel-actions"
			>
				{navigation === 'labels' ? (
					<div
						className="max-w-full overflow-x-auto p-1"
						data-slot="guideline-carousel-selection"
					>
						<div className="mx-auto w-max">
							<GuidelineSelection
								label={`${label} 카드 선택`}
								value={cards[current - 1]?.id ?? ''}
								options={cards.map((card) => ({
									value: card.id,
									label: card.selectionLabel ?? '',
									disabled: !api,
								}))}
								onValueChange={(id) => {
									const index = cards.findIndex((card) => card.id === id)
									if (index < 0) return
									api?.plugins().autoplay?.stop()
									api?.scrollTo(index)
								}}
							/>
						</div>
						<output
							className="sr-only"
							aria-live={playing ? 'off' : 'polite'}
							aria-atomic="true"
						>
							{cards[current - 1]?.selectionLabel ?? '카드 없음'}
						</output>
					</div>
				) : (
					<>
						<Button
							type="button"
							variant="muted"
							shape="pill"
							size="icon-lg"
							className="size-11"
							aria-label="이전 카드"
							disabled={cards.length <= 1 || !canPrev}
							onClick={() => {
								api?.plugins().autoplay?.stop()
								api?.scrollPrev()
							}}
						>
							<ArrowLeft className="size-6" />
						</Button>
						<output
							aria-live={playing ? 'off' : 'polite'}
							aria-atomic="true"
							aria-label="현재 카드"
							className="min-w-19 rounded-full bg-muted px-4 py-2.5 text-center text-base tabular-nums"
						>
							{current} / {cards.length}
						</output>
						<Button
							type="button"
							variant="muted"
							shape="pill"
							size="icon-lg"
							className="size-11"
							aria-label="다음 카드"
							disabled={cards.length <= 1 || !canNext}
							onClick={() => {
								api?.plugins().autoplay?.stop()
								api?.scrollNext()
							}}
						>
							<ArrowRight className="size-6" />
						</Button>
					</>
				)}
				{autoplay && (
					<Button
						type="button"
						variant="muted"
						shape="pill"
						disabled={cards.length <= 1 || !!reducedMotion}
						onClick={() => {
							const player = api?.plugins().autoplay
							if (playing) player?.stop()
							else player?.play()
						}}
					>
						{playing ? '자동 재생 정지' : '자동 재생 시작'}
					</Button>
				)}
			</div>
		</section>
	)
}
