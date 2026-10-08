import type { PayloadRequest } from 'payload'
import { findRuleSummaries, type RuleSummary } from '../repositories/rules.payload.repository'

export type { RuleSummary }

/**
 * id 목록으로 Rule의 key·title을 읽는다 — guideline 검색 인덱싱이 관계가 id로만 온 Rule을 채울 때 쓴다.
 * 소유자 밖에서 `rules`를 읽는 공개 입구(경계 규칙 R1·R3). `req`를 받는 이유는 호출 맥락이 문서 저장
 * 트랜잭션 안이라서다 — 같은 트랜잭션을 타지 않으면 풀에서 커넥션을 하나 더 요구해 교착이 난다.
 */
export function listRuleSummaries(
	req: PayloadRequest,
	ruleIds: readonly number[],
): Promise<RuleSummary[]> {
	return ruleIds.length === 0 ? Promise.resolve([]) : findRuleSummaries(req, ruleIds)
}
