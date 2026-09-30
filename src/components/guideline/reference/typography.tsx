import { Close } from '@carbon/icons-react'
import Link from 'next/link'
import { GuidelineCardActions } from '@/components/guideline/structure/card-actions'
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
import { GuidelineStickyContainer } from '@/components/guideline/structure/sticky'
import {
	GuidelineTypeWeightAdjustableDisplay,
	GuidelineTypeWeightDisplay,
} from '@/components/guideline/structure/type-weight-display'
import { DisplayFit } from '@/features/guideline/cards/displays/display-fit'
import {
	BRAND_FONT_STACK,
	LANGUAGES,
	type LanguageKey,
	LEADING,
	SAMPLE_PARAGRAPH,
	TIER_SIZE,
	TIERS,
	type TierKey,
	WEIGHTS,
} from '@/features/guideline/cards/displays/dynamics/brand-typeface'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'

import styles from './typography.module.css'

const languageNames: Record<LanguageKey, string> = {
	ko: 'Korean',
	en: 'English',
	enCaps: 'English (All Caps)',
}
const tierNames: Record<TierKey, string> = { head: 'Headings', sub: 'Subhead', body: 'Body' }
const sections = [
	['bold-approach', 'Bold Approach'],
	['hd-typeface', 'HD Typeface'],
	['weight', 'Weight'],
	['micro-typography', 'Micro Typography'],
	['usecases', 'Usecases'],
	['hierarchy', 'Hierarchy'],
	['incorrect-usages', 'Incorrect Usages'],
] as const

// Figma의 반복 복사된 영문 행간 대신 기존 Artboard 46~48의 언어별 계약을 사용합니다.
const specification = (language: LanguageKey, tier: TierKey = 'body') => [
	{ label: 'Kerning', value: 'Auto' },
	{ label: 'Scale', value: '100%' },
	{ label: 'Leading', value: `${LEADING[language][tier][0]} – ${LEADING[language][tier][1]}%` },
	{ label: 'Baseline', value: '0pt' },
]

const languageCards: (GuidelineCardData & { selectionLabel: string })[] = (
	['ko', 'en'] as const
).map((language) => ({
	id: language,
	selectionLabel: languageNames[language],
	ratio: '16:9',
	display: <GuidelineTypeWeightAdjustableDisplay language={language} />,
	caption: {
		type: 'specification',
		title: 'Specification',
		description: `${languageNames[language]} · 본문 조판 기준`,
		groups: [{ items: specification(language) }],
	},
}))

const hierarchyCards: GuidelineCardData[] = LANGUAGES.map(({ key: language, label }) => ({
	id: language,
	ratio: '4:3',
	display: (
		<GuidelineDisplayFrame>
			<DisplayFit>
				<div
					data-slot="type-hierarchy-specimen"
					lang={language === 'ko' ? 'ko' : 'en'}
					className="flex w-[960px] flex-col gap-10 p-12 text-foreground"
					style={{ fontFamily: BRAND_FONT_STACK }}
				>
					{TIERS.map((tier) => (
						<p
							key={tier.key}
							className="whitespace-pre-wrap break-keep"
							style={{
								fontWeight: tier.weight,
								fontSize: TIER_SIZE[tier.key],
								lineHeight: LEADING[language][tier.key][0] / 100,
							}}
						>
							{SAMPLE_PARAGRAPH[language][tier.key]}
						</p>
					))}
				</div>
			</DisplayFit>
		</GuidelineDisplayFrame>
	),
	caption: {
		type: 'specification',
		title: languageNames[language],
		description: label,
		groups: TIERS.map((tier) => ({
			title: tierNames[tier.key],
			items: [
				{ label: 'Weight', value: tier.weight === 700 ? 'Bold' : 'Medium' },
				...specification(language, tier.key),
			],
		})),
	},
}))

export function TypographyReference() {
	return (
		<main data-slot="typography-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				{sections.map(([id, title]) => (
					<Link key={id} href={`#${id}`} className="underline underline-offset-4">
						{title}
					</Link>
				))}
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Typography" subtitle="타이포그래피" />
			<GuidelineSection id="bold-approach" hierarchy="main">
				<GuidelineSectionHeading
					id="bold-approach-heading"
					hierarchy="main"
					title="Bold Approach"
					description="HD체는 HD현대의 역동적인 이미지를 전달하는 브랜드 서체입니다. 굵기와 크기, 행간을 조합해 일관된 인상과 명확한 정보 위계를 만듭니다."
				/>
				<GuidelineGridContainer
					columns={1}
					displayWidth={1440}
					cards={[
						{
							id: 'brand-commitment',
							ratio: '16:9',
							display: (
								<GuidelineCardDisplay
									src="/brand/hd/hd-horizontal-default.svg"
									alt="HD 심볼과 워드마크"
									scale={50}
								/>
							),
							caption: {
								type: 'basic',
								title: 'Brand Commitment 1',
								description:
									'HD 심볼(포워드마크)은 HD 워드마크와 반드시 함께 사용하는 것을 원칙으로 합니다.',
							},
						},
					]}
				/>
			</GuidelineSection>
			<GuidelineSection id="hd-typeface" hierarchy="main">
				<GuidelineSectionHeading
					id="hd-typeface-heading"
					hierarchy="main"
					title="HD Typeface"
					description="HD체는 포워드마크와 연계된 유니크한 사선 포인트와 기울기 등, HD현대의 역동적인 이미지를 표현한 서체입니다. HD현대의 심볼과 일관된 이미지를 전달하며, 온·오프라인 매체에서 주목도 높게 활용할 수 있습니다."
				/>
				<GuidelineGridContainer
					columns={2}
					displayWidth={720}
					cards={(['ko', 'en'] as const).map((language) => ({
						id: language,
						ratio: '4:3',
						display: (
							<GuidelineCardDisplay
								src={`/guideline/reference/typography/typeface-${language === 'ko' ? 'korean' : 'english'}.png`}
								alt={`${languageNames[language]} HD체 제목·본문·문자·숫자·특수문자 표본`}
							/>
						),
						caption: {
							type: 'basic',
							title: languageNames[language],
							description: '국문과 영문을 함께 씁니다.',
						},
					}))}
				/>
			</GuidelineSection>
			<GuidelineSection id="weight" hierarchy="main">
				<GuidelineSectionHeading
					id="weight-heading"
					hierarchy="main"
					title="Weight"
					description="HD체는 총 3개의 굵기(Bold/Medium/Light)로 구성되어 있으며, 상황에 맞는 굵기를 선택해 사용할 수 있습니다."
				/>
				<GuidelineGridContainer
					columns={3}
					displayWidth={480}
					cards={[...WEIGHTS].reverse().map((weight) => ({
						id: weight.key,
						ratio: '2:3',
						display: (
							<GuidelineTypeWeightDisplay
								languages={['ko', 'en']}
								weight={weight.key}
								className={styles.weightDisplay}
							/>
						),
						caption: {
							type: 'basic',
							title: weight.label,
							description: String(weight.value),
						},
					}))}
				/>
			</GuidelineSection>
			<GuidelineSection id="micro-typography" hierarchy="main">
				<GuidelineSectionHeading
					id="micro-typography-heading"
					hierarchy="main"
					title="Micro Typography"
					description="국문과 영문 표본을 선택하고 굵기를 전환해 글자의 인상을 비교하세요. 본문의 행간은 언어별 명세를 따릅니다."
				/>
				<div className="mx-auto w-full max-w-[1440px]">
					<GuidelineCarouselContainer
						label="서체 언어"
						navigation="labels"
						cards={languageCards}
						displayHeight={720}
					/>
				</div>
				<GuidelineGridContainer
					columns={3}
					displayWidth={480}
					minDisplayWidth={320}
					cards={['bold', 'medium', 'light'].map((weight) => ({
						id: `micro-${weight}`,
						ratio: '16:9',
						display: (
							<GuidelineCardDisplay
								src={`/guideline/reference/typography/micro-${weight}.png`}
								alt={`${weight} 국문·영문 혼용 조판과 기준선 예시`}
							/>
						),
						caption: {
							type: 'basic',
							title: `Korean + English · ${weight[0].toUpperCase()}${weight.slice(1)}`,
							description:
								'국문과 영문을 함께 배치했을 때의 글줄과 굵기를 확인합니다.',
						},
					}))}
				/>
			</GuidelineSection>
			<GuidelineSection id="usecases" hierarchy="main">
				<GuidelineSectionHeading
					id="usecases-heading"
					hierarchy="main"
					title="Usecases"
					description="전달된 배너·포스터·프레젠테이션에서 HD체의 제목과 본문 구성을 확인합니다."
				/>
				<GuidelineGridContainer
					columns={3}
					displayWidth={480}
					minDisplayWidth={320}
					cards={[
						['banner', 'X Banner', '세로 배너의 큰 제목과 행사 정보 배치'],
						['poster', 'Poster', '포스터의 제목·일시·장소 정보 위계'],
						[
							'presentation',
							'Presentation',
							'프레젠테이션 표지의 영문 제목과 버전 정보',
						],
					].map(([id, title, description]) => ({
						id,
						ratio: '3:4',
						display: (
							<GuidelineCardDisplay
								src={`/guideline/reference/typography/usecase-${id}.webp`}
								alt={description}
							/>
						),
						caption: { type: 'basic', title, description },
					}))}
				/>
			</GuidelineSection>
			<GuidelineSection id="hierarchy" hierarchy="main">
				<GuidelineSectionHeading
					id="hierarchy-heading"
					hierarchy="main"
					title="Hierarchy"
					description="국·영문 간 균일한 회색톤을 유지할 수 있도록, 정해진 세팅 값을 준수하여 사용해야 합니다."
				/>
				<GuidelineStickyContainer cards={hierarchyCards} mode="switch" />
			</GuidelineSection>

			<GuidelineSection
				id="incorrect-usages"
				hierarchy="main"
				className="rounded-3xl bg-destructive/15"
			>
				<GuidelineSectionHeading
					id="incorrect-usages-heading"
					align="center"
					hierarchy="main"
					title="Incorrect Usages"
					description="서체의 잘못된 사용은 브랜드 아이덴티티의 일관성을 저해할 수 있습니다. 글자 간격·서체·크기·형태를 임의로 변경하지 않습니다."
				/>
				<GuidelineGridContainer
					columns={2}
					displayWidth={720}
					minDisplayWidth={320}
					cards={[
						['과도하게 좁은 글자 간격', '글자 사이 간격을 지나치게 줄일 수 없습니다.'],
						['과도하게 넓은 글자 간격', '글자 사이 간격을 지나치게 넓힐 수 없습니다.'],
						[
							'지정되지 않은 서체',
							'지정된 서체 이외의 다른 서체를 사용할 수 없습니다.',
						],
						[
							'일관되지 않은 글자 크기',
							'한 문장 안에서 각기 다른 글자 크기를 적용할 수 없습니다.',
						],
						['글자 형태 변형', '글자의 형태를 변형할 수 없습니다.'],
						['임의의 기울임', '글자를 기울여 사용할 수 없습니다.'],
					].map(([title, description], index) => ({
						id: `incorrect-${index + 1}`,
						ratio: '4:3',
						display: (
							<GuidelineCardDisplay
								src={`/guideline/reference/typography/incorrect-${String(index + 1).padStart(2, '0')}.png`}
								alt={`${title} 사용 금지 사례`}
								scale={100}
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
