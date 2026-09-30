import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import type { RowHeight } from '@/features/guideline/blocks/fields'
import { GuidelineCard } from '@/features/guideline/cards/deprecated/component'
import type { CardData } from '@/features/guideline/domain/contract/display'
import { CARD_ROW_HEIGHT } from './row-height'

export function CarouselContainer({
	cards,
	rowHeight,
	label,
}: {
	cards: CardData[]
	rowHeight: RowHeight
	label?: string
}) {
	return (
		<Carousel
			opts={{ align: 'start' }}
			aria-label={label}
			tabIndex={0}
			className="outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<CarouselContent viewportClassName="overflow-visible">
				{cards.map((card) => (
					<CarouselItem key={card.id} className="md:basis-auto">
						<GuidelineCard card={card} panelClassName={CARD_ROW_HEIGHT[rowHeight]} />
					</CarouselItem>
				))}
			</CarouselContent>
		</Carousel>
	)
}
