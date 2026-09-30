import { Close } from '@carbon/icons-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
	aiUsageAxisLabel,
	aiUsageFeatureLabel,
	aiUsageStudioLabel,
} from '@/modules/ai-usage/ai-usage-catalog'
import type { AiUsageFilters } from '@/modules/ai-usage/ai-usage-fold'
import {
	type AiUsageQuery,
	aiUsageClearAllFiltersHref,
	aiUsageClearFilterHref,
} from '@/modules/ai-usage/ai-usage-query'

/**
 * 걸려 있는 필터. 🔑 **칩은 축을 넘나든다** — 계정에서 한 사람을 찍고 모델 축으로 넘기면 그
 * 사람의 모델 내역이 나온다. 축 4개를 화면 16개로 펴지 않고 교차 조회를 얻는 유일한 장치다.
 *
 * 🔴 세그먼트와 모양이 달라야 한다 — 세그먼트는 배타 선택이고 칩은 가산 조건이다.
 */
export function AiUsageFilterChips({
	labels,
	query,
}: {
	/** 값 자체로는 못 읽는 것(계정 id 등)의 표시 이름. 없으면 값을 그대로 보여준다. */
	labels: Partial<Record<keyof AiUsageFilters, string>>
	query: AiUsageQuery
}) {
	const entries = (Object.keys(query.filters) as (keyof AiUsageFilters)[])
		.map((key) => ({ key, value: query.filters[key] }))
		.filter((entry): entry is { key: keyof AiUsageFilters; value: string } =>
			Boolean(entry.value),
		)

	if (entries.length === 0) return null

	return (
		<div className="flex flex-wrap items-center gap-2">
			{entries.map(({ key, value }) => (
				<Badge asChild key={key} shape="pill" variant="muted">
					<Link
						aria-label={`${aiUsageAxisLabel(key)} 필터 해제`}
						href={aiUsageClearFilterHref(query, key)}
						scroll={false}
					>
						<span className="text-muted-foreground">{aiUsageAxisLabel(key)}</span>
						{chipValueLabel(key, value, labels[key])}
						<Close aria-hidden size={14} />
					</Link>
				</Badge>
			))}
			{entries.length > 1 && (
				<Link
					className="text-muted-foreground text-xs underline"
					href={aiUsageClearAllFiltersHref(query)}
					scroll={false}
				>
					모두 해제
				</Link>
			)}
		</div>
	)
}

function chipValueLabel(
	key: keyof AiUsageFilters,
	value: string,
	fallbackLabel: string | undefined,
): string {
	if (key === 'feature') return aiUsageFeatureLabel(value)
	// 'none'은 스튜디오 밖을 고른 것이다 — URL에 null을 실을 수 없어 쓰는 값이다.
	if (key === 'studio') return aiUsageStudioLabel(value === 'none' ? null : value)
	return fallbackLabel ?? value
}
