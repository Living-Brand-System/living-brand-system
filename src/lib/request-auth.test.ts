import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('payload', () => ({ getPayload: async () => ({ auth: mocks.auth }) }))

import { authenticateRequest } from './request-auth'

describe('authenticateRequest', () => {
	beforeEach(() => vi.clearAllMocks())

	it('users 문서는 그대로 돌려준다', async () => {
		const user = { collection: 'users', email: 'w@example.com', id: 1, role: 'worker' }
		mocks.auth.mockResolvedValue({ user })
		expect((await authenticateRequest()).user).toBe(user)
	})

	it('MCP API 키 문서는 사용자가 아니다 — null로 버린다', async () => {
		mocks.auth.mockResolvedValue({
			user: { collection: 'payload-mcp-api-keys', id: 7, label: 'ci', user: 1 },
		})
		expect((await authenticateRequest()).user).toBeNull()
	})
})
