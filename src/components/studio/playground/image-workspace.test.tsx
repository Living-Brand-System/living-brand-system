import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { deriveImageStudioConfig } from '@/features/image-generation/domain/image-studio-config'
import { PlaygroundImageWorkspace } from './image-workspace'

const mocks = vi.hoisted(() => ({
	profiles: vi.fn(),
	generate: vi.fn(),
	prepare: vi.fn(),
	export: vi
		.fn()
		.mockResolvedValue({ data: new Blob(), filename: 'image.png', mimeType: 'image/png' }),
	download: vi.fn(),
}))
vi.mock('@/features/image-generation/services/list-image-studio-configs.client', () => ({
	fetchImageStudioConfigs: mocks.profiles,
}))
vi.mock('@/features/image-generation/services/generate-image.client', () => ({
	requestImageGeneration: mocks.generate,
}))
vi.mock(
	'@/features/image-generation/runtime/reference-image/prepare-reference-image.client',
	() => ({ prepareReferenceImage: mocks.prepare }),
)
vi.mock('@/features/studio-export/services/export-artifact.client', () => ({
	executeArtifactExport: mocks.export,
}))
vi.mock('@/features/studio-export/adapters/download-export-result.client', () => ({
	downloadExportResult: mocks.download,
}))
vi.mock('@/components/shared/controller/camera-orbit-control', () => ({
	CameraOrbitControl: () => <div>카메라 미리보기</div>,
}))

const profile = deriveImageStudioConfig({
	id: 41,
	name: '실제 경로 테스트',
	slug: 'test',
	imageModelPreset: 'google-nano-banana-2-lite',
	features: [
		{ blockType: 'colorAdjustment', background: true },
		{ blockType: 'cameraControl' },
		{ blockType: 'referenceImage' },
	],
})
const basic = deriveImageStudioConfig({
	id: 42,
	name: '프롬프트 전용',
	slug: 'basic',
	imageModelPreset: 'openai-gpt-image-2',
	features: [],
})
const result = {
	images: ['/test-image.png'],
	generatedImages: [{ id: 91, url: '/test-image.png', createdAt: '2026-09-28T00:00:00Z' }],
	profileId: 41,
	profileName: profile.name,
	aspectRatio: '2:3',
	imageSize: '1K',
}

beforeEach(() => {
	vi.clearAllMocks()
	mocks.profiles.mockResolvedValue([profile, basic])
	mocks.generate.mockResolvedValue(result)
	mocks.prepare.mockResolvedValue(new Blob(['image'], { type: 'image/webp' }))
	Object.defineProperties(HTMLElement.prototype, {
		hasPointerCapture: { configurable: true, value: vi.fn(() => false) },
		scrollIntoView: { configurable: true, value: vi.fn() },
	})
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
})
afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
	Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
	Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
})
async function setup() {
	const user = userEvent.setup()
	render(
		<TooltipProvider>
			<PlaygroundImageWorkspace />
		</TooltipProvider>,
	)
	await screen.findByRole('textbox', { name: 'Prompt' })
	return user
}

it('발행 계약으로 생성·색 조정·시점 변경·저장을 연결하고 Reset은 세션을 비운다', async () => {
	const user = await setup()
	const cameraToggle = within(screen.getByRole('radiogroup', { name: 'Camera Control 사용' }))
	expect(cameraToggle.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
	expect(cameraToggle.getByRole('radio', { name: 'On' })).toBeDisabled()
	expect(
		screen.queryByText('색을 선택하기 전에는 원본 색상을 사용합니다.'),
	).not.toBeInTheDocument()
	expect(screen.queryByText('카메라 시점을 조정할 수 있습니다.')).not.toBeInTheDocument()
	expect(screen.getByRole('button', { name: '이미지 생성' })).toBeDisabled()
	expect(screen.queryByRole('combobox', { name: '해상도' })).not.toBeInTheDocument()
	await user.type(screen.getByRole('textbox', { name: 'Prompt' }), '작은 나무 한 그루')
	await user.click(screen.getByRole('button', { name: '이미지 생성' }))
	await waitFor(() =>
		expect(mocks.generate).toHaveBeenCalledWith(
			expect.objectContaining({
				profileId: 41,
				prompt: '작은 나무 한 그루',
				imageSize: '1K',
				aspectRatio: '2:3',
				count: 4,
			}),
		),
	)
	await screen.findByRole('img', { name: '생성 결과 1' })
	expect(cameraToggle.getByRole('radio', { name: 'On' })).toBeEnabled()
	expect(cameraToggle.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
	expect(screen.queryByText('카메라 미리보기')).not.toBeInTheDocument()
	await user.click(cameraToggle.getByRole('radio', { name: 'On' }))
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toBeDisabled()
	expect(
		within(screen.getByRole('radiogroup', { name: 'Reference Image 사용' })).getByRole(
			'radio',
			{ name: 'Off' },
		),
	).toHaveAttribute('aria-checked', 'true')
	expect(screen.getAllByRole('button', { name: '이미지 생성' })).toHaveLength(1)
	await user.click(screen.getByRole('radio', { name: '색 조합 4' }))
	await user.click(screen.getByRole('button', { name: '선택 저장' }))
	await waitFor(() => expect(mocks.export).toHaveBeenCalled())
	await waitFor(() => expect(mocks.download).toHaveBeenCalled())
	await user.click(screen.getByRole('button', { name: '이미지 생성' }))
	await waitFor(() =>
		expect(mocks.generate).toHaveBeenLastCalledWith(
			expect.objectContaining({
				reference: { generatedImageId: 91 },
				camera: { azimuthDeg: 0, elevationDeg: 0 },
				count: 1,
				prompt: '',
			}),
		),
	)
	await user.click(screen.getByRole('button', { name: 'Reset' }))
	const resetCameraToggle = within(
		screen.getByRole('radiogroup', { name: 'Camera Control 사용' }),
	)
	expect(resetCameraToggle.getByRole('radio', { name: 'Off' })).toHaveAttribute(
		'aria-checked',
		'true',
	)
	expect(resetCameraToggle.getByRole('radio', { name: 'On' })).toBeDisabled()
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('')
	expect(screen.queryByRole('img', { name: '생성 결과 1' })).not.toBeInTheDocument()
	expect(screen.getByRole('button', { name: '선택 저장' })).toBeDisabled()
	expect(screen.queryByRole('button', { name: '선택 이미지 시점 변경' })).not.toBeInTheDocument()
})

it('Reference와 Camera는 상호 배타적으로 실행하고 Off는 첨부를 보존하며 Change는 초기화한다', async () => {
	const user = await setup()
	const upload = document.querySelector<HTMLInputElement>('input[type="file"]')
	if (!upload) throw new Error('첨부 입력이 없습니다.')
	await user.upload(upload, new File(['source'], 'seed.png', { type: 'image/png' }))
	await waitFor(() => expect(mocks.prepare).toHaveBeenCalled())
	await waitFor(() =>
		expect(screen.queryByText('참조 이미지를 준비하고 있어요…')).not.toBeInTheDocument(),
	)
	await user.type(screen.getByRole('textbox', { name: 'Prompt' }), '투명한 유리')
	await user.click(screen.getByRole('button', { name: '이미지 생성' }))
	await waitFor(() =>
		expect(mocks.generate).toHaveBeenCalledWith(
			expect.objectContaining({
				reference: { upload: expect.stringMatching(/^data:image\/webp;base64,/) },
			}),
		),
	)
	await screen.findByRole('img', { name: '생성 결과 1' })
	await user.click(
		within(screen.getByRole('radiogroup', { name: 'Reference Image 사용' })).getByRole(
			'radio',
			{ name: 'Off' },
		),
	)
	await user.click(screen.getByRole('button', { name: '이미지 생성' }))
	await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(2))
	expect(mocks.generate.mock.calls[1][0].reference).toBeUndefined()
	await waitFor(() => expect(screen.getByRole('button', { name: '이미지 생성' })).toBeEnabled())
	const referenceToggle = within(screen.getByRole('radiogroup', { name: 'Reference Image 사용' }))
	const cameraToggle = within(screen.getByRole('radiogroup', { name: 'Camera Control 사용' }))
	await user.click(referenceToggle.getByRole('radio', { name: 'On' }))
	expect(screen.getByRole('img', { name: '첨부한 참조 이미지: seed.png' })).toBeInTheDocument()
	await user.click(cameraToggle.getByRole('radio', { name: 'On' }))
	expect(referenceToggle.getByRole('radio', { name: 'Off' })).toHaveAttribute(
		'aria-checked',
		'true',
	)
	await user.click(screen.getByRole('button', { name: '이미지 생성' }))
	await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(3))
	expect(mocks.generate.mock.calls[2][0].reference).toEqual({ generatedImageId: 91 })
	await waitFor(() => expect(referenceToggle.getByRole('radio', { name: 'On' })).toBeEnabled())
	await user.click(referenceToggle.getByRole('radio', { name: 'On' }))
	expect(cameraToggle.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true')
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toBeEnabled()
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('투명한 유리')
	expect(screen.getByRole('img', { name: '첨부한 참조 이미지: seed.png' })).toBeInTheDocument()
	await user.click(screen.getByRole('button', { name: '이미지 생성' }))
	await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(4))
	expect(mocks.generate.mock.calls[3][0].reference).toEqual({
		upload: expect.stringMatching(/^data:image\/webp;base64,/),
	})
	await waitFor(() => expect(screen.getByRole('button', { name: '이미지 생성' })).toBeEnabled())
	await user.click(screen.getByRole('button', { name: '프로파일 변경' }))
	await user.click(screen.getByRole('button', { name: '프롬프트 전용' }))
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('')
	expect(screen.queryByRole('group', { name: 'Color' })).not.toBeInTheDocument()
	expect(screen.queryByRole('group', { name: 'Camera Control' })).not.toBeInTheDocument()
	expect(screen.queryByRole('group', { name: 'Reference Image' })).not.toBeInTheDocument()
})

it('목록 오류는 재시도할 수 있고 Reset 이전 응답이 새 세션에 나타나지 않는다', async () => {
	mocks.profiles.mockRejectedValueOnce(new Error('Unauthorized'))
	const user = userEvent.setup()
	render(
		<TooltipProvider>
			<PlaygroundImageWorkspace />
		</TooltipProvider>,
	)
	await screen.findByRole('alert')
	await user.click(screen.getByRole('button', { name: '다시 시도' }))
	await screen.findByRole('textbox', { name: 'Prompt' })
	let complete!: (value: typeof result) => void
	mocks.generate.mockReturnValueOnce(
		new Promise((resolve) => {
			complete = resolve
		}),
	)
	await user.type(screen.getByRole('textbox', { name: 'Prompt' }), '지연 응답')
	await user.click(screen.getByRole('button', { name: '이미지 생성' }))
	await user.click(screen.getByRole('button', { name: 'Reset' }))
	await act(async () => complete(result))
	expect(screen.queryByRole('img', { name: '생성 결과 1' })).not.toBeInTheDocument()
	expect(screen.getByRole('textbox', { name: 'Prompt' })).toHaveValue('')
})
