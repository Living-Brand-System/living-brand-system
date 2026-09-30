import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import {
	findPublishedImageProfile,
	listPublishedImageProfiles,
} from './image-profile.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('findPublishedImageProfile', () => {
	it('선택 목록은 published 프로파일을 내비게이션 순서로 반환한다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{ id: 5, name: '일러스트레이션', slug: 'illustration' },
				{ id: 7, name: '그라디언트', slug: 'gradient' },
			],
		})
		vi.mocked(getPayload).mockResolvedValue({ find } as never)
		const user = { id: 1 }

		await expect(listPublishedImageProfiles(user)).resolves.toEqual([
			{ id: 5, name: '일러스트레이션', slug: 'illustration' },
			{ id: 7, name: '그라디언트', slug: 'gradient' },
		])
		expect(find).toHaveBeenCalledWith({
			collection: 'image-profiles',
			depth: 0,
			draft: false,
			limit: 100,
			overrideAccess: false,
			select: { name: true, slug: true },
			sort: 'displayOrder',
			user,
			where: { _status: { equals: 'published' } },
		})
	})

	it('사용자 권한으로 published 프로파일만 조회한다', async () => {
		const profile = { id: 5, name: '브랜드 제품컷' }
		const find = vi.fn().mockResolvedValue({ docs: [profile] })
		vi.mocked(getPayload).mockResolvedValue({ find } as never)
		const user = { email: 'worker@example.com', id: 1, role: 'worker' }

		await expect(findPublishedImageProfile(user, 5)).resolves.toBe(profile)
		expect(find).toHaveBeenCalledWith({
			collection: 'image-profiles',
			depth: 0,
			draft: false,
			limit: 1,
			overrideAccess: true,
			user,
			where: {
				and: [{ id: { equals: 5 } }, { _status: { equals: 'published' } }],
			},
		})
	})

	it('trusted profile read는 Payload 인증 문서가 아니면 실행하지 않는다', async () => {
		const find = vi.fn()
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await expect(findPublishedImageProfile({ id: 1 }, 5)).rejects.toThrow(
			'Authenticated image profile consumer is required.',
		)
		expect(find).not.toHaveBeenCalled()
	})
})
