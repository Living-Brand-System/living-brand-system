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
	GuidelineGridContainer,
} from '@/components/guideline/structure/grid'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'
import styles from './physical-publications.module.css'

const root = '/guideline/reference/physical-publications'

function imageCard(
	path: string,
	title: string,
	ratio: GuidelineCardData['ratio'],
	overview = false,
): GuidelineCardData {
	return {
		id: path,
		ratio,
		display: (
			<GuidelineCardDisplay
				src={`${root}/${path}.webp`}
				alt={title}
				sizes={
					overview
						? '(max-width: 1504px) 100vw, 1440px'
						: '(max-width: 767px) 100vw, 720px'
				}
				className={overview ? styles.overview : undefined}
			/>
		),
		caption: { type: 'basic', title },
	}
}

// Figma 176:15107의 에셋과 표시 순서. 판형·배율은 신규 카드 계약을 따릅니다.
const covers = [
	['03', '지속가능경영 보고서 표지'],
	['01', '굴착기 일러스트레이션 표지'],
	['02', '브랜드 컬러와 선을 활용한 표지'],
	['04', '로고 중심 표지'],
	['05', '브랜드 그래픽 표지'],
	['07', '산업 구조물 그래픽 표지'],
].map(([number, title]) =>
	imageCard(`brochure/cover/application-brochure-cover-${number}`, title, '3:4'),
)

const body = [
	['01', '선박 사진 중심 내지'],
	['02', '제목과 본문 중심 내지'],
	['03', '사진과 본문 조합 내지'],
	['04', '장 제목과 이미지 조합 내지'],
	['05', '브랜드 컬러 내지'],
	['06', '목차 내지'],
].map(([number, title]) =>
	imageCard(`brochure/body/application-brochure-body-${number}`, title, '1:1'),
)

const horizontal = [
	['01', '브랜드 그래픽 가로 배너'],
	['02', '블루 그래픽 가로 배너'],
	['03', '사선 그래픽 가로 배너'],
	['04', '분할 레이아웃 가로 배너'],
].map(([number, title]) =>
	imageCard(
		`offline-banner/horizontal/application-offline-banner-horizontal-${number}`,
		title,
		'1:1',
	),
)

const vertical = [
	['03', '블루 그래픽 세로 배너'],
	['02', '산업 장비 그래픽 세로 배너'],
	['01', '브랜드 메시지 세로 배너'],
	['04', '수직선 그래픽 세로 배너'],
].map(([number, title]) =>
	imageCard(
		`offline-banner/vertical/application-offline-banner-vertical-${number}`,
		title,
		'1:1',
	),
)

const posters = [
	['51', '사진 중심 행사 포스터'],
	['46', '타이포그래피 중심 행사 포스터'],
	['49', '블루 그래픽 포스터'],
	['48', '그린 그래픽 포스터'],
].map(([number, title]) =>
	imageCard(`poster/examples/application-poster-example-${number}`, title, '1:1'),
)

export function PhysicalPublicationsReference() {
	return (
		<main data-slot="physical-publications-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				{['Brochure', 'Banner', 'Poster', 'Related Resources'].map((title) => (
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
					href="/guideline/reference/digital-publications"
					className="underline underline-offset-4"
				>
					Digital Publications
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Physical Publications" subtitle="인쇄물" />
			<GuidelineSection id="brochure" hierarchy="main">
				<GuidelineSectionHeading
					id="brochure-heading"
					hierarchy="main"
					title="Brochure"
					description="브로슈어는 브랜드의 산업과 기술, 주요 정보를 체계적으로 전달합니다. 표지와 내지에 일관된 로고, 서체, 컬러와 그리드를 적용합니다."
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						imageCard(
							'brochure/cover/application-brochure-cover-01',
							'브로슈어 표지 적용 예시',
							'16:9',
							true,
						),
						imageCard(
							'brochure/body/application-brochure-body-01',
							'브로슈어 내지 적용 예시',
							'16:9',
							true,
						),
					]}
				/>
			</GuidelineSection>
			<GuidelineSection id="brochure-covers" hierarchy="sub">
				<GuidelineSectionHeading
					id="brochure-covers-heading"
					hierarchy="sub"
					title="Cover Type"
					description="타이포그래피, 일러스트레이션, 사진과 그래픽을 활용한 표지 구성 예시입니다."
				/>
				<GuidelineCarouselContainer
					label="브로슈어 표지 예시"
					displayHeight={720}
					cards={covers}
				/>
			</GuidelineSection>
			<GuidelineSection id="brochure-body" hierarchy="sub">
				<GuidelineSectionHeading
					id="brochure-body-heading"
					hierarchy="sub"
					title="Body Type"
					description="제목, 본문, 사진과 목차를 정보의 성격에 맞게 배치한 내지 구성 예시입니다."
				/>
				<GuidelineCarouselContainer
					label="브로슈어 내지 예시"
					displayHeight={720}
					cards={body}
				/>
			</GuidelineSection>

			<GuidelineSection id="banner" hierarchy="main">
				<GuidelineSectionHeading
					id="banner-heading"
					hierarchy="main"
					title="Banner"
					description="배너는 설치 공간과 관람 거리에 맞춰 핵심 메시지를 전달합니다. 가로형과 세로형의 특성에 따라 정보의 위계와 그래픽 비중을 조절합니다."
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						imageCard(
							'offline-banner/horizontal/application-offline-banner-horizontal-01',
							'가로 배너 적용 예시',
							'16:9',
							true,
						),
						imageCard(
							'offline-banner/vertical/application-offline-banner-vertical-01',
							'세로 배너 적용 예시',
							'16:9',
							true,
						),
					]}
				/>
			</GuidelineSection>
			<GuidelineSection id="banner-horizontal" hierarchy="sub">
				<GuidelineSectionHeading
					id="banner-horizontal-heading"
					hierarchy="sub"
					title="Banner (Horizontal)"
					description="가로 공간에 제목과 그래픽을 배치해 주요 메시지를 한눈에 전달합니다."
				/>
				<GuidelineCarouselContainer
					label="가로 배너 예시"
					displayHeight={720}
					cards={horizontal}
				/>
			</GuidelineSection>
			<GuidelineSection id="banner-vertical" hierarchy="sub">
				<GuidelineSectionHeading
					id="banner-vertical-heading"
					hierarchy="sub"
					title="Banner (Vertical)"
					description="세로 흐름에 맞춰 로고, 메시지와 행사 정보를 순서대로 배치합니다."
				/>
				<GuidelineCarouselContainer
					label="세로 배너 예시"
					displayHeight={720}
					cards={vertical}
				/>
			</GuidelineSection>

			<GuidelineSection id="poster" hierarchy="main">
				<GuidelineSectionHeading
					id="poster-heading"
					hierarchy="main"
					title="Poster"
					description="포스터는 하나의 주제를 중심으로 브랜드 메시지와 행사 정보를 전달합니다. 사진, 타이포그래피와 그래픽을 조합해 메시지의 위계를 명확하게 표현합니다."
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						imageCard(
							'poster/overview/application-poster-overview-45',
							'포스터 시리즈 적용 예시',
							'16:9',
							true,
						),
					]}
				/>
			</GuidelineSection>
			<GuidelineSection id="poster-graphic" hierarchy="sub">
				<GuidelineSectionHeading
					id="poster-graphic-heading"
					hierarchy="sub"
					title="Poster (Graphic Type)"
					description="사진과 브랜드 그래픽을 활용한 포스터 구성 예시입니다. 메시지와 세부 정보가 명확히 구분되도록 배치합니다."
				/>
				<GuidelineCarouselContainer
					label="포스터 예시"
					displayHeight={720}
					cards={posters}
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
							...imageCard(
								'brochure/cover/application-brochure-cover-03',
								'브로슈어 제작 예시',
								'1:1',
							),
							caption: {
								type: 'basic',
								title: 'Brochure Create Studio',
								description: '브랜드 가이드를 활용한 브로슈어 제작 도구입니다.',
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
