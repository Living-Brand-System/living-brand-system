import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	requireUser: vi.fn(),
	getCheckRuleset: vi.fn(),
}))

vi.mock('@/lib/request-auth', () => ({ requireUser: mocks.requireUser }))
vi.mock('@/features/asset-check/services/get-check-ruleset.service', () => ({
	getCheckRuleset: mocks.getCheckRuleset,
}))

import ReviewPage from './page'

describe('ReviewPage', () => {
	it('미개발 표면이라 admin이 아니면 404를 내고 규칙을 조회하지 않는다', async () => {
		mocks.requireUser.mockResolvedValue({ user: { role: 'manager' } })

		await expect(ReviewPage()).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
		expect(mocks.getCheckRuleset).not.toHaveBeenCalled()
	})
})
