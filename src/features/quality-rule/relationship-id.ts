import { toRelationshipId } from '@/lib/payload-relationship'

/**
 * Payload relationship의 ID를 populated/unpopulated 형태와 무관하게 읽는다 — 없으면 `null`.
 * 판정 규칙(숫자·문서·NaN)은 `lib/payload-relationship` 한 곳이 소유하고, 여기는 `null` 표기만 맞춘다.
 */
export function relationshipId(value: unknown): number | null {
	return toRelationshipId(value) ?? null
}
