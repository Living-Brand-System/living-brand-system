import Link from 'next/link'
import { GuidelineCarouselContainer } from '@/components/guideline/structure/carousel'
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
import styles from './illustrations.module.css'

const root = '/guideline/reference/illustrations'
// Figma 176:13272 순서. 정사각 원본 안의 여백까지 도판에 포함합니다.
const graphics = [
	['01', '건물'],
	['02', '컨테이너선'],
	['03', '크레인 후크'],
	['07', 'LNG 운반선'],
	['08', '안전모'],
	['04', '굴착기'],
	['09', '태양광 패널'],
	['10', '잠수함'],
	['11', '변압기'],
	['06', '산업용 로봇'],
	['05', '갠트리 크레인'],
].map(
	([number, name]): GuidelineCardData => ({
		id: `illustration-${number}`,
		ratio: '1:1',
		display: (
			<GuidelineCardDisplay
				src={`${root}/squared/illustration-square-${number}.png`}
				alt={`${name} 일러스트레이션`}
				scale={100}
			/>
		),
		caption: { type: 'basic', title: name },
	}),
)

const examples = [
	['excavator', '굴착기 포스터'],
	['safety-helmet', '안전모 안전 캠페인 포스터'],
	['industrial-robot', '산업용 로봇 배너'],
].map(
	([name, alt]): GuidelineCardData => ({
		id: `example-${name}`,
		ratio: '3:4',
		display: (
			<GuidelineCardDisplay
				src={`${root}/examples/illustration-${name}-example.webp`}
				alt={alt}
				sizes="(max-width: 767px) 100vw, 540px"
				className={name === 'safety-helmet' ? styles.safetyHelmet : undefined}
			/>
		),
		caption: { type: 'basic', title: alt },
	}),
)

/** Figma 문서의 구성과 신규 카드 계약을 비교하는 읽기 전용 목표 페이지입니다. */
export function IllustrationsReference() {
	return (
		<main data-slot="illustrations-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				{['Overview', 'Graphics', 'Usecase', 'Related Resources'].map((title) => (
					<Link
						key={title}
						href={`#${title.toLowerCase().replaceAll(' ', '-')}`}
						className="underline underline-offset-4"
					>
						{title}
					</Link>
				))}
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
				<Link
					href="/guideline/reference/infographics"
					className="underline underline-offset-4"
				>
					Infographics
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Illustrations" subtitle="일러스트레이션" />
			<GuidelineSection id="overview" hierarchy="main">
				<GuidelineSectionHeading
					id="overview-heading"
					hierarchy="main"
					title="Overview"
					description="Graphic elements are used throughout our visual system to support elements like typography, color, and our identity. By using clear and recognizable imagery, they can structure information and create visual interest while adding to the legibility of a composition."
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
			<GuidelineSection id="graphics" hierarchy="main">
				<GuidelineSectionHeading
					id="graphics-heading"
					hierarchy="main"
					title="Graphics"
					description="HD현대의 다양한 산업과 기술을 선으로 표현한 일러스트레이션입니다. 건물, 선박, 산업 장비 등 각 소재의 특징을 살린 그래픽을 확인하세요."
				/>
				<GuidelineGridContainer displayWidth={480} columns={3} cards={graphics} />
			</GuidelineSection>
			<GuidelineSection id="usecase" hierarchy="main">
				<GuidelineSectionHeading
					id="usecase-heading"
					hierarchy="main"
					title="Usecase"
					description="HD현대의 산업 카테고리의 이미지 톤앤매너 예시입니다."
				/>
				<GuidelineCarouselContainer
					label="일러스트레이션 활용 예시"
					displayHeight={720}
					cards={examples}
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
									src={`${root}/squared/illustration-square-08.png`}
									alt="안전모 일러스트레이션"
									scale={66}
								/>
							),
							caption: {
								type: 'basic',
								title: 'Infographic Builder',
								description: 'It helps you make infographic easier',
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
