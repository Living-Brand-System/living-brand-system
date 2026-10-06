import { z } from 'zod'
import { importFigmaHtml } from '@/features/template-import/services/import-figma-html.service'
import { parseFigmaUrl } from '@/features/template-import/utils/parse-figma-url'
import { isManager, isPayloadUser } from '@/lib/auth'
import { FigmaApiError, FigmaConfigurationError, FigmaImportError } from '@/lib/errors'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

// Figma REST GET만 하므로 이미지 파이프라인보다 짧지만 여유를 둔다.
export const maxDuration = 30

const requestSchema = z.object({ sourceUrl: z.string().min(1).max(500) })

const FIGMA_PLAN_LABELS: Record<string, string> = {
	enterprise: 'Enterprise',
	org: 'Organization',
	pro: 'Professional',
	starter: 'Starter',
	student: 'Student',
}

function figmaApiErrorResponse(error: FigmaApiError): Response {
	const stage =
		error.stage === 'nodes'
			? '프레임을 읽는 중'
			: error.stage === 'images'
				? '레이어를 렌더링하는 중'
				: '이미지 채우기를 읽는 중'
	let message: string

	if (error.status === 429) {
		const retry =
			error.retryAfter === undefined
				? '잠시 후 다시 시도하세요.'
				: `${error.retryAfter}초 후 다시 시도하세요.`
		const plan = error.planTier ? FIGMA_PLAN_LABELS[error.planTier] : undefined
		const seat =
			error.rateLimitType === 'low'
				? ' 해당 파일 플랜에서 Viewer/Collab 좌석 제한이 적용되고 있습니다.'
				: error.rateLimitType === 'high'
					? ' 해당 파일 플랜에서 Dev/Full 좌석 제한이 적용되고 있습니다.'
					: ''
		message = `Figma 요청 한도에 도달했습니다. ${retry}${plan ? ` 대상 파일 플랜: ${plan}.` : ''}${seat}`
	} else if (error.status === 401 || error.status === 403) {
		message =
			'Figma 토큰이 만료되었거나 이 파일에 접근할 권한이 없습니다. 내 계정에서 토큰을 다시 등록하거나 파일 권한을 확인하세요.'
	} else if (error.status === 404) {
		message = 'Figma 파일 또는 프레임을 찾을 수 없습니다. URL과 node-id를 확인하세요.'
	} else if (error.status === 400) {
		message = `Figma ${stage} 요청을 처리하지 못했습니다. 프레임이 너무 크거나 복잡할 수 있습니다.`
	} else {
		message = `Figma ${stage} 일시적인 오류가 발생했습니다. 잠시 후 다시 시도하세요.`
	}

	const status = [400, 401, 403, 404, 429].includes(error.status) ? error.status : 502
	const headers =
		error.status === 429 && error.retryAfter !== undefined
			? { 'Retry-After': String(error.retryAfter) }
			: undefined
	return Response.json({ message }, { headers, status })
}

/**
 * Figma URL을 inline-style HTML로 변환해 돌려주는 adapter. Admin의 Templates 폼 UI 필드가 호출한다.
 * Template 문서는 만들지 않는다. 요청한 manager 본인의 Figma 토큰으로 읽는다(계정 화면에서 등록).
 */
export async function POST(req: Request) {
	if (isCrossOriginRequest(req)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const { payload, user } = await authenticateRequest()

	if (!user) {
		return Response.json({ message: 'Unauthorized' }, { status: 401 })
	}
	if (!isPayloadUser(user) || !isManager(user)) {
		return Response.json({ message: 'Forbidden' }, { status: 403 })
	}

	const parsed = requestSchema.safeParse(await req.json().catch(() => null))

	if (!parsed.success) {
		return Response.json({ message: 'Invalid request.' }, { status: 400 })
	}

	const source = parseFigmaUrl(parsed.data.sourceUrl)

	if (!source) {
		return Response.json(
			{ message: 'A Figma design URL with node-id is required.' },
			{ status: 400 },
		)
	}

	try {
		const output = await importFigmaHtml(source, payload, user)

		return Response.json(output)
	} catch (error) {
		payload.logger.error({ err: error }, 'template-import.import-html.failed')

		if (error instanceof FigmaConfigurationError) {
			return Response.json({ message: error.message }, { status: 409 })
		}
		if (error instanceof FigmaApiError) {
			return figmaApiErrorResponse(error)
		}
		if (error instanceof FigmaImportError) {
			return Response.json({ message: error.userMessage }, { status: error.status })
		}

		return Response.json({ message: 'Figma import failed.' }, { status: 500 })
	}
}
