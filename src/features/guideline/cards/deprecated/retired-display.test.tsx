import { cleanup, render } from '@testing-library/react'
import type { BlocksField } from 'payload'
import { afterEach, expect, it } from 'vitest'
import type { CardData } from '@/features/guideline/domain/contract/display'
import { prepareCards } from '../../blocks/prepare-cards'
import { DISPLAYS } from '../displays/registry'
import { cardFields } from '../schema'
import { GuidelineCard } from './component'

afterEach(cleanup)
const displays: NonNullable<CardData['display']> = [
	{ blockType: 'typeScrambleWidget' },
	{ blockType: 'logoColorVariantWidget', logo: 1 },
]
it.each(displays)('retired $blockType leaves no active definition or empty card', (display) => {
	const retired: CardData = { id: 'retired', ratio: '1:1', display: [display] }
	expect(DISPLAYS.some((entry) => String(entry.id) === display.blockType)).toBe(false)
	expect(prepareCards([retired])).toEqual([])
	expect(render(<GuidelineCard card={retired} />).container).toBeEmptyDOMElement()
})
it.each(
	displays,
)('retired $blockType is excluded from new cards while old documents remain saveable', (display) => {
	const field = cardFields().find(
		(field) => 'name' in field && field.name === 'display',
	) as BlocksField
	const options = field.filterOptions
	if (typeof options !== 'function') throw new Error('Missing retirement filter')
	expect(options({ siblingData: { display: [] } } as never)).not.toContain(display.blockType)
	expect(options({ siblingData: { display: [display] } } as never)).toContain(display.blockType)
	expect(field.blocks.some((block) => block.slug === display.blockType)).toBe(true)
})
