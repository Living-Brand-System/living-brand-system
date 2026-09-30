import type { CSSProperties } from 'react'
import { GuidelineControllerScope } from '@/features/guideline/providers/guideline-controller-provider'
import { cn } from '@/lib/utils'
import { cardControllerFor } from '../../controllers/registry'
import type { CardData } from '../../domain/contract/display'
import { CardActions, CardActionsProvider } from '../actions'
import { CARD_RATIO_CLASS } from '../displays/ratio'
import { displayDefinition } from '../displays/registry'
import { DisplayCaption } from './caption/display-caption'
import { CardDisplay } from './displays/card-display'
import { CardMark } from './mark'

/** 카드 프레임·표본·표식·캡션을 조합한다. 조작 상태는 카드별로 격리한다. */
export function GuidelineCard({
	card,
	panelClassName,
	className,
}: {
	card: CardData
	panelClassName?: string
	className?: string
}) {
	const display = card.display?.[0]
	if (
		!display ||
		display.blockType === 'typeScrambleWidget' ||
		display.blockType === 'logoColorVariantWidget'
	)
		return null
	const definition = displayDefinition(display.blockType)
	const cardRatio = definition.ratio ?? card.ratio ?? '16:9'
	const [width, height] = cardRatio.split(':').map(Number)
	const controller = cardControllerFor(display)
	const content = (
		<figure
			className={cn('relative flex w-full min-w-0 flex-col self-start md:w-min', className)}
		>
			<div
				style={{ '--card-ratio': width / height } as CSSProperties}
				className={cn(
					'relative w-full overflow-clip rounded-3xl bg-muted md:w-auto',
					CARD_RATIO_CLASS[cardRatio],
					panelClassName,
					className,
				)}
			>
				<CardDisplay
					display={display}
					title={card.caption?.title}
					controllerLabel={controller?.manifest.id}
				/>
				<CardMark mark={card.mark} />
				<CardActions />
			</div>
			<DisplayCaption caption={card.caption} display={display} />
		</figure>
	)
	const cardContent = definition.downloads?.length ? (
		<CardActionsProvider formats={definition.downloads}>{content}</CardActionsProvider>
	) : (
		content
	)
	return controller ? (
		<GuidelineControllerScope {...controller}>{cardContent}</GuidelineControllerScope>
	) : (
		cardContent
	)
}
