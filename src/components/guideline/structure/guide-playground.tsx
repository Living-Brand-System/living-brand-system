import imageA from '@/features/guideline/cards/displays/dynamics/layout-grid-overlay/images/layout_base_image_1.webp'
import imageB from '@/features/guideline/cards/displays/dynamics/layout-grid-overlay/images/layout_base_image_2.webp'
import { getGuidelineLockupColors } from '@/features/guideline/services/get-guideline-colors.service'
import { GuidelineCarouselContainer } from './carousel'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { type GuidelineCardData, GuidelineGridContainer } from './grid'
import {
	GuidelineCiLockupDisplay,
	GuidelineLayoutGridDisplay,
	GuidelineLayoutOverlayDisplay,
} from './guide-displays'
import { GuidelineStickyContainer } from './sticky'

export async function GuidelineGuidePlayground() {
	const colors = await getGuidelineLockupColors()
	const cards: GuidelineCardData[] = [
		{
			id: 'layout-overlay',
			ratio: '4:3',
			display: <GuidelineLayoutOverlayDisplay images={[imageA, imageB]} colors={colors} />,
			caption: {
				title: 'Layout Grid Overlay',
				description:
					'On으로 격자·여백·거터를 표시합니다. 원본 샘플 두 장에 같은 규칙을 적용합니다.',
			},
		},
		{
			id: 'layout-grid',
			ratio: '3:4',
			display: <GuidelineLayoutGridDisplay colors={colors} />,
			caption: {
				title: 'Layout Grid',
				description: '완성된 레이아웃 위에 배치 가이드를 켜고 끕니다.',
			},
		},
		{
			id: 'ci-lockup',
			ratio: '4:3',
			display: <GuidelineCiLockupDisplay colors={colors} />,
			caption: {
				title: 'CI Lockup',
				description:
					'On으로 조합 치수를 표시합니다. 기존 계산 렌더러를 재사용하며, 워드마크는 임시 서체로 표현되어 정본 아트워크와 차이가 있습니다.',
			},
		},
	]
	return (
		<GuidelineSection id="guide-playground" hierarchy="main">
			<GuidelineSectionHeading
				id="guide-playground-heading"
				hierarchy="main"
				title="Guide Toggle Playground"
				description="세 가지 디스플레이를 동일한 카드 입력으로 Grid·Carousel·Sticky에서 비교합니다. 가이드는 모두 Off로 시작합니다."
			/>
			<GuidelineGridContainer cards={cards} displayWidth={480} columns={2} />
			<GuidelineCarouselContainer cards={cards} label="가이드 토글 비교" />
			<GuidelineStickyContainer cards={cards} />
		</GuidelineSection>
	)
}
