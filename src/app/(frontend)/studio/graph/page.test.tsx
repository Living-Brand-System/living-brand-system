import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	requireUser: vi.fn(),
	listGraphStudioConfigs: vi.fn(),
}))

vi.mock('@/lib/request-auth', () => ({ requireUser: mocks.requireUser }))
vi.mock('@/features/graphic-generation/services/list-graph-studio-configs.service', () => ({
	listGraphStudioConfigs: mocks.listGraphStudioConfigs,
}))

import GenerateGraphProfilePage from './[profileSlug]/page'
import GenerateGraphPage from './page'

describe('Graph Studio pages', () => {
	it.each([
		'worker',
		'manager',
	])('%s에게는 404를 내고 프로파일을 조회하지 않는다', async (role) => {
		mocks.requireUser.mockResolvedValue({ user: { role } })

		await expect(GenerateGraphPage()).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
		await expect(
			GenerateGraphProfilePage({ params: Promise.resolve({ profileSlug: 'bar' }) }),
		).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
		expect(mocks.listGraphStudioConfigs).not.toHaveBeenCalled()
	})
})
