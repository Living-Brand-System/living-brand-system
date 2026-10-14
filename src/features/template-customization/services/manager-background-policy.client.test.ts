import { describe, expect, it } from 'vitest'
import { readBackgroundPolicy, withBackgroundTypes } from './manager-background-policy.client'

describe('배경 허용 형식', () => {
	it('고정 순서로 맞추고, 끈 형식이 처음 형식이면 지운다', () => {
		expect(withBackgroundTypes({ defaultType: 'image' }, ['graphic', 'color'])).toEqual({
			types: ['color', 'graphic'],
			defaultType: undefined,
		})
		expect(withBackgroundTypes({ defaultType: 'graphic' }, ['graphic', 'image'])).toEqual({
			types: ['image', 'graphic'],
			defaultType: 'graphic',
		})
	})

	it('하나도 안 남으면 거부한다', () => {
		expect(withBackgroundTypes({ types: ['color'] }, [])).toBeNull()
	})

	it('배열이 아닌 types는 전부 허용으로 읽는다', () => {
		expect(readBackgroundPolicy({ types: 'color', dimmer: false })).toEqual({
			types: undefined,
			dimmer: false,
		})
		expect(readBackgroundPolicy(null)).toEqual({})
	})
})
