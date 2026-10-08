import type { PayloadRequest } from 'payload'
import { toRelationshipId } from '@/lib/payload-relationship'

export interface GuidelineDocumentRuleReference {
	id: number
	ruleIds: number[]
}

/**
 * 문서 레벨·섹션 레벨 `rules` 관계를 문서별 Rule id 목록으로 편다. 초안도 센다 — 초안이 참조하는
 * Rule을 지우면 그 초안은 발행할 수 없게 된다. 요청자가 있으면 그 권한으로 읽는다.
 */
export async function findGuidelineDocumentRuleReferences(
	req: PayloadRequest,
): Promise<GuidelineDocumentRuleReference[]> {
	const { docs } = await req.payload.find({
		collection: 'guideline-documents',
		depth: 0,
		draft: true,
		limit: 0,
		overrideAccess: !req.user,
		pagination: false,
		req,
		select: { sections: { rules: true }, rules: true },
		...(req.user ? { user: req.user } : {}),
	})
	return docs.map((document) => ({
		id: document.id,
		ruleIds: [
			...(document.rules ?? []),
			...(document.sections ?? []).flatMap((section) => section.rules ?? []),
		].flatMap((rule) => {
			const id = toRelationshipId(rule)
			return id === undefined ? [] : [id]
		}),
	}))
}

/** 챕터에 속한 문서 수 — 초안·게시 가리지 않는다(어느 쪽이든 챕터가 사라지면 갈 곳을 잃는다). */
export async function countGuidelineDocumentsInChapter(
	req: PayloadRequest,
	chapterId: number,
): Promise<number> {
	const { totalDocs } = await req.payload.count({
		collection: 'guideline-documents',
		overrideAccess: true,
		req,
		where: { chapter: { equals: chapterId } },
	})
	return totalDocs
}

/** 같은 챕터 안에 slug가 이미 있는지 조회한다. slug는 언어 공통이라 locale을 가리지 않는다. */
export async function hasGuidelineDocumentSlugConflict(
	req: PayloadRequest,
	{
		chapterId,
		currentId,
		slug,
	}: {
		chapterId: number | null
		currentId: number | null
		slug: string
	},
) {
	const duplicate = await req.payload.find({
		collection: 'guideline-documents',
		depth: 0,
		draft: true,
		limit: 1,
		overrideAccess: true,
		pagination: false,
		req,
		where: {
			and: [
				{ slug: { equals: slug } },
				chapterId === null
					? { chapter: { exists: false } }
					: { chapter: { equals: chapterId } },
				...(currentId === null ? [] : [{ id: { not_equals: currentId } }]),
			],
		},
	})

	return duplicate.docs.length > 0
}
