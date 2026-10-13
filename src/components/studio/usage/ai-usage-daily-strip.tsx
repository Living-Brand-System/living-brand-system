import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { AiUsageDay } from '@/modules/ai-usage/ai-usage-fold'
import { formatTokens, formatTokensCompact, niceTokenScale } from './ai-usage-format'

/** 스트립에 그리는 최대 일수 — 기간이 「전체」여도 막대가 실처럼 얇아지지 않게 자른다. */
const MAX_BARS = 30
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 'YYYY-MM-DD' → 월·일·요일. Date는 UTC로만 써서 타임존이 끼어들 자리를 없앤다. */
function partsOf(dayKey: string) {
	const [year = 0, month = 1, day = 1] = dayKey.split('-').map(Number)
	return { month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() }
}

/**
 * 날짜 분포. 🔑 **날짜를 축 세그먼트에 넣지 않은 이유가 이 자리다** — 날짜는 다른 축과 배타로
 * 고르는 것이 아니라 언제나 켜져 있는 시간 분포라서, 축을 무엇으로 바꾸든 같은 자리에 남는다.
 *
 * 🔴 차트 라이브러리를 넣지 않는다. 막대 30개에 recharts는 순수 비용이고, 높이는 런타임
 *    기하값이라 inline style이 허용된다(docs/10 §8).
 * 🔴 막대는 `aria-hidden`이고 같은 숫자를 sr-only 목록으로 준다 — 색·길이만으로 뜻을 전하지 않는다.
 * 🔑 칸 폭이 고정이라 막대 두께가 늘 같다. 칸은 최신 날부터 오른쪽에서 채우고(`row-reverse`),
 *    폭이 모자라면 넘친 옛날 칸이 다음 줄로 접혀 잘린다 — JS 없이 들어가는 만큼만 보인다.
 * 🔑 칸 전체가 hover 영역이다 — 가는 막대를 정확히 겨누지 않아도 된다. 0인 날은 막대가 없다.
 */
export function AiUsageDailyStrip({ days }: { days: AiUsageDay[] }) {
	const shown = days.slice(-MAX_BARS)
	if (shown.length === 0) return null

	const empty = shown.every((day) => day.totalTokens === 0)
	const scale = niceTokenScale(Math.max(...shown.map((day) => day.totalTokens)))
	/** 눈금·막대가 같은 식으로 높이를 낸다 — 둘이 어긋나면 수평선이 거짓말을 한다. */
	const heightOf = (tokens: number) => `${scale.max > 0 ? (tokens / scale.max) * 100 : 0}%`

	return (
		<div className="flex w-fit max-w-full flex-col gap-3 px-2">
			<Typography as="h2" className="text-muted-foreground" size="xs" weight="medium">
				일자별 사용량
			</Typography>

			<div className="flex gap-2 pt-2">
				{/* 세로축 눈금 — 막대 영역(h-28)과 같은 높이에서 같은 식으로 선다. */}
				{/* 폭을 고정한다 — 라벨 길이(0 ↔ 150만)에 따라 폭이 바뀌면 그래프 전체가 좌우로 흔들린다. */}
				<div aria-hidden className="relative h-28 w-10 shrink-0">
					{scale.ticks.map((tick) => (
						<span
							className="absolute right-0 translate-y-1/2 text-muted-foreground text-xs tabular-nums leading-none"
							key={tick}
							style={{ bottom: heightOf(tick) }}
						>
							{formatTokensCompact(tick)}
						</span>
					))}
				</div>

				<div className="relative min-w-0 flex-1">
					{/* 수평선은 막대 뒤에 깔린다 — 막대 묶음이 뒤에 오는 relative라 위에 그려진다. */}
					<div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28">
						{scale.ticks.slice(1).map((tick) => (
							<div
								className="absolute inset-x-0 border-border/50 border-t"
								key={tick}
								style={{ bottom: heightOf(tick) }}
							/>
						))}
					</div>
					<div
						aria-hidden
						className="relative flex h-34 flex-row-reverse flex-wrap overflow-hidden"
					>
						{[...shown].reverse().map((day) => {
							const { month, day: date, weekday } = partsOf(day.dayKey)
							return (
								<Tooltip key={day.dayKey}>
									<TooltipTrigger asChild>
										<div
											className={cn(
												'group flex h-34 w-6 flex-col',
												// 주 구분 — 일요일과 월요일 사이에 깔리는 옅은 선.
												weekday === 1 && 'border-border/50 border-l',
											)}
										>
											<div className="flex h-28 items-end justify-center border-border border-b">
												{day.totalTokens > 0 && (
													<div
														className="w-3 rounded-t-sm bg-chart-2 transition-colors group-hover:bg-chart-1"
														style={{
															height: heightOf(day.totalTokens),
														}}
													/>
												)}
											</div>
											<div
												className={cn(
													'flex flex-col items-center pt-1 text-muted-foreground text-xs tabular-nums leading-4',
													weekday === 6 && 'text-saturday',
													weekday === 0 && 'text-sunday',
												)}
											>
												{/* 달이 바뀌는 1일은 달을 붙여 굵게 — 뒤따르는 날짜의 달을 알려 준다(Carbon 축 규칙). */}
												<span
													className={cn(
														'whitespace-nowrap',
														date === 1 && 'font-semibold',
													)}
												>
													{date === 1 ? `${month}/${date}` : date}
												</span>
											</div>
										</div>
									</TooltipTrigger>
									<TooltipContent side="top" sideOffset={4}>
										<span className="font-semibold tabular-nums">
											{formatTokens(day.totalTokens)}
										</span>
										<span className="opacity-70">
											토큰 · {month}월 {date}일 ({WEEKDAYS[weekday]})
										</span>
									</TooltipContent>
								</Tooltip>
							)
						})}
					</div>
					{empty && (
						<Typography
							as="p"
							className="absolute inset-x-0 top-0 grid h-28 place-items-center text-muted-foreground"
							size="xs"
						>
							이 기간에 사용 기록이 없습니다
						</Typography>
					)}
				</div>
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
