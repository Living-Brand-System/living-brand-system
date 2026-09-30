import { ContentHeading } from '@/components/shared/content-heading'
import { GUIDELINE_TYPOGRAPHY } from './guideline-typography'
import type { GuidelineVariant } from './guideline-variant'

const HEADER_STYLE = {
	topic: { level: 1, ...GUIDELINE_TYPOGRAPHY.topicTitle },
	section: { level: 2, ...GUIDELINE_TYPOGRAPHY.blockTitle },
} as const

export function GuidelineHeader({
	title,
	variant,
	className,
}: {
	title?: string | null
	variant: GuidelineVariant
	className?: string
}) {
	if (!title) return null
	const style = HEADER_STYLE[variant]

	return (
		<ContentHeading
			title={title}
			level={style.level}
			size={style.size}
			weight={style.weight}
			className={className}
			titleClassName={style.className}
		/>
	)
}
