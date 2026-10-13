import { describe, expect, it } from 'vitest'
import { buildTemplateInfoPatch, toTemplateFormValues } from './template-info-form'

const record = {
	id: 1,
	name: 'Poster',
	slug: 'poster',
	description: null,
	categoryId: 2,
	outputKind: 'digital' as const,
	width: 1080,
	height: 1350,
	size: null,
	status: 'published' as const,
	updatedAt: '2026-10-13T00:00:00.000Z',
}

describe('템플릿 기본 정보 폼', () => {
	it('디지털 판형 크기가 비어 있으면 Figma 판 px로 채워 그대로 저장할 수 있다', () => {
		expect(buildTemplateInfoPatch(toTemplateFormValues(record))).toEqual({
			name: 'Poster',
			slug: 'poster',
			description: '',
			category: 2,
			outputKind: 'digital',
			size: { width: 1080, height: 1350 },
		})
	})

	it('주소·카테고리·크기가 비면 저장하지 않는다', () => {
		const values = toTemplateFormValues(record)
		expect(buildTemplateInfoPatch({ ...values, slug: ' ' })).toBeNull()
		expect(buildTemplateInfoPatch({ ...values, category: null })).toBeNull()
		expect(buildTemplateInfoPatch({ ...values, sizeHeight: '' })).toBeNull()
	})
})
