import { describe, expect, it } from 'vitest'
import type { AiUsageBreakdownRow } from './ai-usage-breakdown'
import { AI_USAGE_MODEL_ROW_LIMIT, AI_USAGE_STUDIOS } from './ai-usage-catalog'
import { foldAiUsage } from './ai-usage-fold'

const TODAY = '2026-09-22'

function row(overrides: Partial<AiUsageBreakdownRow> = {}): AiUsageBreakdownRow {
	return {
		cacheReadInputTokens: 0,
		cacheWriteInputTokens: 0,
		callCount: 1,
		dayKey: TODAY,
		feature: 'image-generation',
		inputTokens: 100,
		model: 'gemini-3.1-flash-image',
		outputTokens: 900,
		reasoningTokens: 0,
		studio: 'image',
		totalTokens: 1000,
		userEmail: 'a@example.com',
		userId: 1,
		...overrides,
	}
}

describe('foldAiUsage', () => {
	it('축을 바꿔도 총계가 변하지 않는다', () => {
		const rows = [
			row({ model: 'a', studio: 'image', userId: 1 }),
			row({ feature: 'asset-check', model: 'b', studio: 'review', userId: 2 }),
		]
		const totals = (['user', 'feature', 'studio', 'model'] as const).map(
			(axis) => foldAiUsage(rows, { axis, days: null, todayKey: TODAY }).kpi.totalTokens,
		)

		// 어느 축이든 같은 집합의 분할이라 합이 같아야 한다.
		expect(new Set(totals).size).toBe(1)
		expect(totals[0]).toBe(2000)
	})

	// 🔴 사용자 지시 — 행이 없는 것과 0을 쓴 것은 다른 말이다.
	it('카탈로그가 있는 축은 안 쓴 값도 0행으로 세운다', () => {
		const fold = foldAiUsage([row({ studio: 'image' })], {
			axis: 'studio',
			days: null,
			todayKey: TODAY,
		})

		expect(fold.rows).toHaveLength(AI_USAGE_STUDIOS.length)
		expect(fold.rows[0]?.label).toBe('이미지')
		expect(fold.rows.filter((r) => r.totalTokens === 0)).toHaveLength(
			AI_USAGE_STUDIOS.length - 1,
		)
	})

	it('스튜디오 밖 호출을 버리지 않고 행으로 세운다', () => {
		const fold = foldAiUsage([row({ studio: null, totalTokens: 500 })], {
			axis: 'studio',
			days: null,
			todayKey: TODAY,
		})
		const outside = fold.rows.find((r) => r.key === null)

		expect(outside?.label).toBe('스튜디오 밖')
		expect(outside?.totalTokens).toBe(500)
		expect(fold.kpi.totalTokens).toBe(500)
	})

	// 🔴 지금 화면이 정확히 이 함정이었다 — 보이는 행을 더해 총계를 만들면 자르는 순간 틀린다.
	it('모델 상한에 잘려도 총계는 전량 기준이다', () => {
		const rows = Array.from({ length: AI_USAGE_MODEL_ROW_LIMIT + 7 }, (_, i) =>
			row({ model: `model-${String(i).padStart(2, '0')}`, totalTokens: 100 }),
		)
		const fold = foldAiUsage(rows, { axis: 'model', days: null, todayKey: TODAY })

		expect(fold.rows).toHaveLength(AI_USAGE_MODEL_ROW_LIMIT)
		expect(fold.hiddenRowCount).toBe(7)
		expect(fold.kpi.totalTokens).toBe((AI_USAGE_MODEL_ROW_LIMIT + 7) * 100)
		expect(fold.footerTotal.totalTokens).toBe(fold.kpi.totalTokens)
	})

	it('계정·모델 축은 상한 밖에서 전량을 세운다', () => {
		const fold = foldAiUsage([row({ userId: 1 }), row({ userId: 2 })], {
			axis: 'user',
			days: null,
			todayKey: TODAY,
		})
		expect(fold.hiddenRowCount).toBe(0)
	})

	it('기간 밖 행은 KPI에서 빠지고 직전 구간 비교로만 쓰인다', () => {
		const rows = [
			row({ dayKey: '2026-09-22', totalTokens: 100 }),
			row({ dayKey: '2026-09-18', totalTokens: 200 }), // 7일 안
			row({ dayKey: '2026-09-12', totalTokens: 50 }), // 직전 7일
			row({ dayKey: '2026-08-01', totalTokens: 999 }), // 그보다 앞 — 어디에도 안 들어감
		]
		const fold = foldAiUsage(rows, { axis: 'user', days: 7, todayKey: TODAY })

		expect(fold.kpi.totalTokens).toBe(300)
		expect(fold.previousTotalTokens).toBe(50)
	})

	it('기간이 전체면 비교 대상이 없다', () => {
		const fold = foldAiUsage([row()], { axis: 'user', days: null, todayKey: TODAY })
		expect(fold.previousTotalTokens).toBeNull()
	})

	it('칩은 축을 넘나든다 — 계정으로 좁히고 모델로 접을 수 있다', () => {
		const rows = [
			row({ model: 'a', userId: 1 }),
			row({ model: 'b', userId: 2, totalTokens: 7000 }),
		]
		const fold = foldAiUsage(rows, {
			axis: 'model',
			days: null,
			filters: { user: '1' },
			todayKey: TODAY,
		})

		expect(fold.rows.map((r) => r.key)).toEqual(['a'])
		expect(fold.kpi.totalTokens).toBe(1000)
	})

	it('스튜디오 밖을 none으로 고를 수 있다', () => {
		const rows = [row({ studio: null, totalTokens: 300 }), row({ studio: 'image' })]
		const fold = foldAiUsage(rows, {
			axis: 'user',
			days: null,
			filters: { studio: 'none' },
			todayKey: TODAY,
		})
		expect(fold.kpi.totalTokens).toBe(300)
	})

	it('일자 분포는 날짜 오름차순이고 최대일이 1이다', () => {
		const rows = [
			row({ dayKey: '2026-09-21', totalTokens: 400 }),
			row({ dayKey: '2026-09-22', totalTokens: 800 }),
		]
		const fold = foldAiUsage(rows, { axis: 'user', days: 7, todayKey: TODAY })

		expect(fold.daily.map((d) => d.dayKey)).toEqual(['2026-09-21', '2026-09-22'])
		expect(fold.daily[1]?.share).toBe(1)
		expect(fold.daily[0]?.share).toBe(0.5)
	})

	it('빈 입력에서 나누기를 하지 않는다', () => {
		const fold = foldAiUsage([], { axis: 'model', days: 7, todayKey: TODAY })
		expect(fold.kpi.totalTokens).toBe(0)
		expect(fold.rows).toEqual([])
		expect(fold.daily).toEqual([])
	})
})
