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
import styles from './digital-publications.module.css'

const root = '/guideline/reference/digital-publications'

function imageCard(path: string, title: string, overview = false): GuidelineCardData {
	return {
		id: path,
		ratio: '16:9',
		display: (
			<GuidelineCardDisplay
				src={`${root}/${path}.webp`}
				alt={title}
				sizes="(max-width: 1504px) 100vw, 1440px"
				className={overview ? styles.overview : undefined}
			/>
		),
		caption: { type: 'basic', title },
	}
}

// Figma 176:16472의 표시 순서. 미디어월은 개별 에셋을 사용합니다.
const mediaWall = [
	['66', '분할 레이아웃 미디어월'],
	['68', '브랜드 그래픽 미디어월'],
	['69', '브랜드 메시지 미디어월'],
].map(([number, title]) =>
	imageCard(`media-wall/examples/application-media-wall-example-${number}`, title),
)

const covers = [
	['04', '그린 그래픽 표지'],
	['03', '블루 그래픽 표지'],
	['01', '선박 일러스트레이션 표지'],
].map(([number, title]) =>
	imageCard(`presentation/cover/application-presentation-cover-${number}`, title),
)

const body = [
	['01', '장 제목 슬라이드'],
	['03', '이미지 분할 슬라이드'],
	['04', '본문과 이미지 조합 슬라이드'],
].map(([number, title]) =>
	imageCard(`presentation/body/application-presentation-body-${number}`, title),
)

export function DigitalPublicationsReference() {
	return (
		<main data-slot="digital-publications-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				{['Media Wall', 'Presentation', 'Related Resources'].map((title) => (
					<Link
						key={title}
						href={`#${title.toLowerCase().replaceAll(' ', '-')}`}
						className="underline underline-offset-4"
					>
						{title}
					</Link>
				))}
				<Link
					href="/guideline/reference/physical-publications"
					className="underline underline-offset-4"
				>
					Physical Publications
				</Link>
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Digital Publications" subtitle="디지털 인쇄물" />
			<GuidelineSection id="media-wall" hierarchy="main">
				<GuidelineSectionHeading
					id="media-wall-heading"
					hierarchy="main"
					title="Media Wall"
					description="미디어월은 넓은 디지털 화면을 활용해 브랜드 메시지와 행사 정보를 전달합니다. 화면의 가로 흐름에 맞춰 로고, 핵심 문구와 그래픽을 배치합니다."
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						imageCard(
							'media-wall/examples/application-media-wall-example-69',
							'미디어월 적용 예시',
							true,
						),
					]}
				/>
			</GuidelineSection>
			<GuidelineSection id="media-wall-examples" hierarchy="sub">
				<GuidelineSectionHeading
					id="media-wall-examples-heading"
					hierarchy="sub"
					title="Examples"
					description="브랜드 메시지와 그래픽을 조합한 미디어월 구성 예시입니다."
				/>
				<GuidelineCarouselContainer
					label="미디어월 예시"
					displayHeight={720}
					cards={mediaWall}
				/>
			</GuidelineSection>

			<GuidelineSection id="presentation" hierarchy="main">
				<GuidelineSectionHeading
					id="presentation-heading"
					hierarchy="main"
					title="Presentation"
					description="프레젠테이션은 브랜드의 정보를 명확하고 일관되게 전달합니다. 표지와 본문에 공통 그리드와 서체를 적용하고, 내용에 맞춰 이미지와 텍스트의 비중을 조절합니다."
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						imageCard(
							'presentation/cover/application-presentation-cover-02',
							'프레젠테이션 표지 적용 예시',
							true,
						),
						imageCard(
							'presentation/body/application-presentation-body-03',
							'프레젠테이션 본문 적용 예시',
							true,
						),
					]}
				/>
			</GuidelineSection>
			<GuidelineSection id="presentation-covers" hierarchy="sub">
				<GuidelineSectionHeading
					id="presentation-covers-heading"
					hierarchy="sub"
					title="Cover Type Examples"
					description="브랜드 그래픽과 일러스트레이션을 활용한 표지 구성 예시입니다."
				/>
				<GuidelineCarouselContainer
					label="프레젠테이션 표지 예시"
					displayHeight={720}
					cards={covers}
				/>
			</GuidelineSection>
			<GuidelineSection id="presentation-body" hierarchy="sub">
				<GuidelineSectionHeading
					id="presentation-body-heading"
					hierarchy="sub"
					title="Body Type Examples"
					description="장 제목, 이미지와 본문을 정보의 위계에 맞춰 배치한 슬라이드 구성 예시입니다."
				/>
				<GuidelineCarouselContainer
					label="프레젠테이션 본문 예시"
					displayHeight={720}
					cards={body}
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
							id: 'brochure-create-studio',
							ratio: '1:1',
							display: (
								<GuidelineCardDisplay
									src="/guideline/reference/physical-publications/brochure/cover/application-brochure-cover-03.webp"
									alt="브로슈어 제작 예시"
								/>
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
