import { startCheckSession } from '@/features/asset-check/services/start-check-session.service'
import { isAdmin } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'
import { TokenLimitExceededError } from '@/modules/ai-usage/services/token-limit.service'
import { readCheckImage } from './read-check-image'

// 즉시 판정이 0건인 시나리오에서는 이 라우트가 AI 판정까지 이어서 돌린다(중복 업로드 제거).
// 예산은 AI 라우트와 같아야 한다 — 20~25초 모델 호출에 30초는 여유가 없다.
export const maxDuration = 60

function parseScenarioKey(value: FormDataEntryValue | null | undefined): string | undefined {
	return typeof value === 'string' && value ? value : undefined
}

/**
 * 검수 대상 이미지(FormData)를 받아 시나리오 기준으로 룰별 서버 확정 판정을 돌려준다.
 * 브라우저 check 화면이 부르는 통로. 검수 세션 저장과 계산은 service가 소유한다.
 */
export async function POST(req: Request) {
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

	const form = await req.formData().catch(() => null)
	const image = await readCheckImage(form?.get('image'))
	if ('response' in image) return image.response

	try {
		const result = await startCheckSession({
			buffer: image.buffer,
			deferHeuristic: 'when-showable',
			imageName: image.name,
			scenarioKey: parseScenarioKey(form?.get('scenarioKey')),
			source: 'review-page',
			user,
		})

		return Response.json(result)
	} catch (error) {
		if (error instanceof TokenLimitExceededError) {
			return Response.json({ message: error.message }, { status: 429 })
		}
		payload.logger.error({ err: error }, 'asset-check.failed')

		return Response.json({ message: 'Check failed.' }, { status: 500 })
	}
}
