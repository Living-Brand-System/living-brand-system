import Image from 'next/image'
import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { CARD_RATIO_OPTIONS } from '@/features/guideline/cards/displays/ratio'
import { cn } from '@/lib/utils'
import { type GuidelineCaption, GuidelineCardCaption } from './caption'
import styles from './grid.module.css'

export const DISPLAY_WIDTHS = [240, 320, 480, 720, 1440] as const
export const DISPLAY_RATIOS = CARD_RATIO_OPTIONS.map(({ value }) => value)
export type DisplayWidth = (typeof DISPLAY_WIDTHS)[number]
export type DisplayRatio = (typeof DISPLAY_RATIOS)[number]
export type GridColumns = 1 | 2 | 3 | 4 | 5

type CardColors = { backgroundColor?: string; foregroundColor?: string }

export type GuidelineCardData = CardColors & {
	id: string
	selectionLabel?: string
	ratio: DisplayRatio
	/** 배경별 로고 셀처럼 콘텐츠 규격이 정하는 비율입니다. CMS 선택값은 아닙니다. */
	displayAspectRatio?: number
	display: ReactNode
	caption?: GuidelineCaption
}

type GridProps = Omit<ComponentProps<'div'>, 'children'> & {
	cards: readonly GuidelineCardData[]
	displayWidth?: DisplayWidth
	minDisplayWidth?: DisplayWidth
	columns?: GridColumns
}

export function GuidelineGridContainer({
	displayWidth = 480,
	minDisplayWidth,
	cards,
	columns = 3,
	className,
	style,
	...props
}: GridProps) {
	return (
		<div
			{...props}
			data-slot="guideline-grid-container"
			className={cn(styles.grid, minDisplayWidth !== undefined && styles.fluid, className)}
			style={
				{
					...style,
					'--display-width': `${displayWidth}px`,
					'--min-display-width': `${Math.min(minDisplayWidth ?? displayWidth, displayWidth)}px`,
					'--grid-columns': columns,
				} as CSSProperties
			}
		>
			{cards.map((card) => (
				<GuidelineCard
					key={card.id}
					backgroundColor={card.backgroundColor}
					foregroundColor={card.foregroundColor}
					style={
						{
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
	)
}

export function GuidelineCard({
	className,
	backgroundColor,
	foregroundColor,
	style,
	...props
}: ComponentProps<'figure'> & CardColors) {
	return (
		<figure
			{...props}
			data-slot="guideline-card"
			className={cn(styles.card, className)}
			style={
				{
					...style,
					'--guideline-card-background': backgroundColor,
					'--guideline-card-foreground': foregroundColor,
				} as CSSProperties
			}
		/>
	)
}

/** 상속 가능한 텍스트·단색 도형만 품습니다. 액션·가이드·캡션은 이 레이어 밖에 둡니다. */
export function GuidelineDisplayContent({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			{...props}
			data-slot="guideline-display-content"
			className={cn(styles.content, className)}
		/>
	)
}

/** 이미지와 위젯이 공유하는 판형·배경·잘림 영역입니다. */
export function GuidelineDisplayFrame({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			{...props}
			data-slot="guideline-card-display"
			className={cn(styles.display, className)}
		/>
	)
}

type DisplayProps = {
	children?: ReactNode
	src: string
	alt: string
	sizes?: string
	className?: string
} & ({ fit?: 'contain'; scale?: number } | { fit: 'cover'; scale?: never })

export function GuidelineCardDisplay({
	src,
	alt,
	sizes = '(max-width: 480px) 100vw, 480px',
	fit = 'contain',
	scale = 80,
	className,
	children,
}: DisplayProps) {
	const contentScale =
		fit === 'cover'
			? 1
			: (Number.isFinite(scale) ? Math.min(100, Math.max(30, scale)) : 80) / 100
	return (
		<GuidelineDisplayFrame data-fit={fit} className={className}>
			<Image
				src={src}
				alt={alt}
				fill
				sizes={sizes}
				className={styles.image}
				style={{ objectFit: fit, transform: `scale(${contentScale})` }}
			/>
			{children}
		</GuidelineDisplayFrame>
	)
}

export { GuidelineCardCaption } from './caption'
