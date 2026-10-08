import type { PayloadRequest } from 'payload'
import { expect, it, vi } from 'vitest'
import { listScenarioCheckKeys } from './rule-references.payload.repository'

it('삭제 가드는 시나리오의 Check key를 초안 포함·요청자 권한으로 읽고, 문자열만 남긴다', async () => {
	const find = vi.fn().mockResolvedValue({
		docs: [
			{ id: 3, checkKeys: ['logo-size', 7, null, 'color.palette'] },
			{ id: 4, checkKeys: null },
		],
	})
	const req = { payload: { find }, user: { id: 1 } } as unknown as PayloadRequest
	expect(await listScenarioCheckKeys(req)).toEqual([
		{ id: 3, checkKeys: ['logo-size', 'color.palette'] },
		{ id: 4, checkKeys: [] },
	])
	expect(find).toHaveBeenCalledWith(
		expect.objectContaining({
			collection: 'check-scenarios',
			draft: true,
			overrideAccess: false,
			select: { checkKeys: true },
		}),
	)
})
