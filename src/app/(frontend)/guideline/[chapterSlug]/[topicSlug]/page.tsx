import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { GuidelineTopic } from '@/components/guideline/pages/guideline-topic'
import { getGuidelineTopicPreview } from '@/features/guideline/services/get-guideline-document-preview.service'
import { getGuidelineTopic } from '@/features/guideline/services/get-guideline-topic.service'
// 🔴 임시(개발용) import — 아래 slug 분기와 함께 지운다.
import { isManager, isPayloadUser } from '@/lib/auth'
import { authenticateRequest } from '@/lib/request-auth'

// 렌더링: 매 요청. 권한·미리보기 상태를 읽으므로 캐시하지 않는다.
// 🔴 방식을 선언으로 못박는다 — 추론에 맡기면 프로덕션에서만 드러나는 차이가 생긴다
//    (docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

export default async function GuidelineTopicPage({
	params,
	searchParams,
}: {
	params: Promise<{ chapterSlug: string; topicSlug: string }>
	searchParams: Promise<{ previewDocument?: string }>
}) {
	const { chapterSlug, topicSlug } = await params
	const previewDocumentId = Number((await searchParams).previewDocument)
	const previewSection = await getAuthorizedPreview(previewDocumentId)
	const topic = previewSection ?? (await getGuidelineTopic(chapterSlug, topicSlug))

	if (!topic) {
		notFound()
	}

	return (
		<GuidelineTopic
			topic={topic}
			previewDocumentId={previewSection ? previewDocumentId : undefined}
		/>
	)
}

async function getAuthorizedPreview(documentId: number) {
	const { isEnabled } = await draftMode()

	if (!isEnabled || !Number.isSafeInteger(documentId) || documentId < 1) return null

	const { user } = await authenticateRequest()

	if (!isPayloadUser(user) || !isManager(user)) return null

	return getGuidelineTopicPreview(documentId, user)
}
