// @vitest-environment node
import { expect, it, vi } from 'vitest'

vi.mock('@/features/guideline/checks/validate-guideline-document-slug', () => ({
	validateGuidelineDocumentSlug: vi.fn(),
}))

import { GuidelineDocuments } from './GuidelineDocuments'

it('CMS는 섹션만 저작하며 이력 형식은 읽기 응답에서도 숨긴다', () => {
	const fields = GuidelineDocuments.fields
	expect(fields.some((field) => 'name' in field && field.name === 'blocks')).toBe(false)
	const marker = fields.find((field) => 'name' in field && field.name === 'contentModel')
	expect(marker).toMatchObject({
		hidden: true,
		admin: { hidden: true },
	})
	if (!marker || !('access' in marker)) throw new Error('이력 표식 필드가 없습니다.')
	expect(marker.access?.read?.({} as never)).toBe(false)
	const sections = fields.find((field) => 'name' in field && field.name === 'sections')
	expect(sections?.admin?.condition).toBeUndefined()
})

it('초안·게시 저장의 legacy 입력과 구형 버전 복원을 거절한다', async () => {
	const hook = GuidelineDocuments.hooks?.beforeValidate?.[0]
	if (!hook) throw new Error('저장 경계가 없습니다.')
	for (const data of [
		{ contentModel: 'legacy' },
		{ blocks: [] },
		{ blocks: [{ blockType: 'section' }] },
	]) {
		expect(() => hook({ data, context: {} } as never)).toThrow('기존 본문 형식')
	}
	expect(() =>
		hook({
			data: { contentModel: 'legacy', sections: [] },
			context: { isRestoringVersion: true },
		} as never),
	).toThrow('기존 본문 형식')
	expect(() => hook({ data: {}, context: { isRestoringVersion: true } } as never)).toThrow(
		'기존 본문 형식',
	)
	expect(() =>
		hook({ data: { contentModel: null }, context: { isRestoringVersion: true } } as never),
	).toThrow('기존 본문 형식')
	expect(await hook({ data: { title: 'Updated' }, context: {} } as never)).toEqual({
		title: 'Updated',
		contentModel: 'sections',
	})
	expect(
		await hook({
			data: { contentModel: 'sections', sections: [] },
			context: { isRestoringVersion: true },
		} as never),
	).toEqual({ contentModel: 'sections', sections: [] })
})
