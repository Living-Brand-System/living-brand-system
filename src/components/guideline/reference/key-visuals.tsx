import { Close } from '@carbon/icons-react'
import Link from 'next/link'
import { Fragment } from 'react'
import { GuidelineCardActions } from '@/components/guideline/structure/card-actions'
import { GuidelineCarouselContainer } from '@/components/guideline/structure/carousel'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import { GuidelineCardDisplay, GuidelineGridContainer } from '@/components/guideline/structure/grid'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'

const root = '/guideline/reference/key-visuals'
const types = [
	{
		id: 'a',
		title: 'Type A — 2D Line',
		count: 5,
		description: 'H Direction의 방향성을 직선 그래픽으로 표현합니다.',
		rules: [
			['곡선 사용', '직선이 아닌 곡선형 라인을 사용하지 않습니다.'],
			['동일한 두께', '동일한 두께의 라인을 사용하지 않습니다.'],
			['라인 겹침', '각 라인끼리 겹치게 각도를 설정하지 않습니다.'],
			['서로 다른 방향', '두 개 이상의 서로 다른 흐름의 방향성으로 배치하지 않습니다.'],
			['부족한 라인 수', '세 개 이하의 라인을 사용하지 않습니다.'],
			['복잡한 배경', '복잡한 배경 및 사진 위에 사용하지 않습니다.'],
		],
	},
	{
		id: 'b',
		title: 'Type B — Pattern',
		count: 5,
		description: '방향성을 가진 라인을 패턴으로 확장하여 표현합니다.',
		rules: [
			[
				'제목을 향하는 Start Line',
				'라인의 두꺼운 쪽이 제목 텍스트를 향하지 않도록 배치합니다. 이미지 오른쪽은 권장 예시입니다.',
			],
			['지정되지 않은 컬러 조합', '지정된 컬러 조합 이외의 다른 조합을 사용하지 않습니다.'],
			['서로 다른 패턴 혼용', '서로 다른 패턴을 하나의 지면에 혼용하지 않습니다.'],
			[
				'패턴 부분 적용',
				'패턴 그래픽을 지면 전체가 아닌 일부 영역에만 부분적으로 사용하지 않습니다.',
			],
		],
	},
	{
		id: 'c',
		title: 'Type C — Formation',
		count: 6,
		description: 'H Dimension의 확장을 면에서 선으로 이어지는 그래픽으로 표현합니다.',
		rules: [
			['부족한 전환 단계', '면에서 선으로 이어지는 단계를 5단계 이하로 사용하지 않습니다.'],
			['선 위의 텍스트', '선 위에 텍스트를 배치하지 않습니다.'],
			['선 영역의 이미지', '면의 영역이 아닌 선의 영역에 이미지를 삽입하지 않습니다.'],
			[
				'면과 선의 비율',
				'면의 영역이 선의 영역보다 좁아지지 않도록 하며, 면과 선의 비율은 최소 1:1을 유지합니다.',
			],
		],
	},
	{
		id: 'd',
		title: 'Type D — 3D Texture',
		count: 5,
		description: '입체적인 질감과 공간감을 통해 H Dimension의 확장을 표현합니다.',
		rules: [
			[
				'다른 그래픽과 혼용',
				'질감 위에 다른 키비주얼 또는 다른 사진을 함께 사용하지 않습니다.',
			],
			[
				'텍스트 가독성',
				'텍스트와 겹쳐 사용할 경우 가독성을 최우선으로 고려하여 그래픽의 크롭 범위를 조정합니다. 이미지 오른쪽은 권장 예시입니다.',
			],
			['단순한 형태로 표현', '질감이 아닌 단순한 형태로 인식되도록 사용하지 않습니다.'],
			['지정되지 않은 질감', '지정된 질감 이외의 다른 질감으로 변형하여 사용하지 않습니다.'],
		],
	},
]

export function KeyVisualsReference() {
	return (
		<main data-slot="key-visuals-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				<Link href="#overview" className="underline underline-offset-4">
					Overview
				</Link>
				{types.map(({ id }) => (
					<Link key={id} href={`#type-${id}`} className="underline underline-offset-4">
						Type {id.toUpperCase()}
					</Link>
				))}
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Key Visuals" subtitle="키비주얼" />
			<GuidelineSection id="overview" hierarchy="main">
				<GuidelineSectionHeading
					id="overview-heading"
					hierarchy="main"
					title="Visual Concept & Motif"
					description="포워드마크에서 출발한 H Direction과 H Dimension은 HD현대의 진취적인 태도와 방향성, 산업의 경계를 넘어 확장하는 혁신성을 표현합니다."
				/>
				<GuidelineGridContainer
					columns={1}
					displayWidth={1440}
					cards={[
						{
							id: 'overview',
							ratio: '16:9',
							display: (
								<GuidelineCardDisplay
									src={`${root}/overview.png`}
									alt="포워드마크에서 H Direction의 방향성과 H Dimension의 확장으로 이어지는 콘셉트"
								/>
							),
						},
					]}
				/>
			</GuidelineSection>
			{[
				{
					id: 'hd-direction',
					title: 'HD Direction',
					motifs: types.slice(0, 2),
					names: ['Directional Lines', 'Directional Pattern'],
				},
				{
					id: 'hd-dimension',
					title: 'HD Dimension',
					motifs: types.slice(2),
					names: ['Dimensional Formation', 'Dimensional Texture'],
				},
			].map((group) => (
				<Fragment key={group.id}>
					<GuidelineSection id={group.id} hierarchy="main">
						<GuidelineSectionHeading
							id={`${group.id}-heading`}
							hierarchy="main"
							title={group.title}
						/>
					</GuidelineSection>
					<GuidelineSection id={`${group.id}-types`} hierarchy="sub">
						<GuidelineSectionHeading
							id={`${group.id}-types-heading`}
							hierarchy="sub"
							title="Types"
						/>
						<GuidelineGridContainer
							columns={2}
							displayWidth={480}
							minDisplayWidth={320}
							cards={group.motifs.map((motif, index) => ({
								id: `type-${motif.id}-motif`,
								ratio: '3:4',
								display: (
									<GuidelineCardDisplay
										src={`${root}/type-${motif.id}.png`}
										alt={`${group.names[index]} 기본 모티프`}
										scale={100}
									/>
								),
								caption: {
									type: 'basic',
									title: group.names[index],
									description: motif.description,
								},
							}))}
						/>
					</GuidelineSection>

					{group.motifs.map(({ id, title, count, description, rules }) => (
						<Fragment key={id}>
							<GuidelineSection id={`type-${id}`} hierarchy="main">
								<GuidelineSectionHeading
									id={`type-${id}-heading`}
									hierarchy="main"
									title={title}
									description={description}
								/>
							</GuidelineSection>
							<GuidelineSection id={`type-${id}-examples`} hierarchy="sub">
								<GuidelineSectionHeading
									id={`type-${id}-examples-heading`}
									hierarchy="sub"
									title="Usage Examples"
								/>
								<GuidelineCarouselContainer
									label={`${title} 적용 예시`}
									displayHeight={480}
									cards={Array.from({ length: count }, (_, index) => {
										const number = String(index + 1).padStart(2, '0')
										return {
											id: `type-${id}-${number}`,
											ratio: '4:3' as const,
											display: (
												<GuidelineCardDisplay
													src={`${root}/type-${id}/examples/key-visual-type-${id}-example-${number}.webp`}
													alt={`${title} 적용 예시 ${number}`}
												/>
											),
											caption: {
												type: 'basic' as const,
												title: `${title} · ${number}`,
											},
										}
									})}
								/>
							</GuidelineSection>

							<GuidelineSection
								id={`type-${id}-incorrect-usages`}
								hierarchy="main"
								className="rounded-3xl bg-destructive/15"
							>
								<GuidelineSectionHeading
									id={`type-${id}-incorrect-usages-heading`}
									hierarchy="main"
									align="center"
									title="Incorrect Usages"
									description={`${title}의 사용 금지 사례를 확인합니다.`}
								/>
								<GuidelineGridContainer
									columns={2}
									displayWidth={720}
									minDisplayWidth={320}
									cards={rules.map(([rule, detail], index) => {
										const number = String(index + 1).padStart(2, '0')
										return {
											id: `type-${id}-incorrect-${number}`,
											ratio: '4:3' as const,
											display: (
												<GuidelineCardDisplay
													src={`${root}/type-${id}/incorrect-usage/key-visual-type-${id}-incorrect-usage-${number}.webp`}
													alt={`${title} · ${rule} 사례`}
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
											caption: {
												type: 'basic' as const,
												title: rule,
												description: detail,
											},
										}
									})}
								/>
							</GuidelineSection>
						</Fragment>
					))}
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
