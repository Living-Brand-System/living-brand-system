import { cleanup, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { IMAGE_UNRESTRICTED_CONTROL_IDS } from '@/features/image-generation/domain/image-studio-config'
import { StudioControllerRestrictionsField } from './studio-controller-restrictions-field'

const field = vi.hoisted(() => ({ value: undefined as unknown }))
const form = vi.hoisted(() => ({
	fields: {
		imageModelPreset: { value: 'openai-gpt-image-2' },
		features: {
			value: 1,
			disableFormData: true,
			rows: [{ id: 'color', blockType: 'colorAdjustment' }],
		},
		'features.0.id': { value: 'color' },
		'features.0.blockType': { value: 'colorAdjustment' },
		'features.0.background': { value: true },
	},
}))

vi.mock('@payloadcms/ui', () => ({
	FieldDescription: () => null,
	FieldError: () => null,
	useField: () => ({
		disabled: false,
		errorMessage: '',
		showError: false,
		setValue: vi.fn(),
		value: field.value,
	}),
	useFormFields: (select: (state: [typeof form.fields]) => unknown) => select([form.fields]),
}))

afterEach(cleanup)

// 프롬프트·색은 어드민이 좁히지 않는다(2026-10-07) — 화면에 그리지 않고, 남은 저장값은 정리 대상이다.
it('좁히지 않는 컨트롤은 그리지 않고 저장값은 정리 대상으로 센다', () => {
	field.value = { controls: [{ controlId: 'prompt', maxLength: 120 }] }
	render(
		createElement(StudioControllerRestrictionsField, {
			path: 'controllerRestrictions',
			source: 'image',
			unrestrictedControlIds: IMAGE_UNRESTRICTED_CONTROL_IDS,
		} as never),
	)

	expect(screen.queryByText('Prompt')).not.toBeInTheDocument()
	expect(screen.queryByText('Line Color')).not.toBeInTheDocument()
	expect(screen.queryByText('Background Color')).not.toBeInTheDocument()
	expect(screen.getByText('resolution')).toBeInTheDocument()
	expect(screen.getByRole('button', { name: /컨트롤 제한 1개 정리/ })).toBeInTheDocument()
})
