import config from '@payload-config'
import { and, gte, inArray, sql } from '@payloadcms/db-postgres/drizzle'
import { getPayload } from 'payload'
import { AI_USAGE_TIME_ZONE } from '../ai-usage-catalog'
import type { TokenUsage } from '../token-limit'

/**
 * 계정별 오늘·이번 달 합계 토큰 — 한도 판정과 한도 화면이 같은 수를 본다.
 *
 * 🔑 기간 경계는 DB가 `Asia/Seoul`로 정한다(사용량 리포트와 같은 기준). 세션 TZ(대개 UTC)를 따르면
 *    「오늘」이 9시간 밀린다. 이번 달 시작이 항상 오늘 시작보다 이르므로 WHERE는 달 시작 하나다.
 * 🔴 drizzle 직통 쿼리는 컬렉션 access를 통과하지 않는다 — 누구의 수를 읽을지는 호출부가 정한다.
 */
export async function findTokenUsage(userIds: readonly number[]): Promise<Map<number, TokenUsage>> {
	const usage = new Map<number, TokenUsage>()
	if (userIds.length === 0) return usage
	const payload = await getPayload({ config })
	const events = payload.db.tables.ai_usage_events
	const zone = sql.raw(`'${AI_USAGE_TIME_ZONE}'`)
	const startOf = (unit: 'day' | 'month') =>
		sql`(date_trunc(${sql.raw(`'${unit}'`)}, now() AT TIME ZONE ${zone}) AT TIME ZONE ${zone})`
	// 🔑 캐시 읽기는 공급자 단가대로 10%만 센다 — total_tokens에는 캐시 읽기가 통째로 들어 있어, 스텝마다
	//    같은 프리픽스를 다시 읽는 에이전트 챗 한 턴이 실제 비용의 2~3배로 한도를 깎았다.
	const charged = sql`${events.totalTokens} - 0.9 * coalesce(${events.cacheReadInputTokens}, 0)`

	const rows = await payload.db.drizzle
		.select({
			userId: events.createdBy,
			daily: sql<string>`round(coalesce(sum(${charged}) filter (where ${events.createdAt} >= ${startOf('day')}), 0))`,
			monthly: sql<string>`round(coalesce(sum(${charged}), 0))`,
		})
		.from(events)
		.where(
			and(inArray(events.createdBy, [...userIds]), gte(events.createdAt, startOf('month'))),
		)
		.groupBy(events.createdBy)

	for (const row of rows) {
		if (row.userId == null) continue
		usage.set(Number(row.userId), { daily: Number(row.daily), monthly: Number(row.monthly) })
	}
	return usage
}
