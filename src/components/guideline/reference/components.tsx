import { cva } from 'class-variance-authority'
import Image from 'next/image'
import type { ComponentProps, ReactNode } from 'react'
import { Typography } from '@/components/ui/typography'
import type { CardData } from '@/features/guideline/domain/contract/display'
import { cn } from '@/lib/utils'
import styles from './reference.module.css'

export function ReferencePage({ className, ...props }: ComponentProps<'main'>) {
	return <main data-slot="reference-page" className={cn(styles.page, className)} {...props} />
}

export function ReferenceHeader({ title, description }: { title: string; description: string }) {
	return (
		<header data-slot="reference-header" className={styles.header}>
			<Typography as="h1" weight="semibold" className={styles.title}>
				{title}
			</Typography>
			<Typography weight="medium" className={styles.subtitle}>
				{description}
			</Typography>
		</header>
	)
}

const headingVariants = cva('', {
	variants: { align: { center: styles.centerHeading, start: styles.startHeading } },
	defaultVariants: { align: 'start' },
})
type ReferenceSectionProps = ComponentProps<'section'> & {
	title: string
	description: string
	align?: 'center' | 'start'
}
export function ReferenceSection({
	title,
	description,
	align = 'start',
	children,
	className,
	id,
	...props
}: ReferenceSectionProps) {
	return (
		<section
			id={id}
			aria-labelledby={id ? `${id}-title` : undefined}
			data-slot="reference-section"
			className={cn(styles.section, className)}
			{...props}
		>
			<div data-slot="reference-section-heading" className={headingVariants({ align })}>
				<Typography id={id ? `${id}-title` : undefined} as="h2" weight="semibold">
					{title}
				</Typography>
				<Typography weight="medium">{description}</Typography>
			</div>
			{children}
		</section>
	)
}

type ReferenceGridProps = ComponentProps<'section'> & {
	columns?: 1 | 2 | 3
	layout?: 'grid' | 'carousel'
}
export function ReferenceGrid({
	columns = 3,
	layout = 'grid',
	className,
	...props
}: ReferenceGridProps) {
	return (
		<section
			data-slot="reference-grid"
			data-columns={columns}
			data-layout={layout}
			tabIndex={layout === 'carousel' ? 0 : undefined}
			aria-label={layout === 'carousel' ? '카드 목록, 좌우 방향키로 스크롤' : '카드 목록'}
			className={cn(styles.grid, className)}
			{...props}
		/>
	)
}

type ReferenceCardProps = ComponentProps<'figure'> & {
	caption?: { title?: string; description?: string }
	ratio?: CardData['ratio']
	mark?: CardData['mark']
	captionPlacement?: 'below' | 'overlay'
}
const markVariants = cva(styles.mark, {
	variants: {
		mark: {
			none: '',
			do: 'text-success',
			ok: 'text-muted-foreground',
			dont: 'text-destructive',
		},
	},
})
const MARK_LABELS = { do: '✓ Do', ok: '△ OK', dont: '✕ Don’t' }
export function ReferenceCard({
	caption,
	ratio = '1:1',
	mark = 'none',
	captionPlacement = 'below',
	children,
	className,
	...props
}: ReferenceCardProps) {
	return (
		<figure
			data-slot="reference-card"
			data-caption={captionPlacement}
			className={cn(styles.card, className)}
			{...props}
		>
			<div data-slot="reference-card-surface" data-ratio={ratio} className={styles.surface}>
				{children}
				{mark && mark !== 'none' && (
					<span className={markVariants({ mark })}>{MARK_LABELS[mark]}</span>
				)}
			</div>
			{(caption?.title || caption?.description) && (
				<figcaption data-slot="reference-caption" className={styles.caption}>
					{caption.title && <Typography weight="semibold">{caption.title}</Typography>}
					{caption.description && (
						<Typography weight="medium">{caption.description}</Typography>
					)}
				</figcaption>
			)}
		</figure>
	)
}

type ReferenceImageProps = {
	src: string
	alt: string
	width: number
	height: number
	scale?: 'hero' | 'diagram' | 'small'
}
export function ReferenceImage({ scale = 'diagram', ...props }: ReferenceImageProps) {
	return (
		<div data-slot="reference-display" data-scale={scale} className={styles.display}>
			<Image {...props} sizes="(max-width: 767px) 90vw, 800px" />
		</div>
	)
}

export function ReferencePendingDisplay() {
	return (
		<div data-slot="reference-display" className={styles.display}>
			<Typography size="sm" tone="muted">
				도판 준비 중
			</Typography>
		</div>
	)
}

export function ReferenceFooter({ children }: { children?: ReactNode }) {
	return (
		<footer data-slot="reference-footer" className={styles.footer}>
			<Image src="/guideline/reference/footer.png" alt="HD현대" width={623} height={164} />
			{children}
		</footer>
	)
}
