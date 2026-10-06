import type { PayloadRequest } from 'payload'
import { expect, it, vi } from 'vitest'
import { listRuleReferenceSources } from './rule-references.payload.repository'

it('삭제 가드는 문서와 섹션의 Rule 관계를 모두 읽는다', async () => {
	const find = vi
		.fn()
		.mockResolvedValueOnce({
			docs: [{ id: 1, rules: [2], sections: [{ rules: [3, { id: 4 }] }] }],
		})
		.mockResolvedValueOnce({ docs: [] })
	const req = { payload: { find }, user: { id: 1 } } as unknown as PayloadRequest
	expect(await listRuleReferenceSources(req)).toEqual({
		documents: [{ id: 1, ruleIds: [2, 3, 4] }],
		scenarios: [],
	})
	expect(find.mock.calls[0][0].select).toEqual({ sections: { rules: true }, rules: true })
})
