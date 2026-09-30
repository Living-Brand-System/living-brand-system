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
import styles from './extra-applications.module.css'

const root = '/guideline/reference/extra-applications'
const vehicles: (GuidelineCardData & { selectionLabel: string })[] = [
	['box-truck', 'Box Truck', '박스 트럭', 'overview'],
	['flatbed-truck', 'Flatbed Truck', '평판 트럭', 'overview'],
	['bus', 'Bus', '버스', 'front-rear-overview'],
	['van', 'Van', '밴', 'overview'],
].map(([id, selectionLabel, name, view]) => ({
	id,
	selectionLabel,
	ratio: '16:9',
	display: (
		<GuidelineCardDisplay
			src={`${root}/vehicle-wrapping/${id}/application-vehicle-${id}-${view}.webp`}
			alt={`${name} 래핑 적용 예시`}
			sizes="(max-width: 1504px) 100vw, 1440px"
		/>
	),
}))

export function ExtraApplicationsReference() {
	return (
		<main data-slot="extra-applications-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				<Link href="#vehicle-wrapping" className="underline underline-offset-4">
					Vehicle Wrapping
				</Link>
				<Link href="#shopping-bag" className="underline underline-offset-4">
					Shopping Bag
				</Link>
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Extra Applications" subtitle="기타 적용 예제" />
			<GuidelineSection id="vehicle-wrapping" hierarchy="main">
				<GuidelineSectionHeading
					id="vehicle-wrapping-heading"
					hierarchy="main"
					title="Vehicle Wrapping"
					description="차량의 형태와 면적에 맞춰 로고와 브랜드 그래픽을 배치합니다. 차종별 적용 예시를 선택해 각 면의 구성을 확인하세요."
				/>
				<div className="mx-auto w-full max-w-[1440px]">
					<GuidelineCarouselContainer
						label="차량 래핑"
						navigation="labels"
						cards={vehicles}
						displayHeight={720}
					/>
				</div>
			</GuidelineSection>
			<GuidelineSection id="shopping-bag" hierarchy="main">
				<GuidelineSectionHeading
					id="shopping-bag-heading"
					hierarchy="main"
					title="Shopping Bag"
					description="쇼핑백의 앞면과 옆면에 로고, 브랜드 컬러와 그래픽을 일관되게 적용합니다. 밝은 바탕과 어두운 바탕의 구성 예시를 확인하세요."
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						['60', '쇼핑백 앞면과 옆면 적용 예시'],
						['55', '그린·블루 쇼핑백 적용 예시'],
					].map(([number, title]) => ({
						id: `shopping-bag-${number}`,
						ratio: '16:9',
						display: (
							<GuidelineCardDisplay
								src={`${root}/shopping-bag/overview/application-shopping-bag-overview-${number}.webp`}
								alt={title}
								sizes="(max-width: 1504px) 100vw, 1440px"
								className={styles.overview}
							/>
						),
						caption: { type: 'basic', title },
					}))}
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
