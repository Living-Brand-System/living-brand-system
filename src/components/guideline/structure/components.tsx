import { cva } from 'class-variance-authority'
import Image from 'next/image'
import type { ComponentProps } from 'react'
import { Typography } from '@/components/ui/typography'
import type { SectionDownload } from '@/features/guideline/services/download-section-assets.client'
import { cn } from '@/lib/utils'
import { SectionDownloadButton } from './section-download'
import styles from './structure.module.css'

export function GuidelineDisplayHeading({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<header data-slot="guideline-display-heading" className={styles.displayHeading}>
			<Typography as="h1" weight="semibold" className={styles.displayTitle}>
				{title}
			</Typography>
			{subtitle && (
				<Typography weight="semibold" className={styles.subtitle}>
					{subtitle}
				</Typography>
			)}
		</header>
	)
}

type SectionProps = ComponentProps<'section'> & { id: string; hierarchy: 'main' | 'sub' }
export function GuidelineSection({ hierarchy, id, className, ...props }: SectionProps) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-heading`}
			data-slot="guideline-section"
			data-hierarchy={hierarchy}
			className={cn(styles.section, className)}
			{...props}
		/>
	)
}
const headingVariants = cva(styles.heading, {
	variants: {
		align: { start: styles.start, center: styles.center },
		hierarchy: { main: styles.main, sub: styles.sub },
	},
	defaultVariants: { align: 'start', hierarchy: 'main' },
})
type SectionHeadingProps = {
	id: string
	hierarchy: 'main' | 'sub'
	title: string
	description?: string
	align?: 'start' | 'center'
	download?: SectionDownload
}
export function GuidelineSectionHeading({
	id,
	hierarchy,
	title,
	description,
	align = 'start',
	download,
}: SectionHeadingProps) {
	return (
		<header
			data-slot="guideline-section-heading"
			data-align={align}
			data-hierarchy={hierarchy}
			className={headingVariants({ align, hierarchy })}
		>
			<div className={styles.headingText}>
				<Typography
					id={id}
					as={hierarchy === 'main' ? 'h2' : 'h3'}
					weight="semibold"
					className={styles.sectionTitle}
				>
					{title}
				</Typography>
				{description && (
					<Typography weight="semibold" className={styles.description}>
						{description}
					</Typography>
				)}
			</div>
			{download && download.assets.length > 0 && (
				<SectionDownloadButton download={download} title={title} />
			)}
		</header>
	)
}

type FooterProps = { logo: { src: string; alt: string; width: number; height: number } }
export function GuidelineDisplayFooter({ logo }: FooterProps) {
	return (
		<footer data-slot="guideline-display-footer" className={styles.footer}>
			<Image {...logo} className={styles.logo} />
		</footer>
	)
}
