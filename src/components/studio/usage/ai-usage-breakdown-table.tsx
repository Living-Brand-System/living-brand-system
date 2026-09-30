import Link from 'next/link'
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { type AiUsageAxis, aiUsageAxisLabel } from '@/modules/ai-usage/ai-usage-catalog'
import type { AiUsageFold } from '@/modules/ai-usage/ai-usage-fold'
import {
	type AiUsageQuery,
	aiUsageFilterHref,
	aiUsageHref,
} from '@/modules/ai-usage/ai-usage-query'
import { formatTokens, HEAD_CLASS, NUMBER_CLASS } from './ai-usage-format'

/**
 * 분해 표 — **하나뿐이다.** 축이 바뀌면 첫 열의 라벨과 행만 갈아끼우고 메트릭 열은 고정이다.
 * 이 구조라야 구현 비용이 축 개수에 비례하지 않는다.
 *
 * 🔴 바닥 총계는 보이는 행이 아니라 **자르기 전 전량**이다. 보이는 행을 더하면 상한에 걸리거나
 *    정렬이 바뀌는 순간 조용히 틀린 숫자가 된다.
 * 🔑 첫 열이 Link다 — 누르면 그 값이 필터 칩으로 붙고 KPI·스트립·표가 동시에 좁혀진다.
 */
export function AiUsageBreakdownTable({
	axis,
	fold,
	query,
}: {
	axis: AiUsageAxis
	fold: AiUsageFold
	query: AiUsageQuery
}) {
	const filterKey = axis
	return (
		<>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className={HEAD_CLASS} scope="col">
							{aiUsageAxisLabel(axis)}
						</TableHead>
						<TableHead className={`${HEAD_CLASS} ${NUMBER_CLASS}`} scope="col">
							호출
						</TableHead>
						<TableHead className={`${HEAD_CLASS} ${NUMBER_CLASS}`} scope="col">
							입력
						</TableHead>
						<TableHead className={`${HEAD_CLASS} ${NUMBER_CLASS}`} scope="col">
							출력
						</TableHead>
						<TableHead className={`${HEAD_CLASS} ${NUMBER_CLASS}`} scope="col">
							합계
						</TableHead>
						<TableHead className={`${HEAD_CLASS} ${NUMBER_CLASS}`} scope="col">
							비중
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{fold.rows.map((row) => {
						// 안 쓴 줄은 숫자를 죽여 둔다 — 0이 보이되 쓴 줄을 가리지 않는다.
						const unused = row.callCount === 0
						const muted = unused ? 'text-muted-foreground' : undefined
						return (
							<TableRow key={row.key ?? 'none'}>
								<TableCell className={cn('relative', muted)}>
									{/* 비중 막대는 라벨 뒤에 깔린다. 색은 단일 토큰이다 —
									    chart 토큰이 5색뿐이라 값마다 색을 주면 6번째가 1번째와
									    같은 색이 되어 범례가 거짓말을 한다. */}
									<span
										aria-hidden
										className="absolute inset-y-1 left-0 rounded-sm bg-chart-1/15"
										style={{ width: `${row.share * 100}%` }}
									/>
									{unused ? (
										<span className="relative">{row.label}</span>
									) : (
										<Link
											className="relative underline-offset-4 hover:underline"
											href={aiUsageFilterHref(query, filterKey, row.key)}
											scroll={false}
										>
											{row.label}
										</Link>
									)}
								</TableCell>
								<TableCell className={cn(NUMBER_CLASS, muted)}>
									{formatTokens(row.callCount)}
								</TableCell>
								<TableCell className={cn(NUMBER_CLASS, muted)}>
									{formatTokens(row.inputTokens)}
								</TableCell>
								<TableCell className={cn(NUMBER_CLASS, muted)}>
									{formatTokens(row.outputTokens)}
								</TableCell>
								<TableCell className={cn(NUMBER_CLASS, muted)}>
									{formatTokens(row.totalTokens)}
								</TableCell>
								<TableCell className={cn(NUMBER_CLASS, muted)}>
									{Math.round(row.share * 100)}%
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
				<TableFooter>
					<TableRow>
						<TableCell>합계</TableCell>
						<TableCell className={NUMBER_CLASS}>
							{formatTokens(fold.footerTotal.callCount)}
						</TableCell>
						<TableCell className={NUMBER_CLASS}>
							{formatTokens(fold.footerTotal.inputTokens)}
						</TableCell>
						<TableCell className={NUMBER_CLASS}>
							{formatTokens(fold.footerTotal.outputTokens)}
						</TableCell>
						<TableCell className={NUMBER_CLASS}>
							{formatTokens(fold.footerTotal.totalTokens)}
						</TableCell>
						<TableCell className={NUMBER_CLASS}>100%</TableCell>
					</TableRow>
				</TableFooter>
			</Table>
			{/* 🔴 자른 것을 말없이 숨기지 않는다 — 안 적으면 「전부 봤다」로 읽힌다. */}
			{fold.hiddenRowCount > 0 && (
				<Link
					className="text-muted-foreground text-sm underline"
					href={aiUsageHref(query, { showAllRows: true })}
					scroll={false}
				>
					{aiUsageAxisLabel(axis)} 더 보기 (+{fold.hiddenRowCount})
				</Link>
			)}
		</>
	)
}
