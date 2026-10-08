import type { PayloadRequest } from 'payload'
import { listRuleSummaries } from '@/features/quality-rule/services/list-rule-summaries.service'
import type { GuidelineDocument, Rule } from '@/payload-types'
import { relationshipId } from '../utils/block-text'
import type { GuidelineSearchRuleSummary } from '../utils/guideline-search-text'

/**
 * 검색 인덱싱에 필요한 Rule 요약을 문서·섹션의 rules 관계에서 모은다.
 * 관계가 문서로 채워져 있으면 그대로 쓰고, id만 온 것은 소유자(quality-rule)의 서비스로 채운다.
 *
 * 🔴 req를 반드시 넘긴다. 이 함수는 문서 저장 트랜잭션 안(searchPlugin beforeSync)에서 호출되므로,
 * req 없이 조회하면 같은 트랜잭션을 타지 못하고 풀에서 커넥션을 하나 더 요구한다.
 * 저장이 이미 커넥션 1개를 점유한 상태라, 풀이 작으면 자기가 반납할 커넥션을 자기가 기다리는 교착이 된다.
 */
export async function listGuidelineSearchRules(
	document: GuidelineDocument,
	req: PayloadRequest,
): Promise<GuidelineSearchRuleSummary[]> {
	const references = [
		...(document.rules ?? []),
		...(document.sections ?? []).flatMap((section) => section.rules ?? []),
	]
	const byId = new Map<number, GuidelineSearchRuleSummary | null>()
	for (const reference of references) {
		const id = relationshipId(reference)
		if (id === null) continue
		byId.set(
			id,
			typeof reference === 'object' && reference !== null
				? { key: (reference as Rule).key, title: (reference as Rule).title }
				: (byId.get(id) ?? null),
		)
	}

	const missingIds = [...byId.entries()]
		.filter(([, summary]) => summary === null)
		.map(([id]) => id)
	for (const rule of await listRuleSummaries(req, missingIds)) {
		byId.set(rule.id, { key: rule.key, title: rule.title })
	}

	return [...byId.values()].flatMap((summary) => (summary ? [summary] : []))
}
