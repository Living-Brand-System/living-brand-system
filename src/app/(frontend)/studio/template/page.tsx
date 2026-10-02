import { StudioHome } from '@/components/studio/shared/studio-home'
import { getCreateNavigation } from '@/features/template-customization/services/get-create-navigation.service'
import { requireUser } from '@/lib/request-auth'
import { routes } from '@/lib/routes'

export default async function CreatePage() {
	await requireUser(routes.studio.template)
	const navigation = await getCreateNavigation()

	return (
		<StudioHome
			title="Templates"
			subtitle="템플릿 생성"
			groups={navigation.categories.map((category) => ({
				title: category.title,
				items: category.templates.map((template) => ({
					key: template.id,
					name: template.name,
					subtitle: category.title,
					href: template.href,
					previewImage: template.previewImage,
				})),
			}))}
			empty={{
				title: '발행된 템플릿이 없습니다',
				description: '템플릿이 발행되면 이 화면에서 바로 편집하고 내보낼 수 있습니다.',
			}}
		/>
	)
}
