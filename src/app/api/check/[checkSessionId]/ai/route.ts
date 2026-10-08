import {
	CheckSessionInputMismatchError,
	CheckSessionNotFoundError,
	CheckSessionTerminalError,
} from '@/features/asset-check/domain/check-session'
import { completeCheckSessionAiCheck } from '@/features/asset-check/services/start-check-session.service'
import { isAdmin } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'
import { TokenLimitExceededError } from '@/modules/ai-usage/services/token-limit.service'
import { readCheckImage } from '../../read-check-image'

// 관측 4건 배치 1회 호출이 20~25초다. 30초는 업로드·리사이즈·저장을 태울 여유가 없어
// 타임아웃이 곧 전 항목 needs_review가 된다. 모델 지연에 배 이상 여유를 둔다.
export const maxDuration = 60

function parseCheckSessionId(value: string): number | null {
	const id = Number(value)
	return Number.isSafeInteger(id) && id > 0 ? id : null
}

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ checkSessionId: string }> },
) {
	if (isCrossOriginRequest(req)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()
	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}
	// ponytail: 미개발 표면 — 검수 화면과 함께 admin 전용이다. 개발이 끝나면 이 검사를 지운다.
	if (!isAdmin(user)) {
		return Response.json({ message: 'Forbidden' }, { status: 403 })
	}

	const checkSessionId = parseCheckSessionId((await params).checkSessionId)
	if (checkSessionId === null) {
		return Response.json({ message: 'Invalid request.' }, { status: 400 })
	}
	const form = await req.formData().catch(() => null)
	const image = await readCheckImage(form?.get('image'))
	if ('response' in image) return image.response

	try {
		const result = await completeCheckSessionAiCheck({
			buffer: image.buffer,
			checkSessionId,
			user,
		})

		return Response.json(result)
	} catch (error) {
		if (error instanceof TokenLimitExceededError) {
			return Response.json({ message: error.message }, { status: 429 })
		}
		if (error instanceof CheckSessionNotFoundError) {
			return Response.json({ message: 'Check session not found.' }, { status: 404 })
		}
		if (error instanceof CheckSessionInputMismatchError) {
			return Response.json(
				{ message: 'Image does not match check session.' },
				{ status: 409 },
			)
		}
		if (error instanceof CheckSessionTerminalError) {
			return Response.json({ message: 'Check session already finished.' }, { status: 409 })
		}
		payload.logger.error({ err: error }, 'asset-check.ai.failed')

		return Response.json({ message: 'Check failed.' }, { status: 500 })
	}
}
