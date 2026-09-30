import { describe, expect, it } from 'vitest'
import { IMAGE_RATIO_OPTIONS } from './image-ratio'

// 비율 어휘의 순서는 admin 선택기 순서다. 카드 규격 비율(cards/displays/ratio.ts)도 여기서 파생된다.
describe('IMAGE_RATIO_OPTIONS', () => {
	it('공용 비율 목록과 순서를 유지한다', () => {
		expect(IMAGE_RATIO_OPTIONS.map(({ value }) => value)).toEqual([
			'original',
			'1:1',
			'5:4',
			'4:3',
			'3:2',
			'16:9',
			'2:1',
			'7:3',
			'4:5',
			'3:4',
			'2:3',
			'9:16',
		])
	})
})
