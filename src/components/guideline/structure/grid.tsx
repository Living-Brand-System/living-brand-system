import Image from 'next/image'
import Link from 'next/link'
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
	/** 카드 전체가 이 주소로 가는 링크다(가이드라인 첫 화면의 토픽 카드). 판 안의 액션과 함께 두지 않는다. */
	href?: string
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
			{cards.map((card) => {
				const figure = (
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
				)
				return card.href ? (
					<Link
						key={card.id}
						href={card.href}
						className={cn(styles.card, styles.cardLink)}
					>
						{figure}
					</Link>
				) : (
					figure
				)
			})}
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

/**
 * 이미지와 위젯이 공유하는 판형·배경·잘림 영역입니다.
 *
 * 🔑 도판은 **브랜드 면**이라 앱 테마를 따르지 않는다 — 항상 라이트 토큰 범위다(docs/11 §8, 2026-10-06).
 *    표본(브랜드 색 락업·밝은 배경이 구워진 이미지)은 밝은 면을 전제로 설계돼, 다크에서 판이 어두워지면
 *    안 보이거나 띠가 생겼다. `light`가 판 안의 토큰(배경·글자·액션·위젯 UI)을 라이트 값으로 되돌리고,
 *    글자색은 계산값으로 상속되므로 `text-foreground`로 다시 잡는다. 카드 밑 캡션(판 밖)은 테마를 따른다.
 */
export function GuidelineDisplayFrame({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			{...props}
			data-slot="guideline-card-display"
			className={cn('light text-foreground', styles.display, className)}
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
