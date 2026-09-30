import { describe, expect, it } from 'vitest'
import { PLAYGROUND_DEFAULTS, readPlaygroundSettings } from './settings'

describe('playground settings', () => {
	it('accepts supported viewport, layout, count and ratio values', () => {
		const settings = {
			width: '365',
			layout: 'carousel',
			columns: '4',
			count: '5',
			ratio: '9:16',
		}
		expect(readPlaygroundSettings(settings)).toEqual(settings)
	})
	it('bounds arbitrary and repeated query values to defaults', () => {
		expect(
			readPlaygroundSettings({
				width: '999999',
				count: '-1',
				columns: ['1', '4'],
				ratio: '0:0',
				layout: 'other',
			}),
		).toEqual(PLAYGROUND_DEFAULTS)
	})
})
