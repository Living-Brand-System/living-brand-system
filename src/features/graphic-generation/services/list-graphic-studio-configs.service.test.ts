import { describe, expect, it, vi } from 'vitest'
import { listPublishedGraphicProfileDefinitions } from '@/features/graphic-generation/repositories/canvas-profile.payload.repository'
import { listGraphicStudioConfigs } from './list-graphic-studio-configs.service'

vi.mock('@/features/graphic-generation/repositories/canvas-profile.payload.repository', () => ({
	listPublishedGraphicProfileDefinitions: vi.fn(),
}))

describe('listGraphicStudioConfigs', () => {
	it('published profile만 Effective Config로 노출한다', async () => {
		vi.mocked(listPublishedGraphicProfileDefinitions).mockResolvedValueOnce([])
		await expect(listGraphicStudioConfigs({})).resolves.toEqual([])

		vi.mocked(listPublishedGraphicProfileDefinitions).mockResolvedValueOnce([
			{ id: 3, name: '브랜드 그래픽', runtime: 'forward-straight' },
		])
		await expect(listGraphicStudioConfigs({})).resolves.toEqual([
			expect.objectContaining({ id: 'forward-straight', name: '브랜드 그래픽' }),
		])
	})

	it('출력 형식과 무관하게 published runtime을 모두 노출한다', async () => {
		vi.mocked(listPublishedGraphicProfileDefinitions).mockResolvedValueOnce([
			{ id: 3, name: 'SVG', runtime: 'forward-straight' },
			{ id: 4, name: 'Shader', runtime: 'fluted-glass' },
		])
		await expect(listGraphicStudioConfigs({})).resolves.toEqual([
			expect.objectContaining({ id: 'forward-straight' }),
			expect.objectContaining({ id: 'fluted-glass' }),
		])
	})
})
