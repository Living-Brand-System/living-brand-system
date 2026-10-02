import type { GetTemplateStudioOutput } from './get-template-studio.service'

export async function fetchTemplateStudio(
	slug: string,
	signal: AbortSignal,
): Promise<GetTemplateStudioOutput> {
	const response = await fetch(`/api/studio/template/${encodeURIComponent(slug)}`, { signal })
	if (!response.ok)
		throw new Error(
			response.status === 401
				? '로그인 후 템플릿을 불러올 수 있습니다.'
				: '템플릿을 불러오지 못했습니다.',
		)
	return response.json()
}
