'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { GuidelineCardCaption } from './caption'
import { GuidelineCard, type GuidelineCardData } from './grid'
import styles from './sticky.module.css'

type StickyProps = {
	cards: readonly GuidelineCardData[]
	mode?: 'individual' | 'switch'
	top?: number
}

/** 카드가 설명·도판을 소유하고, 컨테이너가 고정 위치와 활성 카드를 결정합니다. */
export function GuidelineStickyContainer({ cards, mode = 'switch', top = 32 }: StickyProps) {
	const rootRef = useRef<HTMLDivElement>(null)
	const [active, setActive] = useState(0)
	const offset = Number.isFinite(top) ? Math.max(0, top) : 32
	useEffect(() => {
		const root = rootRef.current
		if (!root || mode !== 'switch' || cards.length === 0) return
		let frame = 0
		const update = () => {
			frame = 0
			const items = [...root.querySelectorAll<HTMLElement>('[data-slot="guideline-card"]')]
			let index = 0
			for (let i = 0; i < items.length; i++) {
				if (items[i].getBoundingClientRect().top <= offset) index = i
			}
			setActive(index)
		}
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update)
		}
		const observer = new ResizeObserver(schedule)
		observer.observe(root)
		for (const item of root.querySelectorAll('[data-slot="guideline-card"]'))
			observer.observe(item)
		window.addEventListener('scroll', schedule, { passive: true, capture: true })
		window.addEventListener('resize', schedule)
		update()
		return () => {
			observer.disconnect()
			window.removeEventListener('scroll', schedule, true)
			window.removeEventListener('resize', schedule)
			cancelAnimationFrame(frame)
		}
	}, [cards, mode, offset])
	const current = cards[Math.min(active, cards.length - 1)]
	return (
		<div
			ref={rootRef}
			data-slot="guideline-sticky-container"
			data-mode={mode}
			className={styles.container}
			style={{ '--sticky-top': `${offset}px` } as CSSProperties}
		>
			<div className={styles.layout}>
				{mode === 'switch' && current && (
					<figure
						className={styles.sharedRail}
						aria-hidden="true"
						data-active-card={current.id}
					>
						{current.caption && <GuidelineCardCaption {...current.caption} />}
					</figure>
				)}
				<div className={styles.cards}>
					{cards.map((card) => (
						<GuidelineCard
							key={card.id}
							backgroundColor={card.backgroundColor}
							foregroundColor={card.foregroundColor}
							className={styles.card}
							aria-label={card.caption?.title}
							style={
								{
									'--display-ratio':
										card.displayAspectRatio ?? card.ratio.replace(':', ' / '),
								} as CSSProperties
							}
						>
							{card.caption && (
								<GuidelineCardCaption
									{...card.caption}
									className={styles.caption}
								/>
							)}
							<div className={styles.display}>{card.display}</div>
						</GuidelineCard>
					))}
				</div>
			</div>
		</div>
	)
}
