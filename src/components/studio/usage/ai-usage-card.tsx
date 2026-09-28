import { Controller } from '@/components/shared/controller'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Typography } from '@/components/ui/typography'
import type { AiUsageBreakdownRow } from '@/modules/ai-usage/ai-usage-breakdown'
import { AI_USAGE_AXES, AI_USAGE_PERIODS } from '@/modules/ai-usage/ai-usage-catalog'
import { foldAiUsage } from '@/modules/ai-usage/ai-usage-fold'
import {
	type AiUsageQuery,
	aiUsageAxisHref,
	aiUsagePeriodHref,
} from '@/modules/ai-usage/ai-usage-query'
import { AiUsageBreakdownTable } from './ai-usage-breakdown-table'
import { AiUsageDailyStrip } from './ai-usage-daily-strip'
import { AiUsageFilterChips } from './ai-usage-filter-chips'
import { AiUsageKpis } from './ai-usage-kpis'
import { AiUsageSegment } from './ai-usage-segment'

/**
 * 사용량 — 기간 하나, 축 하나, 표 하나.
 *
 * 🔑 상태가 전부 URL에 있어서 여기에 클라이언트 state가 없다(세그먼트의 링크만 client다).
 *    그래서 새로고침·링크 공유에 안 날아가고, 축을 바꿔도 기간과 필터가 유지된다.
 * 🔴 「날짜」는 축이 아니다 — 다른 축과 배타로 고르는 것이 아니라 언제나 켜져 있는 분포라,
 *    축 세그먼트가 아니라 상시 일자 스트립이 맡는다.
 * 🔑 표면은 계정 화면의 다른 카드와 같은 컨트롤러 킷이다 — 여기서 카드를 새로 만들지 않는다.
 */
export function AiUsageCard({
	canSeeEveryone,
	query,
	rows,
	todayKey,
}: {
	canSeeEveryone: boolean
	query: AiUsageQuery
	rows: AiUsageBreakdownRow[]
	todayKey: string
}) {
	// 자기 것만 보는 사람에게 「계정」 축은 한 줄짜리 표라 뜻이 없다.
	const axes = canSeeEveryone ? AI_USAGE_AXES : AI_USAGE_AXES.filter((a) => a.value !== 'user')
	const axis = axes.some((a) => a.value === query.axis) ? query.axis : 'feature'
	const fold = foldAiUsage(rows, { ...query, axis, todayKey })

	// 계정 id는 그 자체로 못 읽는다 — 칩에 쓸 이름을 원본에서 찾아 준다.
	const filteredEmail = rows.find((row) => String(row.userId) === query.filters.user)?.userEmail

	return (
		<Controller.Root className="gap-3 px-3 pt-6 pb-3 lg:h-auto">
			<header className="flex flex-col gap-1 px-2">
				<Typography as="h2" size="2xl" weight="medium">
					사용량
				</Typography>
				<Typography size="sm" tone="muted">
					{canSeeEveryone
						? '모든 계정이 AI에 쓴 토큰입니다.'
						: '내가 AI에 쓴 토큰입니다.'}
				</Typography>
			</header>

			<div className="flex flex-col gap-4 px-2 pb-2">
				{/* 🔴 기간은 축보다 물리적으로 위다 — 축 안에 든 것처럼 읽히면 안 된다. */}
				<div className="flex flex-wrap items-center justify-between gap-3">
					<AiUsageSegment
						ariaLabel="기간"
						options={AI_USAGE_PERIODS.map((period) => ({
							href: aiUsagePeriodHref(query, period.value),
							label: period.label,
							value: period.value,
						}))}
						value={query.period}
					/>
					<AiUsageFilterChips labels={{ user: filteredEmail }} query={query} />
				</div>

				<AiUsageKpis fold={fold} />
				<AiUsageDailyStrip days={fold.daily} />

				<div className="flex flex-col gap-3">
					<AiUsageSegment
						ariaLabel="분해 축"
						options={axes.map((option) => ({
							href: aiUsageAxisHref(query, option.value),
							label: option.label,
							value: option.value,
						}))}
						value={axis}
					/>
					{fold.rows.length > 0 ? (
						<AiUsageBreakdownTable axis={axis} fold={fold} query={query} />
					) : (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>이 조건에 해당하는 기록이 없습니다</EmptyTitle>
								<EmptyDescription>
									기간을 넓히거나 필터를 해제해 보세요.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</div>
			</div>
		</Controller.Root>
	)
}
