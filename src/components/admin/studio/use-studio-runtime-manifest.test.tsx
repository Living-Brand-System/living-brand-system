import { renderHook } from '@testing-library/react'
import type { FormState } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import { IMAGE_STUDIO_CONTROL_IDS } from '@/features/image-generation/domain/image-runtime-manifest'
import { useStudioRuntimeManifest } from './use-studio-runtime-manifest'

const payloadForm = vi.hoisted(() => ({ fields: {} as FormState }))

vi.mock('@payloadcms/ui', () => ({
	useFormFields: (select: (state: [FormState]) => unknown) => select([payloadForm.fields]),
}))

describe('useStudioRuntimeManifest', () => {
	it('Payload blocks 하위 경로에서 Image feature 배열을 복원한다', () => {
		payloadForm.fields = {
			imageModelPreset: { value: 'openai-gpt-image-2' },
			features: {
				value: 1,
				disableFormData: true,
				rows: [{ id: 'feature-color', blockType: 'colorAdjustment' }],
			},
			'features.0.id': { value: 'feature-color' },
			'features.0.blockType': { value: 'colorAdjustment' },
			'features.0.background': { value: true },
		}

		const { result } = renderHook(() => useStudioRuntimeManifest('image', []))
		const controlIds = result.current?.controller.groups.flatMap(({ controls }) =>
			controls.map(({ id }) => id),
		)

		expect(controlIds).toEqual(
			expect.arrayContaining([
				IMAGE_STUDIO_CONTROL_IDS.lineColor,
				IMAGE_STUDIO_CONTROL_IDS.backgroundColor,
			]),
		)
	})
	it('Graph 편집 화면은 Template이 아니라 선택한 Graph runtime의 매니페스트를 그린다', () => {
		payloadForm.fields = { runtime: { value: 'infographic' } }
		const infographic = { id: 'infographic', controller: { groups: [] }, artifacts: [] }

		const { result } = renderHook(() =>
			// biome-ignore lint/suspicious/noExplicitAny: 매니페스트 선택만 본다
			useStudioRuntimeManifest('graph', [infographic as any]),
		)

		expect(result.current).toBe(infographic)
	})
})
