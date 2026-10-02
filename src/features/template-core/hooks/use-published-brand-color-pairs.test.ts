import { describe, expect, it } from 'vitest'
import type { BrandColorPair } from '@/payload-types'
import { toBrandColorPairSwatches } from './use-published-brand-color-pairs'

const color = (id: number, hex: string) => ({ id, hex }) as BrandColorPair['background']

describe('toBrandColorPairSwatches', () => {
	it('두 색이 모두 해석된 조합만 소문자 hex 스와치로 만든다', () => {
		const pairs = [
			{
				id: 1,
				name: 'Eco on Deep',
				background: color(7, '#00280A'),
				foreground: color(1, '73D75A'),
			},
			// 관계가 id로만 오면(색이 발행되지 않음) 고를 수 없다.
			{ id: 2, name: 'Unresolved', background: 3, foreground: color(1, '#73D75A') },
			{
				id: 3,
				name: 'Bad hex',
				background: color(8, 'nope'),
				foreground: color(1, '#73D75A'),
			},
		] as BrandColorPair[]

		expect(toBrandColorPairSwatches(pairs)).toEqual([
			{ id: 'pair-1', label: 'Eco on Deep', background: '#00280a', foreground: '#73d75a' },
		])
	})
})
