import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	findStudioProfile: vi.fn(),
	updateStudioProfilePreview: vi.fn(),
	storePublishedApplicationImage: vi.fn(),
}))

vi.mock('@/repositories/studio-profile.payload.repository', () => ({
	findStudioProfile: mocks.findStudioProfile,
	updateStudioProfilePreview: mocks.updateStudioProfilePreview,
}))
vi.mock('@/features/application-image/services/store-application-image.service', () => ({
	storePublishedApplicationImage: mocks.storePublishedApplicationImage,
}))

import {
	StudioProfileDraftPendingError,
	StudioProfileNotFoundError,
	updateProfilePreview,
} from './update-profile-preview.service'

const user = { id: 7 } as never
const png = Buffer.from('png')

describe('updateProfilePreview', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.findStudioProfile.mockResolvedValue({
			id: 9,
			name: 'Key Visual',
			_status: 'published',
		})
		mocks.storePublishedApplicationImage.mockResolvedValue({ id: 100 })
		mocks.updateStudioProfilePreview.mockResolvedValue({
			previewImage: { url: '/api/application-images/file/p.png', alt: 'alt' },
		})
	})

	it('graphic은 숫자 id가 아니라 runtime으로 프로파일을 찾는다', async () => {
		await updateProfilePreview({
			studio: 'graphic',
			profileId: 'key-visual-pattern',
			png,
			user,
		})

		expect(mocks.findStudioProfile).toHaveBeenCalledWith(
			{ collection: 'graphic-profiles', by: 'runtime', runtime: 'key-visual-pattern' },
			{ draft: true, user },
		)
		expect(mocks.updateStudioProfilePreview).toHaveBeenCalledWith(
			expect.objectContaining({ collection: 'graphic-profiles', id: 9 }),
		)
	})

	it('🔴 갱신이 게시 상태를 초안으로 떨어뜨리지 않는다 — 읽은 _status를 그대로 되쓴다', async () => {
		const result = await updateProfilePreview({ studio: 'template', profileId: '3', png, user })

		expect(mocks.findStudioProfile).toHaveBeenCalledWith(
			{ collection: 'templates', by: 'id', id: 3 },
			{ draft: true, user },
		)
		expect(mocks.updateStudioProfilePreview).toHaveBeenCalledWith(
			expect.objectContaining({ previewImageId: 100, status: 'published' }),
		)
		expect(result).toEqual({ url: '/api/application-images/file/p.png', alt: 'alt' })
	})

	it('🔴 발행본 위에 초안이 얹혀 있으면 갱신하지 않는다', async () => {
		mocks.findStudioProfile.mockImplementation(
			async (_lookup, { draft }: { draft: boolean }) => ({
				id: 3,
				name: '템플릿',
				_status: draft ? 'draft' : 'published',
			}),
		)

		await expect(
			updateProfilePreview({ studio: 'template', profileId: '3', png, user }),
		).rejects.toBeInstanceOf(StudioProfileDraftPendingError)
		expect(mocks.storePublishedApplicationImage).not.toHaveBeenCalled()
		expect(mocks.updateStudioProfilePreview).not.toHaveBeenCalled()
	})

	it('미리보기 이미지는 프로파일 이름으로 published 행을 새로 만든다', async () => {
		await updateProfilePreview({ studio: 'template', profileId: '3', png, user })

		expect(mocks.storePublishedApplicationImage).toHaveBeenCalledWith({
			name: 'Key Visual 미리보기',
			alt: 'Key Visual 미리보기 이미지',
			data: png,
			filename: 'templates-9-preview.png',
			mimeType: 'image/png',
			user,
		})
	})

	it('프로파일이 없으면 NotFound를 던진다', async () => {
		mocks.findStudioProfile.mockResolvedValue(undefined)

		await expect(
			updateProfilePreview({ studio: 'graphic', profileId: 'nope', png, user }),
		).rejects.toBeInstanceOf(StudioProfileNotFoundError)
		expect(mocks.storePublishedApplicationImage).not.toHaveBeenCalled()
	})
})
