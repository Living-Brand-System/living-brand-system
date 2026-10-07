import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { listPublishedImageProfileDefinitions } from './image-studio-profile.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('listPublishedImageProfileDefinitions', () => {
	it('인증 사용자의 published Config 파생 필드만 trusted read한다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [
				{
					id: 5,
					name: '일러스트레이션',
					slug: 'illustration',
					imageModelPreset: 'openai-gpt-image-2',
				},
			],
		})
		vi.mocked(getPayload).mockResolvedValue({ find } as never)
		const user = { email: 'worker@example.com', id: 1, role: 'worker' }

		await listPublishedImageProfileDefinitions(user)

		expect(find).toHaveBeenCalledWith({
			collection: 'image-profiles',
			depth: 1,
			draft: false,
			limit: 100,
			overrideAccess: true,
			select: {
				controllerRestrictions: true,
				features: true,
				imageModelPreset: true,
				name: true,
				exportPolicy: true,
				previewImage: true,
				slug: true,
			},
			sort: 'displayOrder',
			user,
			where: { _status: { equals: 'published' } },
		})
		expect(find.mock.calls[0]?.[0].select).not.toHaveProperty('profilePrompt')
		expect(find.mock.calls[0]?.[0].select).not.toHaveProperty('userPromptNormalization')
	})

	it('Payload 인증 문서가 아니면 trusted read를 실행하지 않는다', async () => {
		const find = vi.fn()
		vi.mocked(getPayload).mockResolvedValue({ find } as never)

		await expect(listPublishedImageProfileDefinitions({ id: 1 })).rejects.toThrow(
			'Authenticated image profile consumer is required.',
		)
		expect(find).not.toHaveBeenCalled()
	})
})
