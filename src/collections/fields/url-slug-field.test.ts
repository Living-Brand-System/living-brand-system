import { describe, expect, it } from 'vitest'
import { toUrlSlug } from './url-slug-field'

describe('toUrlSlug', () => {
	it('영문 이름을 주소로 바꾼다', () => {
		expect(toUrlSlug('Instagram Post (Layout B)')).toBe('instagram-post-layout-b')
	})

	it('복제의 「 - Copy」는 하이픈 하나로 접는다', () => {
		expect(toUrlSlug('poster - Copy')).toBe('poster-copy')
	})

	it('한글만 있으면 빈 값 — 사람이 직접 넣은 slug를 쓰게 한다', () => {
		expect(toUrlSlug('환영 카드')).toBe('')
	})
})
