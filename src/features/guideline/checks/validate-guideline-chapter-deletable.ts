import { APIError, type PayloadRequest } from 'payload'

/**
 * 토픽이 남아 있는 챕터의 삭제를 막는다.
 *
 * 🔴 `chapter`는 GuidelineDocuments에서 required다. 그냥 지우면 토픽이 갈 곳을 잃고, 그 토픽의
 *    URL 첫 조각도 함께 사라진다. 지우기 전에 재분류하게 안내한다.
 */
export async function assertGuidelineChapterDeletable(
	req: PayloadRequest,
	chapterId: number,
): Promise<void> {
	const { totalDocs } = await req.payload.count({
		collection: 'guideline-documents',
		overrideAccess: true,
		req,
		where: { chapter: { equals: chapterId } },
	})

	if (totalDocs > 0) {
		throw new APIError(
			`토픽 ${totalDocs}개가 이 챕터에 속해 있어 삭제할 수 없습니다. 먼저 다른 챕터로 옮기세요.`,
			400,
		)
	}
}
