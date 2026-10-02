import { Download } from '@carbon/icons-react'
import { GuidelineCardActions } from '@/components/guideline/structure/card-actions'
import { GuidelineCardDisplay, GuidelineGridContainer } from '@/components/guideline/structure/grid'
import { StudioHome, StudioHomeBlock } from '@/components/studio/shared/studio-home'
import { listImageStudioConfigs } from '@/features/image-generation/services/list-image-studio-configs.service'
import { listPublishedSampleImages } from '@/features/template-customization/services/list-sample-images.service'
import { requireUser } from '@/lib/request-auth'
import { getStudioImageRoute, routes } from '@/lib/routes'

// 렌더링: 매 요청. 권한·미리보기 상태를 읽으므로 캐시하지 않는다.
// 🔴 방식을 선언으로 못박는다 — 추론에 맡기면 프로덕션에서만 드러나는 차이가 생긴다
//    (docs/05 「렌더링 캐시 무효화」).
export const dynamic = 'force-dynamic'

export default async function GenerateImagePage() {
	const { user } = await requireUser(routes.studio.image)
	const [configs, samples] = await Promise.all([
		listImageStudioConfigs(user),
		listPublishedSampleImages(user),
	])

	return (
		<StudioHome
			title="Images"
			subtitle="이미지 생성"
			groups={[
				{
					title: 'Generate',
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
			empty={{
				title: '발행된 이미지 프로파일이 없습니다',
				description: '프로파일이 발행되면 이 화면에서 바로 생성할 수 있습니다.',
			}}
		>
			{/* Figma 571:8637 — 샘플 이미지 컬렉션을 가이드라인 카드로 보여 주고 원본을 내려받게 한다. */}
			{samples.length > 0 && (
				<StudioHomeBlock id="studio-examples" title="Examples">
					<GuidelineGridContainer
						cards={samples.map((sample) => ({
							id: String(sample.id),
							ratio: '1:1',
							display: (
								<GuidelineCardDisplay src={sample.url} alt={sample.alt} fit="cover">
									<GuidelineCardActions
										end={{
											kind: 'link',
											label: `${sample.name} 다운로드`,
											href: sample.url,
											download: true,
											icon: <Download size={18} />,
										}}
									/>
								</GuidelineCardDisplay>
							),
						}))}
					/>
				</StudioHomeBlock>
			)}
		</StudioHome>
	)
}
