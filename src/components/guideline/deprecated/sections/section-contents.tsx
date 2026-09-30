import { ContentFrame } from '@/components/shared/content-frame'
import type { RowHeight } from '@/features/guideline/blocks/fields'
import type { CardData } from '@/features/guideline/domain/contract/display'
import type { BaseBlock } from '@/payload-types'
import { CarouselContainer } from './carousel-container'
import { GridContainer } from './grid-container'

/** 콘텐츠 폭 프레임 안에서 배치 방식을 선택한다. */
export function SectionContents({
	cards,
	layout,
	rowHeight = 'medium',
	columns,
	label,
}: {
	cards: CardData[]
	layout?: 'grid' | 'carousel' | null
	rowHeight?: RowHeight | null
	columns?: BaseBlock['columns']
	label?: string
}) {
	if (!cards.length) return null
	const height = rowHeight ?? 'medium'
	return (
		<ContentFrame className={layout === 'carousel' ? undefined : 'max-w-[1200px]'}>
			{layout === 'carousel' ? (
				<CarouselContainer cards={cards} rowHeight={height} label={label} />
			) : (
				<GridContainer cards={cards} columns={columns} />
			)}
		</ContentFrame>
	)
}
