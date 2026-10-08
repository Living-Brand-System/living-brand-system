import { beforeEach, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ find: vi.fn(), findByID: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
	getPayload: async () => ({ find: mocks.find, findByID: mocks.findByID }),
}))

import { findStudioProfile } from './studio-profile.payload.repository'

const user = { id: 7 } as never

beforeEach(() => vi.clearAllMocks())

test('id 조회는 findByID로, 요청자 권한으로 읽는다', async () => {
	mocks.findByID.mockResolvedValue({ id: 3, _status: 'published' })

	await expect(
		findStudioProfile({ collection: 'templates', by: 'id', id: 3 }, { draft: true, user }),
	).resolves.toEqual({ id: 3, _status: 'published' })
	expect(mocks.findByID).toHaveBeenCalledWith(
		expect.objectContaining({
			collection: 'templates',
			id: 3,
			draft: true,
			overrideAccess: false,
			user,
		}),
	)
	expect(mocks.find).not.toHaveBeenCalled()
})

test('runtime 조회는 unique 필드로 한 건만 찾는다', async () => {
	mocks.find.mockResolvedValue({ docs: [{ id: 9 }] })

	await expect(
		findStudioProfile(
			{ collection: 'graphic-profiles', by: 'runtime', runtime: 'key-visual-pattern' },
			{ draft: false, user },
		),
	).resolves.toEqual({ id: 9 })
	expect(mocks.find).toHaveBeenCalledWith(
		expect.objectContaining({
			collection: 'graphic-profiles',
			where: { runtime: { equals: 'key-visual-pattern' } },
			limit: 1,
			draft: false,
		}),
	)
})
