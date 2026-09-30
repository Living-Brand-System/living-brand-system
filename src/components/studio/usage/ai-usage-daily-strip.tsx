import { Typography } from '@/components/ui/typography'
import type { AiUsageDay } from '@/modules/ai-usage/ai-usage-fold'
import { formatTokens } from './ai-usage-format'

/** 스트립에 그리는 최대 일수 — 기간이 「전체」여도 막대가 실처럼 얇아지지 않게 자른다. */
const MAX_BARS = 30

/**
 * 날짜 분포. 🔑 **날짜를 축 세그먼트에 넣지 않은 이유가 이 자리다** — 날짜는 다른 축과 배타로
 * 고르는 것이 아니라 언제나 켜져 있는 시간 분포라서, 축을 무엇으로 바꾸든 같은 자리에 남는다.
 *
 * 🔴 차트 라이브러리를 넣지 않는다. 막대 30개에 recharts는 순수 비용이고, 폭·높이는 런타임
 *    기하값이라 inline style이 허용된다(docs/10 §8).
 * 🔴 막대는 `aria-hidden`이고 같은 숫자를 sr-only 목록으로 준다 — 색·길이만으로 뜻을 전하지 않는다.
 */
export function AiUsageDailyStrip({ days }: { days: AiUsageDay[] }) {
	const shown = days.slice(-MAX_BARS)
	if (shown.length === 0) return null

	const first = shown[0]?.dayKey
	const last = shown.at(-1)?.dayKey

	return (
		<div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2">
			<div className="flex items-baseline justify-between">
				<Typography as="h2" className="text-muted-foreground" size="xs" weight="medium">
					일자별 사용량
				</Typography>
				<Typography as="p" className="text-muted-foreground tabular-nums" size="xs">
					{first} — {last}
				</Typography>
			</div>
			<div aria-hidden className="flex h-24 items-end gap-1">
				{shown.map((day) => (
					<div
						className="flex-1 rounded-sm bg-chart-1/40"
						key={day.dayKey}
						// 0인 날도 흔적을 남긴다 — 사라지면 그날이 없는 것처럼 보인다.
						style={{ height: `${Math.max(day.share * 100, 2)}%` }}
					/>
				))}
			</div>
			<ul className="sr-only">
				{shown.map((day) => (
					<li key={day.dayKey}>
						{day.dayKey}: {formatTokens(day.totalTokens)} 토큰
					</li>
				))}
			</ul>
		</div>
	)
}
