import { StudioHome } from '@/components/studio/shared/studio-home'
import { listImageStudioConfigs } from '@/features/image-generation/services/list-image-studio-configs.service'
import { requireUser } from '@/lib/request-auth'
import { getStudioImageRoute, routes } from '@/lib/routes'

// 렌더링: 매 요청. 권한·미리보기 상태를 읽으므로 캐시하지 않는다.
// 🔴 방식을 선언으로 못박는다 — 추론에 맡기면 프로덕션에서만 드러나는 차이가 생긴다
//    (docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

export default async function GenerateImagePage() {
	const { user } = await requireUser(routes.studio.image)
	const configs = await listImageStudioConfigs(user)

	return (
		<StudioHome
			title="이미지 생성"
			description="이미지 프로파일을 선택해 브랜드 이미지 후보를 만듭니다."
			groups={[
				{
					// slug가 없는 프로파일은 딥링크가 없어 카드로 열 수 없다.
					items: configs.flatMap((config) =>
						config.image.slug
							? [
									{
										key: config.id,
										name: config.name,
										href: getStudioImageRoute(config.image.slug),
										previewImage: config.previewImage,
									},
								]
							: [],
					),
				},
			]}
			cardFit="cover"
			empty={{
				title: '발행된 이미지 프로파일이 없습니다',
				description: '프로파일이 발행되면 이 화면에서 바로 생성할 수 있습니다.',
			}}
		/>
	)
}
