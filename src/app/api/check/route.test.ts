import { beforeEach, describe, expect, it, vi } from 'vitest'

// 한도 판정은 이 테스트의 대상이 아니다 — Payload 설정·DB를 끌어오지 않게 막아 둔다.
vi.mock('@/modules/ai-usage/services/token-limit.service', () => ({
	assertWithinTokenLimit: vi.fn(async () => {}),
	TokenLimitExceededError: class TokenLimitExceededError extends Error {},
}))

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	isCrossOriginRequest: vi.fn(),
	readCheckImage: vi.fn(),
	startCheckSession: vi.fn(),
}))

vi.mock('@/lib/auth', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth')>()),
	isPayloadUser: () => true,
}))
vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))
vi.mock('@/features/asset-check/services/start-check-session.service', () => ({
	startCheckSession: mocks.startCheckSession,
}))
vi.mock('@/app/api/check/read-check-image', () => ({
	readCheckImage: mocks.readCheckImage,
}))

import { POST } from './route'

describe('POST /api/check', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: { error: vi.fn() } },
			user: { id: 7, role: 'admin' },
		})
		mocks.readCheckImage.mockResolvedValue({
			buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			name: 'image.png',
		})
		mocks.startCheckSession.mockResolvedValue({ results: {} })
	})

	it('클라이언트가 다른 source를 보내도 review-page로 고정한다', async () => {
		const values = new Map<string, FormDataEntryValue>([
			['image', 'image'],
			['source', 'mcp-call'],
		])
		const request = {
			formData: async () => ({ get: (key: string) => values.get(key) ?? null }),
		} as Request

		await POST(request)

		expect(mocks.startCheckSession).toHaveBeenCalledWith(
			expect.objectContaining({ source: 'review-page' }),
		)
	})

	it('미개발 표면이라 admin이 아니면 403이고 검수를 돌리지 않는다', async () => {
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: { error: vi.fn() } },
			user: { id: 8, role: 'manager' },
		})

		const response = await POST({} as Request)

		expect(response.status).toBe(403)
		expect(mocks.startCheckSession).not.toHaveBeenCalled()
	})
})
