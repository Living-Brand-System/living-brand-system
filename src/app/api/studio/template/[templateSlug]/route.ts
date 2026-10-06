import { getTemplateStudio } from '@/features/template-customization/services/get-template-studio.service'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

/** 실제 Studio와 동일한 인증·published 계약만 클라이언트 편집기에 전달한다. */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ templateSlug: string }> },
) {
	if (isCrossOriginRequest(request))
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	const { payload, user } = await authenticateRequest()
	if (!user) return Response.json({ message: 'Unauthorized' }, { status: 401 })
	const { templateSlug } = await params
	try {
		const studio = await getTemplateStudio(templateSlug, user)
		return studio
			? Response.json(studio)
			: Response.json({ message: 'Template not found.' }, { status: 404 })
	} catch (error) {
		payload.logger.error({ err: error }, 'studio-template-detail.failed')
		return Response.json({ message: 'Failed to load template.' }, { status: 500 })
	}
}
