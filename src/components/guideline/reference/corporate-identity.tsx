import { Download } from '@carbon/icons-react'
import Link from 'next/link'
import { GuidelineCardActions } from '@/components/guideline/structure/card-actions'
import { GuidelineClearspaceDisplay } from '@/components/guideline/structure/clearspace-display'
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
import { GuidelineStickyContainer } from '@/components/guideline/structure/sticky'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'
import { identityCards, safeAreaCards } from './examples'

const asset = (filename: string) => ({ url: `/brand/hd/${filename}`, filename })
const identity: GuidelineCardData[] = identityCards.map((card) => ({
	id: card.id,
	ratio: '4:3',
	display: <GuidelineCardDisplay src={card.image.src} alt={card.image.alt} />,
	caption: card.caption,
}))
const safeArea: GuidelineCardData[] = safeAreaCards.flatMap((card) =>
	card.image
		? [
				{
					id: card.id,
					ratio: '4:3',
					display:
						card.id === 'clear-space' ? (
							<GuidelineClearspaceDisplay
								logoSrc="/guideline/reference/clearspace/hd-horizontal-default-logoSpace.svg"
								gridSrc="/guideline/reference/clearspace/hd-horizontal-default-clearSpace.svg"
								alt="HD 심볼과 워드마크의 최소 보호공간"
							/>
						) : (
							<GuidelineCardDisplay
								src={card.image.src}
								alt={card.image.alt}
								scale={30}
							/>
						),
					caption: card.caption,
				} satisfies GuidelineCardData,
			]
		: [],
)

export function CorporateIdentityReference() {
	return (
		<main data-slot="guideline-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				<Link href="#brand-signature" className="underline underline-offset-4">
					Brand Signature
				</Link>
				<Link href="#safe-area" className="underline underline-offset-4">
					Safe Area
				</Link>
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
				<Link
					href="/guideline/reference/illustrations"
					className="underline underline-offset-4"
				>
					Illustrations
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Corporate Identity" subtitle="기업 로고" />
			<GuidelineSection id="brand-signature" hierarchy="main">
				<GuidelineSectionHeading
					id="brand-signature-heading"
					hierarchy="main"
					align="center"
					title="Brand Signature"
					description="앞으로 뻗어 나가는 화살표 형태의 “Forward Mark”는 녹색 계열의 다채로운 컬러로 이루어져, HD현대의 다양한 비즈니스를 하나로 결속시키는 동시에 인류의 미래를 위한 혁신과 끊임없는 도전 의지를 담고 있습니다."
					download={{
						filename: 'hd-brand-signature.zip',
						assets: [
							'hd-horizontal-default.svg',
							'hd-horizontal-white.svg',
							'hd-horizontal-mono.svg',
						].map(asset),
					}}
				/>
				<GuidelineGridContainer
					displayWidth={1440}
					columns={1}
					cards={[
						{
							id: 'signature',
							ratio: '16:9',
							display: (
								<GuidelineCardDisplay
									src="/brand/hd/hd-horizontal-default.svg"
									alt="HD현대 Forward Mark와 HD 워드마크"
									scale={50}
								>
									<GuidelineCardActions
										end={{
											kind: 'link',
											label: 'HD 로고 기본형 다운로드',
											href: '/brand/hd/hd-horizontal-default.svg',
											download: 'hd-horizontal-default.svg',
											icon: <Download size={18} />,
										}}
									/>
								</GuidelineCardDisplay>
							),
						},
					]}
				/>
				<GuidelineGridContainer displayWidth={480} columns={3} cards={identity} />
			</GuidelineSection>
			<GuidelineSection id="safe-area" hierarchy="sub">
				<GuidelineSectionHeading
					id="safe-area-heading"
					hierarchy="sub"
					title="Safe Area"
					description="모든 브랜드 접점에서 로고의 명료성을 확보하기 위해, 시각적 혼란을 유발할 수 있는 다른 요소로부터 충분한 공간을 확보할 것을 권장합니다."
					download={{
						filename: 'hd-safe-area.zip',
						assets: [
							'hd-horizontal-default-logoSpace.svg',
							'hd-horizontal-default-clearSpace.svg',
						].map((filename) => ({
							filename,
							url: `/guideline/reference/clearspace/${filename}`,
						})),
					}}
				/>
				<GuidelineStickyContainer cards={safeArea} />
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
