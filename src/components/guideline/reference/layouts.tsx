import Link from 'next/link'
import { Fragment } from 'react'
import { GuidelineCarouselContainer } from '@/components/guideline/structure/carousel'
import { GuidelineClearspaceDisplay } from '@/components/guideline/structure/clearspace-display'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import {
	type DisplayRatio,
	GuidelineCardDisplay,
	GuidelineGridContainer,
} from '@/components/guideline/structure/grid'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'

const root = '/guideline/reference/layouts'
const types: {
	id: string
	title: string
	count: number
	ratio: DisplayRatio
	description: string
}[] = [
	{
		id: 'a',
		title: 'Type A',
		count: 4,
		ratio: '2:3',
		description: '세로로 긴 판형에서 제목·이미지·로고를 배치한 사례입니다.',
	},
	{
		id: 'b',
		title: 'Type B',
		count: 9,
		ratio: '3:4',
		description: '세로형 지면 안에서 제목과 본문, 이미지의 위치를 다양하게 구성한 사례입니다.',
	},
	{
		id: 'c',
		title: 'Type C',
		count: 3,
		ratio: '16:9',
		description: '가로형 지면에서 이미지와 제목을 넓게 배치한 사례입니다.',
	},
]

export function LayoutsReference() {
	return (
		<main data-slot="layouts-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				<Link href="#overview" className="underline underline-offset-4">
					Overview
				</Link>
				{types.map(({ id, title }) => (
					<Link key={id} href={`#type-${id}`} className="underline underline-offset-4">
						{title}
					</Link>
				))}
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Layouts" subtitle="레이아웃" />
			<GuidelineSection id="overview" hierarchy="main">
				<GuidelineSectionHeading
					id="overview-heading"
					hierarchy="main"
					title="Overview"
					description="HD현대의 레이아웃은 1:2:3 비율로 구성된 그리드 시스템을 통해 다양한 홍보물의 판형에서 유연하게 적용할 수 있습니다. 로고, 텍스트, 이미지, 그래픽 등을 그리드 시스템과 결합하여 일관된 브랜드 이미지를 전달합니다."
				/>
				<GuidelineGridContainer
					columns={1}
					displayWidth={1440}
					cards={[
						{
							id: 'layout-overview',
							ratio: '16:9',
							display: (
								<GuidelineCardDisplay
									src={`${root}/overview/layout-overview.webp`}
									alt="HD현대의 세로·가로 홍보물 레이아웃 모음"
								/>
							),
						},
					]}
				/>
			</GuidelineSection>
			{types.map(({ id, title, count, ratio, description }) => {
				const cards = Array.from({ length: count }, (_, index) => {
					const number = String(index + 1).padStart(2, '0')
					return {
						id: `type-${id}-${number}`,
						ratio,
						display: (
							<GuidelineClearspaceDisplay
								dimBackground
								logoSrc={`${root}/type-${id}/examples/layout-type-${id}-example-${number}.webp`}
								gridSrc={`${root}/type-${id}/construction/layout-type-${id}-construction-${number}.svg`}
								alt={`${title} 레이아웃 ${number}`}
							/>
						),
						caption: {
							type: 'basic' as const,
							title: `${title} · ${number}`,
						},
					}
				})
				return (
					<Fragment key={id}>
						<GuidelineSection id={`type-${id}`} hierarchy="main">
							<GuidelineSectionHeading
								id={`type-${id}-heading`}
								hierarchy="main"
								title={title}
								description={description}
							/>
							<GuidelineGridContainer
								columns={1}
								displayWidth={1440}
								cards={[
									{
										id: `type-${id}-overview`,
										ratio: '4:3',
										display: (
											<GuidelineCardDisplay
												src={`${root}/type-${id}/overview/layout-type-${id}-overview.webp`}
												alt={`${title} 적용 사례 모음`}
											/>
										),
										caption: {
											type: 'basic',
											title: `${title} · Overview`,
											description:
												'같은 판형 안에서 달라지는 제목·이미지·로고의 구성을 비교합니다.',
										},
									},
								]}
							/>
						</GuidelineSection>
						<GuidelineSection id={`type-${id}-examples`} hierarchy="sub">
							<GuidelineSectionHeading
								id={`type-${id}-examples-heading`}
								hierarchy="sub"
								title="Layout Examples"
								description="각 카드의 On을 선택하면 제작 규칙을 적용 이미지 위에 겹쳐 볼 수 있습니다."
							/>
							{id === 'c' ? (
								<GuidelineCarouselContainer
									label={`${title} 적용 예시`}
									displayHeight={480}
									cards={cards}
								/>
							) : (
								<GuidelineGridContainer
									cards={cards}
									columns={id === 'a' ? 4 : 2}
									displayWidth={id === 'a' ? 320 : 720}
									minDisplayWidth={id === 'a' ? 240 : 320}
								/>
							)}
						</GuidelineSection>
					</Fragment>
				)
			})}
			<GuidelineDisplayFooter
				logo={{
					src: '/brand/hd/ko-horizontal-default-blk@2x.png',
					alt: 'HD현대',
					width: 1246,
					height: 328,
				}}
			/>
		</main>
	)
}
