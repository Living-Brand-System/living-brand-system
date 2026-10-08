import type { RuleChecker } from '@/payload-types'

export type RuleCheckerSummary = Pick<RuleChecker, 'checkerKey' | 'executor'>

/**
 * Admin 룰 폼의 checker 관계가 id만 들고 있을 때 Checker 문서를 읽는다 — `executor`·`checkerKey`를
 * 형제 필드에 반영하기 위한 조회. Payload REST I/O는 이 client service가 소유한다.
 * 실패·중단은 null이다 — 폼 필드는 값을 못 채우면 그냥 두는 것이 맞고, 오류를 띄울 자리가 없다.
 */
export async function fetchRuleChecker(
	checkerId: number,
	signal: AbortSignal,
): Promise<RuleCheckerSummary | null> {
	try {
		const response = await fetch(`/api/rule-checkers/${checkerId}?depth=0`, { signal })
		return response.ok ? ((await response.json()) as RuleCheckerSummary) : null
	} catch {
		return null
	}
}
