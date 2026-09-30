import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { listPublishedGraphicProfileDefinitions } from './canvas-profile.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('listPublishedGraphicProfileDefinitions', () => {
	it('사용자 권한으로 published 안전 필드만 조회한다', async () => {
		const docs = [{ id: 3, name: 'Forward', runtime: 'forward-straight' }]
		const find = vi.fn().mockResolvedValue({ docs })
		vi.mocked(getPayload).mockResolvedValue({ find } as never)
		const user = { email: 'worker@example.com', id: 1, role: 'worker' }

		await expect(listPublishedGraphicProfileDefinitions(user)).resolves.toEqual(docs)
		expect(find).toHaveBeenCalledWith({
			collection: 'graphic-profiles',
			depth: 1,
			draft: false,
			limit: 100,
			overrideAccess: false,
			select: {
				controllerPresentation: true,
				controllerRestrictions: true,
				name: true,
				// 🔴 빠지면 타입은 통과하는데 프로파일 프리셋이 런타임에서 영원히 undefined다.
				exportPolicy: true,
				previewImage: true,
				runtime: true,
			},
			sort: 'displayOrder',
			user,
			where: { _status: { equals: 'published' } },
		})
	})

	it('Payload 사용자가 아니면 조회하지 않는다', async () => {
		const find = vi.fn()
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await expect(listPublishedGraphicProfileDefinitions({ id: 1 })).rejects.toThrow(
			'Authenticated canvas profile consumer is required.',
		)
		expect(find).not.toHaveBeenCalled()
	})
})
