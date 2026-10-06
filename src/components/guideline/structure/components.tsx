import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { Typography } from '@/components/ui/typography'
import type { SectionDownload } from '@/features/guideline/services/download-section-assets.client'
import { cn } from '@/lib/utils'
import { SectionDownloadButton } from './section-download'
import styles from './structure.module.css'

export function GuidelineDisplayHeading({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<header data-slot="guideline-display-heading" className={styles.displayHeading}>
			<GuidelineDisplayTitle title={title} subtitle={subtitle} />
		</header>
	)
}

/**
 * 표시 제목(display/h1 + 부제) — 문서 첫 화면과 스튜디오 첫 화면 띠(Figma 571:8040)가 같은 크기를 쓴다.
 * 높이·배경은 부르는 쪽이 갖는다.
 */
export function GuidelineDisplayTitle({ title, subtitle }: { title: string; subtitle?: string }) {
	return (
		<>
			<Typography as="h1" weight="semibold" className={styles.displayTitle}>
				{title}
			</Typography>
			{subtitle && (
				<Typography weight="semibold" className={styles.subtitle}>
					{subtitle}
				</Typography>
			)}
		</>
	)
}

type SectionProps = ComponentProps<'section'> & {
	id: string
	hierarchy: 'main' | 'sub'
	variant?: 'incorrect-usages'
}
export function GuidelineSection({ hierarchy, id, variant, className, ...props }: SectionProps) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-heading`}
			data-slot="guideline-section"
			data-hierarchy={hierarchy}
			className={cn(
				styles.section,
				variant === 'incorrect-usages' && [
					styles.incorrectUsages,
					'rounded-3xl bg-destructive/15',
				],
				className,
			)}
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

const HD_KO_LOGO = {
	src: '/brand/hd/ko-horizontal-default.svg',
	alt: 'HD현대',
	width: 623,
	height: 164,
}
type FooterProps = { logo?: { src: string; alt: string; width: number; height: number } }
export function GuidelineDisplayFooter({ logo = HD_KO_LOGO }: FooterProps) {
	return (
		<footer data-slot="guideline-display-footer" className={styles.footer}>
			{/*
			 * 🔑 로고를 글자색(`bg-foreground`)으로 칠하고 모양은 SVG 마스크로 낸다 — 검정 PNG 한 장은
			 *    다크에서 사라졌다. 다크 변형 분기가 아니라 토큰이라 다크 페이지 속 밝은 면에서도 맞는다
			 *    (`logo-on-background-display`의 단색 로고와 같은 방식).
			 */}
			<div
				role="img"
				aria-label={logo.alt}
				className={cn(styles.logo, 'bg-foreground')}
				style={{
					aspectRatio: `${logo.width} / ${logo.height}`,
					maskImage: `url(${logo.src})`,
					maskSize: 'contain',
					maskRepeat: 'no-repeat',
					maskPosition: 'center',
				}}
			/>
		</footer>
	)
}
