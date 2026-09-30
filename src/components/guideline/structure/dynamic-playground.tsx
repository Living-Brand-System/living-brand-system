import { GuidelineCarouselContainer } from './carousel'
import { GuidelineClearspaceDisplay } from './clearspace-display'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { type DisplayRatio, type GuidelineCardData, GuidelineGridContainer } from './grid'
import { GuidelineStickyContainer } from './sticky'

export function GuidelineDynamicPlayground() {
	const cards: GuidelineCardData[] = (['1:1', '16:9', '3:4'] satisfies DisplayRatio[]).map(
		(ratio) => ({
			id: ratio,
			ratio,
			display: (
				<GuidelineClearspaceDisplay
					logoSrc="/guideline/reference/clearspace/ko-horizontal-default-logoSpace.svg"
					gridSrc="/guideline/reference/clearspace/ko-horizontal-default-clearSpace.svg"
					alt={`HD현대 로고 ${ratio}`}
				/>
			),
			caption: {
				title: `보호공간 오버레이 · ${ratio}`,
				description:
					'국문 가로형 정본입니다. Off는 로고만, On은 실제 최소 보호공간 가이드를 함께 표시합니다.',
			},
		}),
	)
	return (
		<GuidelineSection id="dynamic-playground" hierarchy="main">
			<GuidelineSectionHeading
				id="dynamic-playground-heading"
				hierarchy="main"
				title="Dynamic Display Playground"
				description="동일한 위젯 카드 세 장을 Grid·Carousel·Sticky에서 비교합니다. 토글은 카드마다 독립적이며 Off로 시작합니다."
			/>
			<GuidelineGridContainer cards={cards} displayWidth={320} columns={3} />
			<GuidelineCarouselContainer cards={cards} label="보호공간 오버레이 비교" />
			<GuidelineStickyContainer cards={cards} />
		</GuidelineSection>
	)
}
