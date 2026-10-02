import { StudioHome } from '@/components/studio/shared/studio-home'
import { listGraphicStudioConfigs } from '@/features/graphic-generation/services/list-graphic-studio-configs.service'
import { requireUser } from '@/lib/request-auth'
import { getStudioGraphicRoute, routes } from '@/lib/routes'

// 렌더링: 매 요청. 권한과 발행된 Graphic Profile을 읽으므로 캐시하지 않는다.
// 🔴 방식을 선언으로 못박는다 — 추론에 맡기면 프로덕션에서만 드러나는 차이가 생긴다
//    (docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

export default async function GenerateGraphicPage() {
	const { user } = await requireUser(routes.studio.graphic)
	const configs = await listGraphicStudioConfigs(user)

	return (
		<StudioHome
			title="그래픽 제작"
			description="그래픽 프로파일을 선택해 브랜드 그래픽을 만듭니다."
			groups={[
				{
					items: configs.map((config) => ({
						key: config.id,
						name: config.name,
						subtitle: `${config.type.toUpperCase()} Graphic`,
						href: getStudioGraphicRoute(config.id),
						previewImage: config.previewImage,
					})),
				},
			]}
			cardFit="cover"
			empty={{
				title: '발행된 그래픽 프로파일이 없습니다',
				description: '프로파일이 발행되면 이 화면에서 바로 만들고 내보낼 수 있습니다.',
			}}
		/>
	)
}
