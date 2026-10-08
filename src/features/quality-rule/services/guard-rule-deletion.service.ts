import { APIError, type PayloadRequest } from 'payload'
import {
	type GuidelineDocumentRuleReference,
	listGuidelineDocumentRuleReferences,
} from '@/features/guideline/services/list-guideline-rule-references.service'
import {
	getRuleKey,
	listScenarioCheckKeys,
	type ScenarioCheckKeys,
} from '../repositories/rule-references.payload.repository'

export interface RuleReferenceSources {
	documents: GuidelineDocumentRuleReference[]
	scenarios: ScenarioCheckKeys[]
}

/**
 * Rule 삭제 유스케이스의 참조 무결성 가드. 문서·블록·시나리오가 참조 중인 Rule의
 * 삭제를 거부한다. 문서 참조는 소유자(guideline)의 공개 서비스가, 시나리오·Rule 조회는
 * rule-references repository가 준다.
 */
export async function assertRuleDeletable(req: PayloadRequest, ruleId: number): Promise<void> {
	const [key, documents, scenarios] = await Promise.all([
		getRuleKey(req, ruleId),
		listGuidelineDocumentRuleReferences(req),
		listScenarioCheckKeys(req),
	])
	const message = ruleReferenceMessage(ruleId, key, { documents, scenarios })
	if (message) throw new APIError(message, 400)
}

/** 참조가 있으면 거부 사유를, 없으면 null을 돌려주는 순수 규칙. 외부 I/O 없음. */
export function ruleReferenceMessage(
	ruleId: number,
	key: string | null,
	sources: RuleReferenceSources,
): string | null {
	const documentCount = sources.documents.filter(({ ruleIds }) => ruleIds.includes(ruleId)).length
	const scenarioCount =
		key === null
			? 0
			: sources.scenarios.filter(({ checkKeys }) => checkKeys.includes(key)).length
	if (documentCount === 0 && scenarioCount === 0) return null

	const usage = [
		...(documentCount > 0 ? [`가이드라인 문서 ${documentCount}건`] : []),
		...(scenarioCount > 0 ? [`검수 시나리오 ${scenarioCount}건`] : []),
	].join(', ')
	return `${usage}이 이 규칙을 참조하고 있어 삭제할 수 없습니다. 참조를 먼저 해제하세요.`
}
