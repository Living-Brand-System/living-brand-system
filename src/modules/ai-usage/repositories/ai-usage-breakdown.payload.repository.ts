import config from '@payload-config'
import { eq, sql } from '@payloadcms/db-postgres/drizzle'
import { getPayload } from 'payload'
import { isAdmin, isManager } from '@/lib/auth'
import type { User } from '@/payload-types'
import type { AiUsageBreakdownRow } from '../ai-usage-breakdown'
import { AI_USAGE_TIME_ZONE, type AiUsageFeature, type AiUsageStudio } from '../ai-usage-catalog'

/**
 * 사용량의 최소 알갱이를 한 번에 읽는다 — 화면의 네 축·KPI·일자 분포가 전부 이 결과의 fold다.
 *
 * 🔴 drizzle 직통 쿼리는 컬렉션 access를 **통과하지 않는다**. manager가 아니면 자기 행으로
 *    좁히는 제한을 여기서 직접 건다 — users를 join해 이메일을 뽑으므로, 빠뜨리면 토큰 숫자가
 *    아니라 **계정 목록이 샌다**(docs/07 신뢰 경계).
 * 🔴 manager에게는 admin 행도 뺀다. admin은 유지보수 계정이지 실사용자가 아니라서 운영 지표에
 *    섞이면 노이즈다(2026-09-28 결정). admin 본인은 전부 본다.
 * 🔴 join은 `leftJoin`이다. `innerJoin`이면 계정이 삭제된 이벤트가 fold 이전에 사라져 총합이
 *    조용히 줄어든다 — 행은 남기고 이름만 비운다. 그래서 admin 제외도 `<> 'admin'`이 아니라
 *    `is distinct from`이다 — 전자는 role이 NULL인(=삭제된 계정) 행까지 같이 떨어뜨린다.
 * 🔴 일자 버킷에 `AT TIME ZONE`을 명시한다. 빼면 세션 TZ(대개 UTC)를 따라가 「오늘」이 하루
 *    밀린다 — 이 리포가 실제로 겪은 사고다.
 * ponytail: 기간 WHERE 없이 전 기간을 한 번 읽는다. 그룹 행 수는 원시 이벤트 수를 못 넘고
 *    지금은 수십 행이다. 수만 건이 되면 여기에 `created_at >=` 를 걸고 fold에 기간을 넘긴다.
 */
export async function findAiUsageBreakdown(user: User): Promise<AiUsageBreakdownRow[]> {
	const payload = await getPayload({ config })
	const events = payload.db.tables.ai_usage_events
	const users = payload.db.tables.users

	// numeric 컬럼의 SUM은 문자열로 돌아오고 행이 없으면 null이다 — 0으로 모은 뒤 숫자로 바꾼다.
	const sumOf = (column: unknown) => sql<string>`coalesce(sum(${column}), 0)`
	const dayKey = sql<string>`to_char(${events.createdAt} AT TIME ZONE ${sql.raw(`'${AI_USAGE_TIME_ZONE}'`)}, 'YYYY-MM-DD')`

	const rows = await payload.db.drizzle
		.select({
			cacheReadInputTokens: sumOf(events.cacheReadInputTokens),
			cacheWriteInputTokens: sumOf(events.cacheWriteInputTokens),
			callCount: sql<string>`count(*)`,
			dayKey,
			feature: events.feature,
			inputTokens: sumOf(events.inputTokens),
			model: events.model,
			outputTokens: sumOf(events.outputTokens),
			reasoningTokens: sumOf(events.reasoningTokens),
			studio: events.studio,
			totalTokens: sumOf(events.totalTokens),
			userEmail: users.email,
			userId: events.createdBy,
		})
		.from(events)
		.leftJoin(users, eq(users.id, events.createdBy))
		.where(
			isAdmin(user)
				? undefined
				: isManager(user)
					? sql`${users.role} is distinct from 'admin'`
					: eq(events.createdBy, user.id),
		)
		.groupBy(events.createdBy, users.email, events.feature, events.studio, events.model, dayKey)

	return rows.map((row) => ({
		cacheReadInputTokens: Number(row.cacheReadInputTokens),
		cacheWriteInputTokens: Number(row.cacheWriteInputTokens),
		callCount: Number(row.callCount),
		dayKey: String(row.dayKey),
		feature: row.feature as AiUsageFeature,
		inputTokens: Number(row.inputTokens),
		model: String(row.model),
		outputTokens: Number(row.outputTokens),
		reasoningTokens: Number(row.reasoningTokens),
		studio: (row.studio ?? null) as AiUsageStudio | null,
		totalTokens: Number(row.totalTokens),
		userEmail: row.userEmail == null ? null : String(row.userEmail),
		userId: row.userId == null ? null : Number(row.userId),
	}))
}

/** `AI_USAGE_TIME_ZONE` 기준 오늘. 기간 경계를 서버가 정해야 SSR/CSR이 안 어긋난다. */
export async function findAiUsageToday(): Promise<string> {
	const payload = await getPayload({ config })
	const result = await payload.db.drizzle.execute(
		sql`select to_char(now() AT TIME ZONE ${sql.raw(`'${AI_USAGE_TIME_ZONE}'`)}, 'YYYY-MM-DD') as day`,
	)
	const row = (result as { rows?: { day?: unknown }[] }).rows?.[0]
	return String(row?.day ?? '')
}
