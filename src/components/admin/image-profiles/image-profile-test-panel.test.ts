import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageProfileTestPanel } from './image-profile-test-panel'

const mocks = vi.hoisted(() => ({
	getData: vi.fn(),
	getDataByPath: vi.fn(),
	requestAdminImageGeneration: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
	useForm: () => ({
		getData: mocks.getData,
		getDataByPath: mocks.getDataByPath,
	}),
}))
vi.mock('@/features/image-generation/services/generate-image.client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	requestAdminImageGeneration: mocks.requestAdminImageGeneration,
}))

describe('ImageProfileTestPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.getData.mockReturnValue({
			imageModelPreset: 'google-nano-banana-2-lite',
			features: [],
			controllerRestrictions: {
				controls: [{ controlId: 'ratio', defaultValue: '16:9' }],
			},
		})
		mocks.getDataByPath.mockImplementation((path: string) => {
			if (path === 'profilePrompt') return [{ key: 'style', value: 'technical line art' }]
			if (path === 'userPromptNormalization') {
				return [{ key: 'view', candidates: [{ value: 'isometric' }] }]
			}
		})
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					finalPrompt: { style: 'technical line art', subject: '굴착기' },
					normalizedInput: {},
				}),
			}),
		)
		mocks.requestAdminImageGeneration.mockResolvedValue({
			images: ['data:image/png;base64,test'],
		})
	})

	afterEach(() => {
		cleanup()
		vi.unstubAllGlobals()
	})

	it('저장된 후보는 보내지 않고 현재 배열 폼 값으로 생성한다', async () => {
		render(createElement(ImageProfileTestPanel))

		fireEvent.change(screen.getByLabelText('유저 인풋 프롬프트'), {
			target: { value: '굴착기' },
		})
		fireEvent.click(screen.getByRole('button', { name: '이미지 생성' }))

		await waitFor(() => expect(mocks.requestAdminImageGeneration).toHaveBeenCalledOnce())
		expect(fetch).toHaveBeenCalledWith(
			'/api/image-profiles/normalize',
			expect.objectContaining({
				body: JSON.stringify({
					profilePrompt: [{ key: 'style', value: 'technical line art' }],
					userPromptNormalization: [],
					userPrompt: '굴착기',
				}),
			}),
		)
		expect(mocks.requestAdminImageGeneration).toHaveBeenCalledWith({
			aspectRatio: '16:9',
			count: 1,
			imageModelPreset: 'google-nano-banana-2-lite',
			imageSize: '1K',
			prompt: JSON.stringify({ style: 'technical line art', subject: '굴착기' }),
		})
	})
})
