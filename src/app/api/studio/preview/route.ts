import {
	isStudioPreviewKind,
	StudioProfileDraftPendingError,
	StudioProfileNotFoundError,
	updateProfilePreview,
} from '@/features/studio-preview/services/update-profile-preview.service'
import { isManager } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

// 렌더링: 매 요청. 사용자 권한을 확인하고 문서를 쓰므로 캐시하지 않는다.
export const dynamic = 'force-dynamic'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

/**
 * 스튜디오에서 지금 보고 있는 화면을 그 프로파일의 미리보기 이미지로 박는다.
 * 어느 컬렉션에 어떻게 쓰는지는 studio-preview 서비스가 소유한다 — 여기는 폼을 풀고 결과를 HTTP로 옮길 뿐이다.
 */
export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}
	// 화면은 매니저에게만 버튼을 보여주지만 강제는 여기가 한다 — 표시와 강제를 같은 곳에 두지 않는다.
	if (!isManager(user)) {
		return Response.json({ message: 'Forbidden' }, { status: 403 })
	}

	// 형식이 깨진 본문은 서버 오류가 아니라 잘못된 요청이다.
	const form = await request.formData().catch(() => null)
	if (!form) return Response.json({ message: 'Invalid form data.' }, { status: 400 })
	const studio = form.get('studio')
	const profileId = form.get('profileId')
	const file = form.get('file')

	if (!isStudioPreviewKind(studio)) {
		return Response.json({ message: 'Unknown studio.' }, { status: 400 })
	}
	if (typeof profileId !== 'string' || profileId.length === 0) {
		return Response.json({ message: 'Missing profile id.' }, { status: 400 })
	}
	if (!(file instanceof File) || file.type !== 'image/png') {
		return Response.json({ message: 'PNG 이미지가 필요합니다.' }, { status: 400 })
	}
	if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
		return Response.json(
			{ message: '이미지 크기가 허용 범위를 벗어났습니다.' },
			{ status: 400 },
		)
	}

	try {
		const previewImage = await updateProfilePreview({
			studio,
			profileId,
			png: Buffer.from(await file.arrayBuffer()),
			user,
		})
		return Response.json({ previewImage })
	} catch (error) {
		if (error instanceof StudioProfileNotFoundError) {
			return Response.json({ message: error.message }, { status: 404 })
		}
		if (error instanceof StudioProfileDraftPendingError) {
			return Response.json({ message: error.message }, { status: 409 })
		}
		payload.logger.error({ err: error, studio, profileId }, 'studio-preview-update.failed')
		return Response.json({ message: '미리보기를 갱신하지 못했습니다.' }, { status: 500 })
	}
}
