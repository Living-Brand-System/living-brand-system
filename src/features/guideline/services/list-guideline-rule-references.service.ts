import type { PayloadRequest } from 'payload'
import {
	findGuidelineDocumentRuleReferences,
	type GuidelineDocumentRuleReference,
} from '../repositories/guideline-document.payload.repository'

export type { GuidelineDocumentRuleReference }

/**
 * 문서·섹션이 참조하는 Rule id 목록(초안 포함) — quality-rule의 삭제 가드가 쓴다.
 * 소유자 밖에서 `guideline-documents`의 Rule 참조를 읽는 유일한 입구(경계 규칙 R1·R3).
 */
export function listGuidelineDocumentRuleReferences(
	req: PayloadRequest,
): Promise<GuidelineDocumentRuleReference[]> {
	return findGuidelineDocumentRuleReferences(req)
}
