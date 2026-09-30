import type { BaseBlock } from '@/payload-types'

export type CardData = NonNullable<BaseBlock['cards']>[number]
export type DisplayData = NonNullable<CardData['display']>[number]
