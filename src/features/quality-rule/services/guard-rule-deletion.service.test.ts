import { describe, expect, it, vi } from 'vitest'
import { listGuidelineDocumentRuleReferences } from '@/features/guideline/services/list-guideline-rule-references.service'
import {
	getRuleKey,
	listScenarioCheckKeys,
} from '../repositories/rule-references.payload.repository'
import { assertRuleDeletable, ruleReferenceMessage } from './guard-rule-deletion.service'

vi.mock('@/features/guideline/services/list-guideline-rule-references.service', () => ({
	listGuidelineDocumentRuleReferences: vi.fn(),
}))
vi.mock('../repositories/rule-references.payload.repository', () => ({
	getRuleKey: vi.fn(),
	listScenarioCheckKeys: vi.fn(),
}))

describe('ruleReferenceMessage', () => {
	const emptySources = { documents: [], scenarios: [] }

	it('문서 레벨 참조가 있으면 삭제를 거부한다', () => {
		const sources = {
			documents: [{ id: 1, ruleIds: [7, 9] }],
			scenarios: [],
		}
		expect(ruleReferenceMessage(7, 'logo-size', sources)).toContain('가이드라인 문서 1건')
	})

	it('블록 레벨 참조도 문서 참조로 집계한다', () => {
		const sources = {
			documents: [
				{ id: 1, ruleIds: [9] },
				{ id: 2, ruleIds: [7] },
			],
			scenarios: [],
		}
		expect(ruleReferenceMessage(7, 'logo-size', sources)).toContain('가이드라인 문서 1건')
	})

	it('시나리오가 key로 참조하면 삭제를 거부한다', () => {
		const sources = {
			documents: [],
			scenarios: [{ id: 3, checkKeys: ['logo-size', 'other'] }],
		}
		expect(ruleReferenceMessage(7, 'logo-size', sources)).toContain('검수 시나리오 1건')
	})

	it('참조가 없으면 삭제를 허용한다', () => {
		expect(ruleReferenceMessage(7, 'logo-size', emptySources)).toBeNull()
		expect(ruleReferenceMessage(7, null, emptySources)).toBeNull()
	})
})

describe('assertRuleDeletable', () => {
	it('참조 중인 Rule 삭제는 APIError로 거부한다', async () => {
		vi.mocked(getRuleKey).mockResolvedValue('logo-size')
		vi.mocked(listGuidelineDocumentRuleReferences).mockResolvedValue([{ id: 1, ruleIds: [7] }])
		vi.mocked(listScenarioCheckKeys).mockResolvedValue([{ id: 3, checkKeys: ['logo-size'] }])

		await expect(assertRuleDeletable({} as never, 7)).rejects.toThrow(
			'가이드라인 문서 1건, 검수 시나리오 1건이 이 규칙을 참조하고 있어 삭제할 수 없습니다.',
		)
	})

	it('참조가 없는 Rule은 삭제를 허용한다', async () => {
		vi.mocked(getRuleKey).mockResolvedValue('unused')
		vi.mocked(listGuidelineDocumentRuleReferences).mockResolvedValue([])
		vi.mocked(listScenarioCheckKeys).mockResolvedValue([])

		await expect(assertRuleDeletable({} as never, 7)).resolves.toBeUndefined()
	})
})
