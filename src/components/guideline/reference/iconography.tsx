import { Download } from '@carbon/icons-react'
import Link from 'next/link'
import { Fragment } from 'react'
import { GuidelineCardActions } from '@/components/guideline/structure/card-actions'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import { GuidelineCardDisplay, GuidelineGridContainer } from '@/components/guideline/structure/grid'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'

const root = '/guideline/reference/iconography'
const icons = [
	['container-ship', '컨테이너선'],
	['lng-ship', 'LNG선'],
	['special-purpose-ship', '특수선'],
	['oil-refinery', '정유공장'],
	['gas-station', '주유소'],
	['grc-office', 'GRC 사옥'],
	['gantry-crane', '골리앗 크레인'],
	['industrial-robot', '산업용 로봇'],
	['excavator', '굴착기'],
	['transformer', '변압기'],
]
const variants = [
	{ id: 'outlined', title: 'Line Type', stroke: '1px' },
	{ id: 'filled', title: 'Solid Type', stroke: '5–6px' },
]

function downloadableDisplay(path: string, alt: string, scale = 80) {
	const filename = path.split('/').pop() ?? path
	return (
		<GuidelineCardDisplay src={`${root}/${path}`} alt={alt} scale={scale}>
			<GuidelineCardActions
				end={{
					kind: 'link',
					label: `${alt} 다운로드`,
					href: `${root}/${path}`,
					download: filename,
					icon: <Download size={18} />,
				}}
			/>
		</GuidelineCardDisplay>
	)
}

const asset = (path: string) => ({
	url: `${root}/${path}`,
	filename: path.split('/').pop() ?? path,
})

export function IconographyReference() {
	return (
		<main data-slot="iconography-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				{[['overview', 'Overview'], ...variants.map(({ id, title }) => [id, title])].map(
					([id, title]) => (
						<Link key={id} href={`#${id}`} className="underline underline-offset-4">
							{title}
						</Link>
					),
				)}
				<Link href="/guideline/reference/color" className="underline underline-offset-4">
					Color
				</Link>
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Iconography" subtitle="아이콘" />
			<GuidelineSection id="overview" hierarchy="main">
				<GuidelineSectionHeading
					id="overview-heading"
					hierarchy="main"
					title="Overview"
					description="HD현대의 아이콘은 키비주얼 스타일을 반영하여 차별화된 아이덴티티를 표현합니다. 48px 기반의 그리드를 활용해 다양한 환경에서 일관된 사용성을 유지합니다."
				/>
				<GuidelineGridContainer
					columns={1}
					displayWidth={1440}
					cards={[
						{
							id: 'concept',
							ratio: '16:9',
							display: downloadableDisplay(
								'construction/icon-construction-design-concept.svg',
								'심볼과 HD체의 사선·기하학적 표현·완만한 곡선을 반영한 아이콘 디자인 콘셉트',
							),
						},
					]}
				/>
			</GuidelineSection>
			{variants.map(({ id, title, stroke }) => (
				<Fragment key={id}>
					<GuidelineSection id={id} hierarchy="main">
						<GuidelineSectionHeading
							id={`${id}-heading`}
							hierarchy="main"
							title={title}
							description={
								id === 'outlined'
									? '일관된 선 두께로 산업과 사물의 특징을 표현합니다.'
									: '면으로 채운 형태로 산업과 사물의 특징을 표현합니다.'
							}
						/>
						<GuidelineGridContainer
							columns={1}
							displayWidth={720}
							cards={[
								{
									id: `${id}-construction`,
									ratio: '1:1',
									display: downloadableDisplay(
										`construction/icon-construction-${id}.svg`,
										`${title} 변압기 아이콘 제작 규칙`,
									),
									caption: {
										type: 'specification',
										title: 'Construction',
										groups: [
											{
												items: [
													{ label: 'Icon Area', value: '48 × 48px' },
													{ label: 'Stroke', value: stroke },
													{ label: 'Padding', value: '12px' },
												],
											},
										],
									},
								},
							]}
						/>
					</GuidelineSection>
					<GuidelineSection id={`${id}-icons`} hierarchy="sub">
						<GuidelineSectionHeading
							id={`${id}-icons-heading`}
							download={{
								filename: `hd-iconography-${id}.zip`,
								assets: icons.map(([name]) =>
									asset(`${id}/icon-${name}-${id}.svg`),
								),
							}}
							hierarchy="sub"
							title="Icons"
						/>
						<GuidelineGridContainer
							columns={5}
							displayWidth={240}
							cards={icons.map(([name, label]) => ({
								id: `${name}-${id}`,
								ratio: '1:1',
								display: downloadableDisplay(
									`${id}/icon-${name}-${id}.svg`,
									`${label} ${title} 아이콘`,
									60,
								),
								caption: { type: 'basic', title: label },
							}))}
						/>
					</GuidelineSection>
				</Fragment>
			))}
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
