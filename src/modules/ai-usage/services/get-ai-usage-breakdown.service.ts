import type { AiUsageBreakdownRow } from '@/modules/ai-usage/ai-usage-breakdown'
import {
	findAiUsageBreakdown,
	findAiUsageToday,
} from '@/modules/ai-usage/repositories/ai-usage-breakdown.payload.repository'
import type { User } from '@/payload-types'

/**
 * 유스케이스 경계: 사용량 화면이 접어 쓸 최소 알갱이와 기준일을 함께 돌려준다.
 * 범위 제한(본인 행 / 전체)과 Payload 접근은 repository가 소유한다(docs/06 의존 방향).
 */
export async function getAiUsageBreakdown(
	user: User,
): Promise<{ rows: AiUsageBreakdownRow[]; todayKey: string }> {
	const [rows, todayKey] = await Promise.all([findAiUsageBreakdown(user), findAiUsageToday()])
	return { rows, todayKey }
}
