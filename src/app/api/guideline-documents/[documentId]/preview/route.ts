import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { getGuidelineDocumentPreviewTarget } from '@/features/guideline/services/get-guideline-document-preview.service'
import { isManager } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

/**
 * Admin page preview 요청을 인증한 뒤 Draft Mode를 켜고 실제 guideline 화면으로 보낸다.
 * draft 문서 조회와 URL 결정은 guideline preview service가 소유한다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ documentId: string }> }) {
	if (isCrossOriginRequest(req)) {
		return new Response('Forbidden', { status: 403 })
	}

	const { user } = await authenticateRequest()

	if (!user) {
		return new Response('Unauthorized', { status: 401 })
	}
	if (!isManager(user)) {
		return new Response('Forbidden', { status: 403 })
	}

	const documentId = Number((await params).documentId)

	if (!Number.isSafeInteger(documentId) || documentId < 1) {
		return new Response('Invalid preview', { status: 400 })
	}

	const target = await getGuidelineDocumentPreviewTarget(documentId, user)

	if (!target) {
		return new Response('Preview not found', { status: 404 })
	}

	const draft = await draftMode()
	draft.enable()
	redirect(target.href)
}
