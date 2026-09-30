import { GuidelineSection } from '@/components/guideline/deprecated/sections/guideline-section'
import { SectionContents } from '@/components/guideline/deprecated/sections/section-contents'
import { SectionHeadings } from '@/components/guideline/deprecated/sections/section-headings'
import type { BaseBlock } from '@/payload-types'
import { prepareCards } from './prepare-cards'

export type CardBlockData = Pick<
	BaseBlock,
	'title' | 'description' | 'layout' | 'rowHeight' | 'columns' | 'cards'
>

/** CMS의 네 블록 종류를 같은 화면 섹션으로 연결하는 어댑터. */
export function CardBlock({
	block,
	title = block.title,
	id,
}: {
	block: CardBlockData
	title?: string | null
	id?: string
}) {
	const cards = prepareCards(block.cards ?? [])
	const heading = title?.trim() || null
	if (!heading && !block.description && !cards.length) return null
	return (
		<GuidelineSection id={id} carousel={block.layout === 'carousel'}>
			<SectionHeadings title={heading} description={block.description} />
			<SectionContents
				cards={cards}
				layout={block.layout}
				rowHeight={block.rowHeight}
				columns={block.columns}
				label={heading ?? undefined}
			/>
		</GuidelineSection>
	)
}
