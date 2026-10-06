import Link from 'next/link'
import type { ReactNode } from 'react'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayTitle,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import { LandingHero, LandingSurface } from '@/components/shared/landing-hero'
import {
	StudioSelectionCard,
	StudioSelectionTile,
} from '@/components/studio/shared/studio-selection-card'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

export type StudioHomeItem = {
	key: string | number
	name: string
	/** 이름 아래 한 줄 — 편집 화면 좌상단 카드의 부제와 같은 값을 준다. */
	subtitle?: string
	href: string
	previewImage?: StudioPreviewImage
}

export type StudioHomeGroup = {
	/** 블록 제목 — 템플릿 카테고리, 그래픽 렌더러 종류(P5 Vectors·Shaders), 이미지의 Generate. */
	title: string
	/** 넘어온 순서가 곧 배치 순서다 — 첫 항목이 좌상단에 선다. */
	items: readonly StudioHomeItem[]
}

type StudioHomeProps = {
	/** 띠의 영문 제목(Figma 571:8039 `Templates`)과 한국어 부제(`템플릿 생성`). */
	title: string
	subtitle: string
	groups: readonly StudioHomeGroup[]
	empty: { title: string; description: string }
	/** 프로파일 블록 뒤에 잇는 블록(이미지 스튜디오의 Examples). */
	children?: ReactNode
}

/**
 * 생성 스튜디오(Template·Graphic·Image)의 첫 화면(Figma 571:8889) — 히어로 띠, 묶음마다 블록, 푸터.
 * 블록의 제목·간격은 가이드라인 문서의 섹션과 같은 것을 쓴다(디자인이 같은 Block 컴포넌트다).
 * 카드는 편집 화면 좌상단과 같은 `StudioSelectionCard`이고 딥링크(`/studio/<kind>/<slug>`)로 가는 링크일 뿐이다 —
 * 편집 세션은 딥링크 화면이 소유한다.
 */
export function StudioHome({ title, subtitle, groups, empty, children }: StudioHomeProps) {
	const visibleGroups = groups.filter((group) => group.items.length > 0)
	return (
		<div data-slot="studio-home" className="h-full min-h-0 overflow-y-auto">
			{/* 바탕은 띠 아래 블록만 칠한다 — 판 전체에 칠하면 띠의 고정 배경층을 가린다(`LandingHero`). */}
			<article className="flex w-full flex-col text-foreground">
				<LandingHero size="banner" fade="down">
					<div className="flex flex-col items-center gap-6 text-center">
						<GuidelineDisplayTitle title={title} subtitle={subtitle} />
					</div>
				</LandingHero>
				<LandingSurface>
					{visibleGroups.length === 0 ? (
						<Empty className="min-h-96 rounded-none">
							<EmptyHeader>
								<EmptyTitle>{empty.title}</EmptyTitle>
								<EmptyDescription>{empty.description}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						visibleGroups.map((group, index) => (
							<StudioHomeBlock
								key={group.title}
								id={`studio-group-${index}`}
								title={group.title}
							>
								<StudioHomeGrid>
									{group.items.map((item) => (
										<StudioSelectionTile key={item.key} asChild>
											<Link href={item.href}>
												<StudioSelectionCard
													title={item.name}
													subtitle={item.subtitle}
													image={item.previewImage}
												/>
											</Link>
										</StudioSelectionTile>
									))}
								</StudioHomeGrid>
							</StudioHomeBlock>
						))
					)}
					{children}
					<GuidelineDisplayFooter />
				</LandingSurface>
			</article>
		</div>
	)
}

/** 첫 화면의 블록 하나 — 제목과 그 아래 카드 묶음. */
export function StudioHomeBlock({
	id,
	title,
	children,
}: {
	id: string
	title: string
	children: ReactNode
}) {
	return (
		<GuidelineSection id={id} hierarchy="main">
			<GuidelineSectionHeading id={`${id}-heading`} hierarchy="main" title={title} />
			{children}
		</GuidelineSection>
	)
}

/** 480px 정사각 카드 3열(Figma 571:8099 — 가로 12px·세로 10px 간격). 좁으면 한 열로 쌓인다. */
function StudioHomeGrid({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto grid w-full max-w-[91.5rem] grid-cols-[repeat(auto-fill,minmax(min(100%,30rem),30rem))] justify-center gap-x-3 gap-y-2.5">
			{children}
		</div>
	)
}
