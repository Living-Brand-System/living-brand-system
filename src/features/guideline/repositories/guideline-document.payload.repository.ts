import type { PayloadRequest } from 'payload'

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
