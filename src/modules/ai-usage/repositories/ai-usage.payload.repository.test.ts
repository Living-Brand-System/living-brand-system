import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	error: vi.fn(),
	getPayload: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))

import { recordAiUsage } from './ai-usage.payload.repository'

describe('recordAiUsage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getPayload.mockResolvedValue({
			create: mocks.create,
			logger: { error: mocks.error },
		})
	})

	it('컬렉션 create가 닫혀 있으므로 trusted write로 남긴다', async () => {
		await recordAiUsage({
			createdBy: 7,
			feature: 'image-generation',
			model: 'gemini-3.1-flash-image',
			inputTokens: 12,
			totalTokens: 512,
			source: { relationTo: 'generated-images', value: 41 },
		})

		expect(mocks.create).toHaveBeenCalledWith({
			collection: 'ai-usage-events',
			data: expect.objectContaining({
				createdBy: 7,
				feature: 'image-generation',
				model: 'gemini-3.1-flash-image',
				inputTokens: 12,
				totalTokens: 512,
				source: { relationTo: 'generated-images', value: 41 },
			}),
			overrideAccess: true,
		})
	})

	it('provider가 토큰을 하나도 안 주면 빈 행을 쌓지 않는다', async () => {
		await recordAiUsage({ createdBy: 7, feature: 'agent-chat', model: 'claude-opus-5' })

		expect(mocks.create).not.toHaveBeenCalled()
	})

	// 🔴 계량이 던지면 이미 성공한 생성·검수가 통째로 실패한 것처럼 보인다.
	it('저장이 실패해도 호출자에게 던지지 않는다', async () => {
		mocks.create.mockRejectedValue(new Error('db down'))

		await expect(
			recordAiUsage({
				createdBy: 7,
				feature: 'asset-check',
				model: 'claude-opus-5',
				totalTokens: 100,
			}),
		).resolves.toBeUndefined()
		expect(mocks.error).toHaveBeenCalled()
	})
})
