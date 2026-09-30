import { ArrowUpRight, Close } from '@carbon/icons-react'
import Link from 'next/link'
import { GuidelineCardActions } from '@/components/guideline/structure/card-actions'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import {
	type GuidelineCardData,
	GuidelineCardDisplay,
	GuidelineDisplayFrame,
	GuidelineGridContainer,
} from '@/components/guideline/structure/grid'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'

const root = '/guideline/reference/infographics'
const charts: GuidelineCardData[] = [
	['area-chart', 'Volume', '시간의 흐름에 따른 수치 변화와 전체 규모를 면적으로 보여줍니다.'],
	['column-chart', 'Column', '항목별 수치를 막대 높이로 비교합니다.'],
	['bubble-diagram', 'Bubble', '여러 항목의 상대적인 규모를 원의 면적으로 비교합니다.'],
	['donut-chart', 'Donut', '전체에서 각 항목이 차지하는 비중을 보여줍니다.'],
	[
		'horizontal-stacked-bar',
		'Stack',
		'하나의 가로 막대를 구간으로 나누어 항목별 구성 비율을 보여줍니다.',
	],
	['line-chart', 'Line', '시간이나 순서에 따른 수치 변화와 추세를 선으로 보여줍니다.'],
	[
		'nested-circles',
		'Nested Stack',
		'포함 관계에 있는 항목들의 범위와 규모를 겹쳐진 원으로 보여줍니다.',
	],
	['pie-chart', 'Pie', '전체를 부채꼴로 나누어 항목별 구성 비율을 보여줍니다.'],
	[
		'proportional-circles',
		'Proportion',
		'원의 면적 차이로 항목 간 규모의 차이를 직관적으로 보여줍니다.',
	],
	[
		'stepped-bar-chart',
		'Stepped Bar',
		'단계별 수치를 막대 높이로 나타내어 변화의 흐름을 보여줍니다.',
	],
	['treemap', 'Tree Map', '사각형의 면적으로 항목별 비중과 전체 구성을 보여줍니다.'],
	[
		'vertical-stacked-bar',
		'Stacked Bar',
		'여러 항목을 세로로 쌓아 전체 수치와 각 항목의 비중을 함께 보여줍니다.',
	],
].map(([id, title, description]) => ({
	id,
	ratio: '1:1',
	display: (
		<GuidelineCardDisplay
			src={`${root}/examples/infographic-${id}-example.webp`}
			alt={`${title} 차트 예시`}
		/>
	),
	caption: { type: 'basic', title, description },
}))

const incorrectUsages: GuidelineCardData[] = [
	[
		'icon-insertion',
		'불필요한 아이콘 삽입',
		'데이터와 직접 관계없는 아이콘을 차트 안에 넣지 않습니다.',
	],
	[
		'image-overlay',
		'이미지 중첩',
		'사진이나 이미지를 차트 위에 겹쳐 데이터와 수치를 가리지 않습니다.',
	],
	[
		'line-weight',
		'일관되지 않은 선 굵기',
		'특정 데이터만 과도하게 강조되지 않도록 같은 역할의 선은 굵기를 통일합니다.',
	],
	[
		'low-contrast',
		'부족한 명도 대비',
		'배경·데이터·텍스트 사이의 대비가 낮아 정보를 구분하기 어려운 색상 조합을 사용하지 않습니다.',
	],
	[
		'overlap',
		'구분하기 어려운 영역',
		'인접한 데이터 영역의 경계를 식별할 수 있도록 색상과 구분 방식을 명확하게 유지합니다.',
	],
	[
		'three-dimensional',
		'불필요한 입체 표현',
		'원근감이나 입체 효과로 데이터의 크기와 비율이 왜곡되는 표현을 사용하지 않습니다.',
	],
].map(([id, title, description]) => ({
	id,
	ratio: '4:3',
	display: (
		<GuidelineCardDisplay
			src={`${root}/incorrect-usage/infographic-${id}-incorrect-usage.webp`}
			alt={`${title} 사용 금지 사례`}
			scale={100}
			sizes="(max-width: 767px) 100vw, 720px"
		>
			<GuidelineCardActions
				start={{
					kind: 'badge',
					label: '사용 금지',
					variant: 'destructive',
					icon: <Close size={24} />,
				}}
			/>
		</GuidelineCardDisplay>
	),
	caption: { type: 'basic', title, description },
}))

export function InfographicsReference() {
	return (
		<main data-slot="infographics-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				<Link href="#overview" className="underline underline-offset-4">
					Overview
				</Link>
				<Link href="#charts" className="underline underline-offset-4">
					Charts
				</Link>
				<Link href="#incorrect-usages" className="underline underline-offset-4">
					Incorrect Usages
				</Link>
				<Link
					href="/guideline/reference/illustrations"
					className="underline underline-offset-4"
				>
					Illustrations
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Infographics" subtitle="인포그래픽" />
			<GuidelineSection id="overview" hierarchy="main">
				<GuidelineSectionHeading
					id="overview-heading"
					hierarchy="main"
					title="Overview"
					description="Information graphics are a crucial component for showcasing more detailed information. Whether product details, data, or timelines, various styles of infographics can be used to help make communication clear."
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						{
							id: 'overview',
							ratio: '16:9',
							display: (
								<GuidelineDisplayFrame>
									<div
										role="img"
										aria-label="녹색 그래픽 영역"
										className="absolute inset-[12%]"
										style={{ backgroundColor: '#73d75a' }}
									/>
								</GuidelineDisplayFrame>
							),
						},
					]}
				/>
			</GuidelineSection>
			<GuidelineSection id="charts" hierarchy="main">
				<GuidelineSectionHeading
					id="charts-heading"
					hierarchy="main"
					title="Charts"
					description="Charts and data visualizations are used to highlight collections of information and patterns throughout internal documents or presentations. Chart type varies depending on the information and any chart style needed may be used. Use the following as a starting reference point."
				/>
				<GuidelineGridContainer displayWidth={480} columns={3} cards={charts} />
			</GuidelineSection>

			<GuidelineSection
				id="incorrect-usages"
				hierarchy="main"
				className="rounded-3xl bg-destructive/15"
			>
				<GuidelineSectionHeading
					id="incorrect-usages-heading"
					hierarchy="main"
					align="center"
					title="Incorrect Usages"
					description="인포그래픽은 정보를 명확하고 일관되게 전달해야 합니다. 불필요한 장식이나 시각적 왜곡으로 데이터의 의미를 흐리지 않도록 아래 사용 금지 사례를 확인하세요."
				/>
				<GuidelineGridContainer
					displayWidth={720}
					minDisplayWidth={320}
					columns={2}
					cards={incorrectUsages}
				/>
			</GuidelineSection>

			<GuidelineSection id="related-resources" hierarchy="main">
				<GuidelineSectionHeading
					id="related-resources-heading"
					hierarchy="main"
					title="Related Resources"
				/>
				<GuidelineGridContainer
					displayWidth={480}
					columns={3}
					cards={[
						{
							id: 'infographic-builder',
							ratio: '1:1',
							display: (
								<GuidelineCardDisplay
									src={`${root}/examples/infographic-donut-chart-example.webp`}
									alt="인포그래픽 제작 도구의 도넛 차트 예시"
								>
									<GuidelineCardActions
										end={{
											kind: 'link',
											label: 'Infographic Builder 열기',
											href: '/studio/graph',
											icon: <ArrowUpRight size={20} />,
										}}
									/>
								</GuidelineCardDisplay>
							),
							caption: {
								type: 'basic',
								title: 'Infographic Builder',
								description: '브랜드 가이드에 맞는 차트와 인포그래픽을 제작합니다.',
							},
						},
					]}
				/>
			</GuidelineSection>
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
