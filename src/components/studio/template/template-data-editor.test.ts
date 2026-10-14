import { describe, expect, it } from 'vitest'
import { buildTemplateCreateInput } from './template-data-editor'
import { EMPTY_TEMPLATE_FORM, type TemplateFormValues } from './template-info-fields'

const imported = {
	html: '<div data-node-id="f" data-figma-type="FRAME"><p data-node-id="t">제목</p></div>',
	width: 1080,
	height: 1350,
}
const fields: TemplateFormValues = { ...EMPTY_TEMPLATE_FORM, name: ' 포스터 ', category: 3 }

describe('buildTemplateCreateInput', () => {
	it('admin 가져오기와 같이 조립한다 — 레이어 기본값은 편집 가능, 디지털은 크기를 서버에 맡긴다', () => {
		const input = buildTemplateCreateInput(imported, 'https://figma/x', fields)
		expect(input).toMatchObject({
			name: '포스터',
			category: 3,
			outputKind: 'digital',
			baseHtml: imported.html,
			width: 1080,
			height: 1350,
			overrides: { t: { creator: { access: 'editable' }, input: {} } },
		})
		expect(input).not.toHaveProperty('slug')
		expect(input).not.toHaveProperty('size')
		expect(input?.html).toContain('data-node-id="t"')
	})

	it('카테고리나 인쇄 크기가 없으면 만들 수 없다', () => {
		expect(buildTemplateCreateInput(imported, '', { ...fields, category: null })).toBeNull()
		expect(
			buildTemplateCreateInput(imported, '', { ...fields, outputKind: 'print' }),
		).toBeNull()
		expect(
			buildTemplateCreateInput(imported, '', {
				...fields,
				outputKind: 'print',
				sizeWidth: '297',
				sizeHeight: '371',
			})?.size,
		).toEqual({ width: 297, height: 371 })
	})
})
