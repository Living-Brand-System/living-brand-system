import { describe, expect, it } from 'vitest'
import {
	aiUsageAxisHref,
	aiUsageClearAllFiltersHref,
	aiUsageClearFilterHref,
	aiUsageFilterHref,
	aiUsagePeriodHref,
	parseAiUsageQuery,
} from './ai-usage-query'

describe('parseAiUsageQuery', () => {
	it('아무것도 없으면 계정 축·30일이다', () => {
		const query = parseAiUsageQuery({})
		expect(query).toMatchObject({ axis: 'user', days: 30, period: '30', showAllRows: false })
		expect(query.filters).toEqual({})
	})

	// 🔴 주소창은 사용자가 손댈 수 있는 입력이다 — 믿고 쓰면 화면이 깨진다.
	it('모르는 값은 조용히 기본값으로 떨어진다', () => {
		expect(parseAiUsageQuery({ by: 'nope', days: '999' })).toMatchObject({
			axis: 'user',
			period: '30',
		})
	})

	it('전체 기간은 days가 null이다', () => {
		expect(parseAiUsageQuery({ days: 'all' }).days).toBeNull()
	})

	it('빈 문자열 필터는 칩으로 치지 않는다', () => {
		expect(parseAiUsageQuery({ model: '', user: '3' }).filters).toEqual({ user: '3' })
	})

	it('배열로 온 중복 파라미터는 첫 값만 쓴다', () => {
		expect(parseAiUsageQuery({ by: ['model', 'user'] }).axis).toBe('model')
	})
})

describe('aiUsage href', () => {
	const base = parseAiUsageQuery({ by: 'model', days: '7', user: '3' })

	it('기본값은 주소에 안 싣는다', () => {
		// 🔴 빈 문자열이면 `href=""`가 되어 **지금 주소**로 해석된다 — 기본값으로 돌아가는 링크가
		//    아무 일도 안 하는 결함이 실제로 있었다(30일 버튼이 안 눌렸다).
		expect(aiUsagePeriodHref(parseAiUsageQuery({}), '30')).toBe('?')
		expect(aiUsagePeriodHref(parseAiUsageQuery({ days: '7' }), '30')).toBe('?')
	})

	// 🔴 이 설계에서 기간이 안 날아가는 것이 탭을 안 만든 유일한 이유다.
	it('축을 바꿔도 기간과 칩이 따라간다', () => {
		const href = aiUsageAxisHref(base, 'feature')
		expect(href).toContain('days=7')
		expect(href).toContain('user=3')
		expect(href).toContain('by=feature')
	})

	it('축을 바꾸면 더 보기는 버린다', () => {
		const expanded = parseAiUsageQuery({ by: 'model', limit: 'all' })
		expect(aiUsageAxisHref(expanded, 'user')).not.toContain('limit')
	})

	it('기간을 바꿔도 축과 칩이 따라간다', () => {
		const href = aiUsagePeriodHref(base, 'all')
		expect(href).toContain('by=model')
		expect(href).toContain('user=3')
		expect(href).toContain('days=all')
	})

	it('스튜디오 밖은 none이라는 값으로 고른다', () => {
		expect(aiUsageFilterHref(base, 'studio', null)).toContain('studio=none')
	})

	it('칩은 하나씩 떼거나 통째로 지운다', () => {
		const two = parseAiUsageQuery({ feature: 'asset-check', user: '3' })
		expect(aiUsageClearFilterHref(two, 'user')).not.toContain('user=')
		expect(aiUsageClearFilterHref(two, 'user')).toContain('feature=asset-check')
		expect(aiUsageClearAllFiltersHref(two)).toBe('?')
	})

	it('주소를 되읽으면 같은 상태가 나온다', () => {
		const href = aiUsageFilterHref(base, 'model', 'gpt-image-2')
		const params = Object.fromEntries(new URLSearchParams(href.slice(1)))
		expect(parseAiUsageQuery(params)).toMatchObject({
			axis: 'model',
			days: 7,
			filters: { model: 'gpt-image-2', user: '3' },
		})
	})
})
