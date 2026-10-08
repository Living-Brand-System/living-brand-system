import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	findGuidelineDocumentRuleReferences,
	hasGuidelineDocumentSlugConflict,
} from './guideline-document.payload.repository'

describe('guideline-document Payload repository', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// 🔴 slug는 챕터 안에서만 고유하다 — 다른 챕터에 같은 slug가 있어도 충돌이 아니다.
	it('slug 충돌 query를 챕터 스코프로 가둔다', async () => {
		const find = vi.fn().mockResolvedValue({ docs: [{ id: 9 }] })
		const req = { locale: 'ko', payload: { find }, user: { id: 7 } } as never

		await expect(
			hasGuidelineDocumentSlugConflict(req, { slug: 'logo', chapterId: 2, currentId: 7 }),
		).resolves.toBe(true)
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					and: [
						{ slug: { equals: 'logo' } },
						{ chapter: { equals: 2 } },
						{ id: { not_equals: 7 } },
					],
				},
			}),
		)
	})

	// 챕터가 비어 있는 초안도 충돌 검사를 통과해야 한다 — required 검증은 초안에서 건너뛴다.
	it('챕터가 없으면 챕터 없는 문서끼리만 비교한다', async () => {
		const find = vi.fn().mockResolvedValue({ docs: [] })
		const req = { locale: 'ko', payload: { find }, user: null } as never

		await expect(
			hasGuidelineDocumentSlugConflict(req, {
				slug: 'draft',
				chapterId: null,
				currentId: null,
			}),
		).resolves.toBe(false)
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { and: [{ slug: { equals: 'draft' } }, { chapter: { exists: false } }] },
			}),
		)
	})

	// Rule 삭제 가드(quality-rule)가 쓴다 — 문서 레벨과 섹션 레벨 관계를 모두 세고, 초안도 포함한다.
	it('문서와 섹션의 Rule 관계를 문서별 id 목록으로 편다', async () => {
		const find = vi.fn().mockResolvedValue({
			docs: [{ id: 1, rules: [2], sections: [{ rules: [3, { id: 4 }] }] }],
		})
		const req = { payload: { find }, user: { id: 1 } } as never

		await expect(findGuidelineDocumentRuleReferences(req)).resolves.toEqual([
			{ id: 1, ruleIds: [2, 3, 4] },
		])
		expect(find).toHaveBeenCalledWith(
			expect.objectContaining({
				draft: true,
				overrideAccess: false,
				select: { sections: { rules: true }, rules: true },
			}),
		)
	})
})
