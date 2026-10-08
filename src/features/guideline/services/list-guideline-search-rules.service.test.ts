import { beforeEach, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ listRuleSummaries: vi.fn() }))
vi.mock('@/features/quality-rule/services/list-rule-summaries.service', () => ({
	listRuleSummaries: mocks.listRuleSummaries,
}))

import { listGuidelineSearchRules } from './list-guideline-search-rules.service'

const req = { id: 'tx' } as never

beforeEach(() => {
	vi.clearAllMocks()
	mocks.listRuleSummaries.mockResolvedValue([])
})

test('채워진 관계는 그대로 쓰고, id만 온 것만 소유자 서비스에 같은 req로 묻는다', async () => {
	mocks.listRuleSummaries.mockResolvedValue([{ id: 3, key: 'logo.size', title: '로고 크기' }])
	const document = {
		rules: [{ id: 1, key: 'color.palette', title: '컬러' }, 3],
		sections: [{ rules: [1, { id: 2, key: 'type.scale', title: '타입' }] }],
	} as never

	await expect(listGuidelineSearchRules(document, req)).resolves.toEqual([
		{ key: 'color.palette', title: '컬러' },
		{ key: 'logo.size', title: '로고 크기' },
		{ key: 'type.scale', title: '타입' },
	])
	expect(mocks.listRuleSummaries).toHaveBeenCalledWith(req, [3])
})

test('관계가 없으면 조회 없이 빈 목록이다', async () => {
	await expect(listGuidelineSearchRules({} as never, req)).resolves.toEqual([])
	expect(mocks.listRuleSummaries).toHaveBeenCalledWith(req, [])
})
