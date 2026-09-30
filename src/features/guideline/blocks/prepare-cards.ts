import type { CardData } from '@/features/guideline/domain/contract/display'
import { LANGUAGES } from '../cards/displays/dynamics/brand-typeface'

/** CMS 데이터를 변경하지 않고 언어 비교를 독립적으로 조작할 카드로 펼친다. */
export function prepareCards(cards: CardData[]) {
	return cards.flatMap<CardData>((card, index) => {
		const display = card.display?.[0]
		if (
			!display ||
			display.blockType === 'typeScrambleWidget' ||
			display.blockType === 'logoColorVariantWidget'
		)
			return []
		if (display.blockType !== 'typeLanguageWidget' || display.layout !== 'compare')
			return [card]
		return LANGUAGES.map(({ key }) => ({
			...card,
			id: `${card.id ?? index}-${key}`,
			display: [{ ...display, layout: 'single', initialLanguage: key }],
		}))
	})
}
