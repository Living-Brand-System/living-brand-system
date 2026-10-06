import { Controller } from '@/components/shared/controller'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { AiUsageBreakdownRow } from '@/modules/ai-usage/ai-usage-breakdown'
import { AI_USAGE_FEATURES } from '@/modules/ai-usage/ai-usage-catalog'
import { foldAiUsage } from '@/modules/ai-usage/ai-usage-fold'
import {
	exceededTokenPeriod,
	TOKEN_LIMIT_PERIOD_LABELS,
	TOKEN_LIMIT_PERIODS,
	type TokenLimits,
	type TokenUsage,
} from '@/modules/ai-usage/token-limit'
import { AiUsageDailyStrip } from './ai-usage-daily-strip'
import { formatTokens } from './ai-usage-format'

/**
 * 기능 순서대로 칠하는 색 — 카탈로그 순서와 같은 길이다. 시안(Figma 590:10098)의 HD 초록 세 단이
 * chart 1~3 슬롯에 들어 있다(theme.css).
 */
const FEATURE_TONES = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3'] as const

/**
 * 내 사용량 — 계정 화면에서 **본인** 토큰만 보여 준다. 전체 계정 보기는 매니저 화면이 맡는다.
 *
 * 🔑 호출 수·캐시·추론은 비용을 다루는 사람의 숫자라 여기 없다. 총량·일자·기능 비율 셋뿐이다.
 * 🔑 manager는 repository가 전 계정 행을 돌려주므로, 범위를 접기 단계의 계정 필터로 좁힌다.
 * 🔑 한도는 「오늘」「이번 달」 두 기간이라(token-limit.ts) 분모도 그 기간의 사용량에 붙인다 — 전체 합계에
 *    한도를 붙이면 단위가 어긋난다. 「전체」 묶음(일자·기능)은 기간 없이 그대로 둔다.
 */
export function MyAiUsageCard({
	limitStatus,
	rows,
	todayKey,
	userId,
}: {
	/** 막는 판정과 같은 계산(`getTokenLimitStatus`)의 결과. 없으면 한도 묶음을 그리지 않는다. */
	limitStatus?: { limits: TokenLimits; usage: TokenUsage }
	rows: AiUsageBreakdownRow[]
	todayKey: string
	userId: number
}) {
	const fold = foldAiUsage(rows, {
		axis: 'feature',
		days: null,
		filters: { user: String(userId) },
		todayKey,
	})
	const byFeature = new Map(fold.rows.map((row) => [row.key, row]))
	// 🔴 쓴 양 순이 아니라 카탈로그 순이다 — 순서가 바뀌면 같은 기능의 색이 날마다 달라진다.
	const features = AI_USAGE_FEATURES.map((option, index) => ({
		label: option.label,
		share: byFeature.get(option.value)?.share ?? 0,
		tone: FEATURE_TONES[index % FEATURE_TONES.length],
		totalTokens: byFeature.get(option.value)?.totalTokens ?? 0,
		value: option.value,
	}))

	const exceeded = limitStatus ? exceededTokenPeriod(limitStatus.usage, limitStatus.limits) : null

	return (
		<Controller.Root className="gap-5 px-3 pt-6 pb-3 lg:h-auto">
			<Typography as="h2" className="px-2" size="2xl" weight="medium">
				내 사용량
			</Typography>

			{limitStatus && (
				<section aria-labelledby="my-ai-usage-limit" className="flex flex-col gap-3">
					<Typography
						as="h3"
						className="px-2"
						id="my-ai-usage-limit"
						tone="muted"
						weight="medium"
					>
						한도
					</Typography>
					<div className="grid grid-cols-2 gap-1">
						{TOKEN_LIMIT_PERIODS.map((period) => {
							const limit = limitStatus.limits[period]
							return (
								<div
									className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2"
									key={period}
								>
									<Typography as="p" tone="muted" size="xs">
										{TOKEN_LIMIT_PERIOD_LABELS[period]}
									</Typography>
									<Typography
										as="p"
										className="tabular-nums"
										size="2xl"
										weight="semibold"
									>
										{formatTokens(limitStatus.usage[period])}
										<span className="text-muted-foreground/40">
											{limit === null
												? ' · 한도 없음'
												: ` / ${formatTokens(limit)}`}
										</span>
									</Typography>
								</div>
							)
						})}
					</div>
					{/* 지금은 요청을 보내 봐야 막힌 걸 안다 — 닿았으면 미리 말한다. 색만이 아니라 글로(docs/08). */}
					{exceeded && (
						<Typography
							as="p"
							className="px-2"
							role="status"
							size="sm"
							tone="destructive"
						>
							{TOKEN_LIMIT_PERIOD_LABELS[exceeded]} 한도에 닿아 새 AI 요청이 막혀
							있어요. 관리자에게 한도 조정을 요청하세요.
						</Typography>
					)}
				</section>
			)}

			<section aria-labelledby="my-ai-usage-all" className="flex flex-col gap-3">
				<Typography
					as="h3"
					className="px-2"
					id="my-ai-usage-all"
					tone="muted"
					weight="medium"
				>
					전체
				</Typography>

				<div className="flex flex-col gap-1">
					<div className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2">
						<Typography as="p" tone="muted" size="xs">
							토큰 사용량
						</Typography>
						<Typography as="p" className="tabular-nums" size="2xl" weight="semibold">
							{formatTokens(fold.kpi.totalTokens)}
						</Typography>
					</div>

					<AiUsageDailyStrip days={fold.daily} />

					<div className="flex flex-col gap-2 rounded-lg bg-muted px-3 py-2">
						<Typography as="h4" tone="muted" size="xs" weight="medium">
							기능별 사용량
						</Typography>
						{/* 막대는 장식이다 — 같은 숫자를 범례가 글자로 준다(색만으로 뜻을 전하지 않는다). */}
						<div aria-hidden className="flex h-7 overflow-hidden rounded-lg bg-border">
							{features.map((feature) => (
								<div
									className={feature.tone}
									key={feature.value}
									// 폭은 런타임 기하값이라 inline style이 허용된다(docs/10 §8).
									style={{ width: `${feature.share * 100}%` }}
								/>
							))}
						</div>
						<ul className="flex flex-wrap gap-x-2.5 gap-y-1">
							{features.map((feature) => (
								<li className="flex items-center gap-1" key={feature.value}>
									<span className={cn('size-2 rounded-full', feature.tone)} />
									<Typography as="span" tone="muted" size="xs">
										{feature.label}
										<span className="sr-only">
											: {formatTokens(feature.totalTokens)} 토큰
										</span>
									</Typography>
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>
		</Controller.Root>
	)
}
