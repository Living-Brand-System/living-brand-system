import { notFound } from 'next/navigation'
import { StudioWorkspacePage } from '@/components/studio/shared/studio-workspace'
import { TemplateGeneratorClient } from '@/components/studio/template/template-generator-client'
import { getCreateNavigation } from '@/features/template-customization/services/get-create-navigation.service'
import { getTemplateStudio } from '@/features/template-customization/services/get-template-studio.service'
import { isManager } from '@/lib/auth'
import { requireUser } from '@/lib/request-auth'
import { getStudioTemplateRoute } from '@/lib/routes'

export default async function CreateTemplatePage({
	params,
	searchParams,
}: {
	params: Promise<{ templateSlug: string }>
	searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
	const [{ templateSlug }, query] = await Promise.all([params, searchParams])
	const { user } = await requireUser(getStudioTemplateRoute(templateSlug))
	// Manager mode(`?manager`)에서는 고친 값(초안)을 보인다 — 초안은 manager에게만.
	const draft = query.manager !== undefined && isManager(user)
	const [navigation, studio] = await Promise.all([
		getCreateNavigation(),
		getTemplateStudio(templateSlug, user, { draft }),
	])

	if (!studio) {
		notFound()
	}

	return (
		<StudioWorkspacePage
			title={studio.template.name}
			description="열린 슬롯을 편집하고 미리보기를 확인한 뒤 원하는 형식으로 내보냅니다."
			hideHeading
		>
			<TemplateGeneratorClient
				key={studio.template.id}
				config={studio.config}
				// 분류는 URL이 아니라 템플릿 자신이 갖는다 — 이 템플릿을 담고 있는 카테고리에서 읽는다.
				categoryTitle={
					navigation.categories.find((category) =>
						category.templates.some((item) => item.slug === templateSlug),
					)?.title ?? null
				}
				template={studio.template}
				highlightColor={studio.highlightColor}
				// 임시 저장의 주인 — 공용 PC에서 남의 초안이 내 화면에 뜨지 않게 저장 키에 섞는다.
				userId={String(user.id)}
			/>
		</StudioWorkspacePage>
	)
}
