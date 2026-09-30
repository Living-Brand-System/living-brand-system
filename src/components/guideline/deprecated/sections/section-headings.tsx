import { GuidelineDescription } from '@/components/guideline/deprecated/typography/guideline-description'
import { GuidelineHeader } from '@/components/guideline/deprecated/typography/guideline-header'
import { ContentFrame } from '@/components/shared/content-frame'
import type { SectionBlock } from '@/payload-types'

export function SectionHeadings({
	title,
	description,
}: {
	title?: string | null
	description?: SectionBlock['description']
}) {
	if (!title && !description) return null
	return (
		<ContentFrame variant="heading" className="mx-auto max-w-[1540px]">
			<div data-slot="section-headings" className="flex flex-col gap-8">
				<GuidelineHeader variant="section" title={title} />
				<GuidelineDescription description={description} className="max-w-[767px]" />
			</div>
		</ContentFrame>
	)
}
