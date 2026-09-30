import type { User } from '@/payload-types'
import { findDraftGuidelineDocumentById } from '../repositories/guideline-preview.payload.repository'
import { findPaletteCatalog } from '../repositories/palette.payload.repository'
import { needsPaletteCatalog } from '../sections/model'
import type { GetGuidelineTopicOutput } from './get-guideline-topic.service'

interface GuidelineDocumentPreviewTarget {
	chapterSlug: string
	href: string
	topicSlug: string
}

/**
 * Admin의 문서 preview ID를 권한 적용된 draft 토픽과 실제 guideline URL로 변환한다.
 *
 * 🔴 계층이 사라져(2026-08-26) breadcrumb으로 깊이를 재던 분기가 없다. 문서는 전부 토픽이고
 *    URL은 챕터 slug + 토픽 slug 두 조각으로 조립한다.
 * Payload 조회는 guideline-preview repository가 소유한다.
 */
export async function getGuidelineDocumentPreviewTarget(
	documentId: number,
	user: User,
): Promise<GuidelineDocumentPreviewTarget | null> {
	const document = await findDraftGuidelineDocumentById(documentId, user)
	if (!document?.chapterSlug || !document.slug) return null

	// #앵커를 붙이지 않는다. Better Editor iframe이 동일 출처 URL의 앵커를 로드하면
	// 부모 admin 문서까지 스크롤돼 오버레이가 헤더 높이만큼 말려 올라간다.
	return {
		chapterSlug: document.chapterSlug,
		href: `/guideline/${document.chapterSlug}/${document.slug}?previewDocument=${document.id}`,
		topicSlug: document.slug,
	}
}

/**
 * 토픽 preview는 발행 여부와 무관하게 선택한 draft 문서의 본문을 그대로 렌더링한다.
 * 섹션은 그 본문 안의 `section` 블록이라 하위 문서 조회가 없다.
 * Payload 조회는 guideline-preview repository가 소유한다.
 */
export async function getGuidelineTopicPreview(
	documentId: number,
	user: User,
): Promise<GetGuidelineTopicOutput | null> {
	const document = await findDraftGuidelineDocumentById(documentId, user)
	if (!document?.chapterSlug) return null

	return {
		title: document.title,
		contentModel: document.contentModel,
		sections: document.sections,
		paletteCatalog: needsPaletteCatalog(document) ? await findPaletteCatalog() : undefined,
		headerImage: document.headerImage,
		blocks: document.blocks,
	}
}
