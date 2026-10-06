import {
	GuidelineDisplayFooter,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import {
	GuidelineCardDisplay,
	GuidelineDisplayFrame,
	GuidelineGridContainer,
} from '@/components/guideline/structure/grid'
import { LandingHero, LandingLockup, LandingSurface } from '@/components/shared/landing-hero'
import type { GetGuidelineNavigationOutput } from '@/features/guideline/services/get-guideline-navigation.service'

/**
 * 가이드라인 첫 화면(Figma 458:16373) — 히어로 다음에 챕터마다 블록 하나, 블록 안에 토픽마다 가이드라인 카드 하나.
 * 카드는 토픽 문서로 가는 링크이고, 판에는 토픽의 headerImage를 채운다(없으면 빈 판).
 * 토픽이 없는 챕터는 블록을 세우지 않는다 — 열 곳이 없는 제목만 남는다.
 */
export function GuidelineOnboard({ navigation }: { navigation: GetGuidelineNavigationOutput }) {
	return (
		// 바탕은 히어로 아래 블록만 칠한다 — 판 전체에 칠하면 히어로의 고정 배경층을 가린다(`LandingHero`).
		<article className="relative flex w-full flex-col text-foreground">
			<LandingHero size="screen" fade="down">
				<LandingLockup title={navigation.title} />
			</LandingHero>
			<LandingSurface>
				{navigation.chapters
					.filter((chapter) => chapter.topics.length > 0)
					.map((chapter) => {
						const id = `chapter-${chapter.id}`
						return (
							<GuidelineSection key={chapter.id} id={id} hierarchy="main">
								<GuidelineSectionHeading
									id={`${id}-heading`}
									hierarchy="main"
									title={chapter.title}
									description={chapter.description ?? undefined}
								/>
								<GuidelineGridContainer
									cards={chapter.topics.map((topic) => ({
										id: String(topic.id),
										ratio: '1:1',
										href: topic.href,
										display: topic.thumbnail ? (
											<GuidelineCardDisplay
												src={topic.thumbnail.src}
												alt={topic.thumbnail.alt}
												fit="cover"
											/>
										) : (
											<GuidelineDisplayFrame />
										),
										caption: {
											title: topic.title,
											description: topic.description ?? undefined,
										},
									}))}
								/>
							</GuidelineSection>
						)
					})}
				<GuidelineDisplayFooter />
			</LandingSurface>
		</article>
	)
}
