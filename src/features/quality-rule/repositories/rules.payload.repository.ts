import type { PayloadRequest } from 'payload'
import type { Rule } from '@/payload-types'

/**
 * published Rule 전체를 읽는다(검수 프로파일이 고를 수 있는 Check의 모집단).
 * 🔑 요청자가 있으면 그 권한으로 읽는다 — overrideAccess는 사용자 없는 서버 호출에만 연다.
 */
export async function findPublishedRules(req: PayloadRequest): Promise<Rule[]> {
	const { docs } = await req.payload.find({
		collection: 'rules',
		depth: 0,
		draft: false,
		limit: 2000,
		overrideAccess: !req.user,
		user: req.user,
		where: { _status: { equals: 'published' } },
	})
	return docs
}

export type RuleSummary = Pick<Rule, 'id' | 'key' | 'title'>

/**
 * id 목록으로 Rule의 key·title을 읽는다. 초안 포함 — 검색 인덱싱은 문서가 참조하는 Rule이 발행됐는지 묻지 않는다.
 * 🔴 `req`를 그대로 넘긴다. 호출 맥락이 문서 저장 트랜잭션 안이라 같은 커넥션을 타야 한다.
 */
export async function findRuleSummaries(
	req: PayloadRequest,
	ruleIds: readonly number[],
): Promise<RuleSummary[]> {
	const { docs } = await req.payload.find({
		collection: 'rules',
		depth: 0,
		limit: 0,
		overrideAccess: true,
		pagination: false,
		req,
		select: { key: true, title: true },
		where: { id: { in: [...ruleIds] } },
	})
	return docs.map(({ id, key, title }) => ({ id, key, title }))
}
