import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	CheckSessionInputMismatchError,
	CheckSessionNotFoundError,
	CheckSessionTerminalError,
} from '@/features/asset-check/domain/check-session'

// 한도 판정은 이 테스트의 대상이 아니다 — Payload 설정·DB를 끌어오지 않게 막아 둔다.
vi.mock('@/modules/ai-usage/services/token-limit.service', () => ({
	assertWithinTokenLimit: vi.fn(async () => {}),
	TokenLimitExceededError: class TokenLimitExceededError extends Error {},
}))

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	completeCheckSessionAiCheck: vi.fn(),
	isCrossOriginRequest: vi.fn(),
	logger: { error: vi.fn() },
	readCheckImage: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ isPayloadUser: () => true }))
vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))
vi.mock('@/features/asset-check/services/start-check-session.service', () => ({
	completeCheckSessionAiCheck: mocks.completeCheckSessionAiCheck,
}))
vi.mock('@/app/api/check/read-check-image', () => ({
	readCheckImage: mocks.readCheckImage,
}))

import { POST } from './route'

function request() {
	const values = new Map<string, FormDataEntryValue>([['image', 'image']])
	return {
		formData: async () => ({ get: (key: string) => values.get(key) ?? null }),
	} as Request
}

const params = (checkSessionId = '41') => ({
	params: Promise.resolve({ checkSessionId }),
})

describe('POST /api/check/:checkSessionId/ai', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.authenticateRequest.mockResolvedValue({
			payload: { logger: mocks.logger },
			user: { id: 7 },
		})
		mocks.readCheckImage.mockResolvedValue({
			buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
			name: 'image.png',
		})
	})

	it.each([
		[new CheckSessionNotFoundError(), 404, 'Check session not found.'],
		[new CheckSessionInputMismatchError(), 409, 'Image does not match check session.'],
		[new CheckSessionTerminalError(), 409, 'Check session already finished.'],
	])('%s를 HTTP %i로 변환한다', async (error, status, message) => {
		mocks.completeCheckSessionAiCheck.mockRejectedValue(error)

		const response = await POST(request(), params())

		expect(response.status).toBe(status)
		await expect(response.json()).resolves.toEqual({ message })
		expect(mocks.completeCheckSessionAiCheck).toHaveBeenCalledWith({
			buffer: expect.any(Buffer),
			checkSessionId: 41,
			user: { id: 7 },
		})
		expect(mocks.logger.error).not.toHaveBeenCalled()
	})

	it('유효하지 않은 세션 ID를 거부한다', async () => {
		const response = await POST(request(), params('0'))

		expect(response.status).toBe(400)
		expect(mocks.completeCheckSessionAiCheck).not.toHaveBeenCalled()
	})
})
