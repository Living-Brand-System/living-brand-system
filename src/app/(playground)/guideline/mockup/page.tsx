import Link from 'next/link'
import { GuidelineActionVocabularyPlayground } from '@/components/guideline/structure/action-vocabulary-playground'
import { GuidelineCaptionPlayground } from '@/components/guideline/structure/caption-playground'
import { GuidelineCardActionsPlayground } from '@/components/guideline/structure/card-actions-playground'
import { GuidelineCarouselPlayground } from '@/components/guideline/structure/carousel-playground'
import { GuidelineColorPlayground } from '@/components/guideline/structure/color-playground'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import { GuidelineDisplayReviewPlayground } from '@/components/guideline/structure/display-review-playground'
import { GuidelineDynamicPlayground } from '@/components/guideline/structure/dynamic-playground'
import { GuidelineGridPlayground } from '@/components/guideline/structure/grid-playground'
import { GuidelineGuidePlayground } from '@/components/guideline/structure/guide-playground'
import { GuidelineStickyPlayground } from '@/components/guideline/structure/sticky-playground'
import { GuidelineTypeWeightPlayground } from '@/components/guideline/structure/type-weight-playground'
import type { SectionDownload } from '@/features/guideline/services/download-section-assets.client'
import { getGuidelineLockupColors } from '@/features/guideline/services/get-guideline-colors.service'

const base = '/brand/hd/'
const logo = {
	src: `${base}ko-horizontal-default-blk@2x.png`,
	alt: 'HD현대',
	width: 1246,
	height: 328,
}
const asset = (filename: string) => ({ url: `${base}${filename}`, filename })
type MockSection = {
	id: string
	title: string
	hierarchy: 'main' | 'sub'
	align: 'start' | 'center'
	description?: string
	download?: SectionDownload
}
const sections: MockSection[] = [
	{
		id: 'signature',
		hierarchy: 'main',
		align: 'start',
		title: 'Brand Signature',
		description:
			'앞으로 뻗어 나가는 Forward Mark.\nHD현대의 다양한 비즈니스를 하나로 결속시키는 브랜드 시그니처입니다.',
		download: {
			filename: 'brand-signature.zip',
			assets: [asset('ko-horizontal-default.svg'), asset('ko-horizontal-default-blk@2x.png')],
		},
	},
	{
		id: 'safe-area',
		hierarchy: 'sub',
		align: 'start',
		title: 'Safe Area',
		description: '모든 브랜드 접점에서 로고의 명료성을 확보하기 위해 충분한 공간을 확보합니다.',
		download: {
			filename: 'white-logo.zip',
			assets: [asset('ko-horizontal-default-wht@2x.png')],
		},
	},
	{
		id: 'identity',
		hierarchy: 'main',
		align: 'center',
		title: 'Corporate Identity',
		description: '메인 섹션의 중앙 정렬입니다.\n다운로드는 이 섹션에 등록한 파일만 포함합니다.',
		download: { filename: 'identity.zip', assets: [asset('ko-horizontal-default.svg')] },
	},
	{
		id: 'minimum-size',
		hierarchy: 'sub',
		align: 'center',
		title: 'Minimum Size',
		description: '서브섹션의 중앙 정렬입니다.',
	},
	{
		id: 'no-description',
		hierarchy: 'sub',
		align: 'start',
		title: '제목만 있는 서브섹션',
		download: { filename: 'empty.zip', assets: [] },
	},
]

export default async function GuidelineMockupPage() {
	const colors = await getGuidelineLockupColors()
	return (
		<main data-slot="guideline-mockup" className="bg-background text-foreground">
			<nav
				aria-label="목업 섹션 탐색"
				className="flex flex-wrap justify-center gap-4 px-4 py-4 text-sm"
			>
				{sections.map((section) => (
					<Link
						key={section.id}
						href={`#${section.id}`}
						className="underline underline-offset-4"
					>
						{section.title}
					</Link>
				))}
				<Link href="#display-review" className="underline underline-offset-4">
					디스플레이 유지 조건 검토
				</Link>
				<Link href="#grid-playground" className="underline underline-offset-4">
					Grid Playground
				</Link>
				<Link href="#color-playground" className="underline underline-offset-4">
					Color Playground
				</Link>
				<Link href="#card-actions" className="underline underline-offset-4">
					Card Actions
				</Link>
				<Link href="#carousel-playground" className="underline underline-offset-4">
					Carousel Playground
				</Link>
				<Link href="#sticky-playground" className="underline underline-offset-4">
					Sticky Playground
				</Link>
				<Link href="#caption-playground" className="underline underline-offset-4">
					Caption Playground
				</Link>
				<Link href="#dynamic-playground" className="underline underline-offset-4">
					Dynamic Display Playground
				</Link>
				<Link href="#type-weight-playground" className="underline underline-offset-4">
					Type Weight Playground
				</Link>
				<Link href="#guide-playground" className="underline underline-offset-4">
					Guide Toggle Playground
				</Link>
				<Link href="#action-vocabulary" className="underline underline-offset-4">
					Action Vocabulary
				</Link>
				<Link
					href="/guideline/reference/physical-publications"
					className="underline underline-offset-4"
				>
					Physical Publications
				</Link>
				<Link
					href="/guideline/reference/digital-publications"
					className="underline underline-offset-4"
				>
					Digital Publications
				</Link>
				<Link
					href="/guideline/reference/extra-applications"
					className="underline underline-offset-4"
				>
					Extra Applications · 이름 선택 캐러셀
				</Link>
				<Link
					href="/guideline/reference/typography"
					className="underline underline-offset-4"
				>
					Typography
				</Link>
				<Link href="/guideline/reference/layouts" className="underline underline-offset-4">
					Layouts
				</Link>
				<Link
					href="/guideline/reference/key-visuals"
					className="underline underline-offset-4"
				>
					Key Visuals
				</Link>
				<Link
					href="/guideline/reference/iconography"
					className="underline underline-offset-4"
				>
					Iconography
				</Link>
				<Link href="/guideline/reference/color" className="underline underline-offset-4">
					Color
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Corporate Identity" subtitle="기업 로고" />
			{sections.map((section) => (
				<GuidelineSection key={section.id} id={section.id} hierarchy={section.hierarchy}>
					<GuidelineSectionHeading {...section} id={`${section.id}-heading`} />
				</GuidelineSection>
			))}
			<GuidelineGridPlayground />
			<GuidelineCardActionsPlayground />
			<GuidelineCarouselPlayground />
			<GuidelineCaptionPlayground />
			<GuidelineStickyPlayground />
			<GuidelineDynamicPlayground />
			<GuidelineTypeWeightPlayground />
			<GuidelineGuidePlayground />
			<GuidelineActionVocabularyPlayground colors={colors} />
			<GuidelineColorPlayground />
			<GuidelineDisplayReviewPlayground colors={colors} />
			<GuidelineDisplayFooter logo={logo} />
		</main>
	)
}
