import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MyAiUsageCard } from './my-ai-usage-card'

const base = { rows: [], todayKey: '2026-10-06', userId: 2 }
const BLOCKED = /한도에 닿아 새 AI 요청이 막혀 있어요/

describe('MyAiUsageCard 한도', () => {
	afterEach(cleanup)

	it('오늘·이번 달 사용량에 각 기간의 한도를 분모로 붙인다', () => {
		render(
			<MyAiUsageCard
				{...base}
				limitStatus={{
					limits: { daily: 10_000, monthly: 100_000 },
					usage: { daily: 3_213, monthly: 35_036 },
				}}
			/>,
		)

		expect(screen.getByText('오늘').nextElementSibling).toHaveTextContent('3,213 / 10,000')
		expect(screen.getByText('이번 달').nextElementSibling).toHaveTextContent('35,036 / 100,000')
		expect(screen.queryByText(BLOCKED)).toBeNull()
	})

	it('한도에 닿은 기간을 글로 알린다 — 둘 다 닿으면 풀리지 않는 쪽(이번 달)', () => {
		render(
			<MyAiUsageCard
				{...base}
				limitStatus={{
					limits: { daily: 10_000, monthly: 20_000 },
					usage: { daily: 12_000, monthly: 20_500 },
				}}
			/>,
		)

		expect(screen.getByRole('status')).toHaveTextContent('이번 달 한도에 닿아')
	})

	it('한도 없음이면 분모 대신 「한도 없음」을 쓰고 막혔다고 하지 않는다', () => {
		render(
			<MyAiUsageCard
				{...base}
				limitStatus={{
					limits: { daily: null, monthly: null },
					usage: { daily: 50_000, monthly: 900_000 },
				}}
			/>,
		)

		expect(screen.getByText('오늘').nextElementSibling).toHaveTextContent('50,000 · 한도 없음')
		expect(screen.queryByText(BLOCKED)).toBeNull()
	})
})
