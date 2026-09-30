import { expect, it } from 'vitest'
import { type CmsSection, withSectionHierarchy } from './model'

it('저장 순서를 유지하고 연속 서브섹션의 부모를 앞선 H2로 계산한다', () => {
	const sections: Pick<CmsSection, 'id' | 'anchor' | 'type' | 'title'>[] = [
		{ id: 'overview', type: 'section', title: 'Overview' },
		{ id: 'construction', type: 'subsection', title: 'Construction' },
		{ anchor: 'clearspace', type: 'subsection', title: 'Clearspace' },
		{ id: 'incorrect', type: 'incorrect-usages', title: '사용하지 않는 제목' },
		{ id: 'examples', type: 'subsection', title: 'Examples' },
		{ type: 'section', title: 'Applications' },
	]
	const before = structuredClone(sections)
	const result = withSectionHierarchy(sections)
	expect(
		result.map(({ id, headingLevel, parentSectionId }) => [id, headingLevel, parentSectionId]),
	).toEqual([
		['overview', 2, null],
		['construction', 3, 'overview'],
		['clearspace', 3, 'overview'],
		['incorrect', 2, null],
		['examples', 3, 'incorrect'],
		['section-5', 2, null],
	])
	expect(result[3].title).toBe('Incorrect Usages')
	expect(sections).toEqual(before)
	expect(withSectionHierarchy([])).toEqual([])
})

it('저장 검증 전 초안의 고아 서브섹션에 가짜 부모를 붙이지 않는다', () => {
	expect(withSectionHierarchy([{ type: 'subsection', title: 'Orphan' }])[0]).toMatchObject({
		headingLevel: 3,
		parentSectionId: null,
	})
})
