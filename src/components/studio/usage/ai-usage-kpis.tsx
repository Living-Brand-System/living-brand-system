import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { AiUsageFold } from '@/modules/ai-usage/ai-usage-fold'
import { formatTokens } from './ai-usage-format'

/**
 * 맨 위 숫자 네 장.
 *
 * 🔴 기간·칩만 따르고 **축과 무관하다** — 축을 아무리 바꿔도 총량이 안 흔들려야 방향을 잃지 않는다.
 * 🔑 캐시 읽기·추론 토큰이 화면에 처음 나오는 자리다. 값은 계속 들어오고 있었는데 어느 표에도
 *    없어 통째로 버려지고 있었다.
 */
export function AiUsageKpis({ fold }: { fold: AiUsageFold }) {
	const { kpi, previousTotalTokens } = fold
	const delta =
		previousTotalTokens === null || previousTotalTokens === 0
			? null
			: Math.round(((kpi.totalTokens - previousTotalTokens) / previousTotalTokens) * 100)

	const cards = [
		{ hint: deltaHint(delta), label: '총 토큰', value: kpi.totalTokens },
		{ hint: null, label: '호출', value: kpi.callCount },
		{ hint: null, label: '캐시 읽기', value: kpi.cacheReadInputTokens },
		{ hint: null, label: '추론', value: kpi.reasoningTokens },
	]

	return (
		<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
			{cards.map((card) => (
				<div
					className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2"
					key={card.label}
				>
					<Typography as="p" className="text-muted-foreground" size="xs">
						{card.label}
					</Typography>
					<Typography as="p" className="tabular-nums" size="2xl" weight="semibold">
						{formatTokens(card.value)}
					</Typography>
					{/* 비교 대상이 없으면(기간=전체) 줄 자체를 안 그린다 — 0%와 구별돼야 한다. */}
					{card.hint && (
						<Typography
							as="p"
							className={cn(
								'tabular-nums',
								card.hint.rising ? 'text-warning' : 'text-muted-foreground',
							)}
							size="xs"
						>
							{card.hint.text}
						</Typography>
					)}
				</div>
			))}
		</div>
	)
}

function deltaHint(delta: number | null) {
	if (delta === null) return null
	// 부호를 글자로도 준다 — 색만으로 뜻을 전하지 않는다(docs/08).
	const sign = delta > 0 ? '+' : ''
	return { rising: delta > 0, text: `직전 같은 기간 대비 ${sign}${delta}%` }
}
