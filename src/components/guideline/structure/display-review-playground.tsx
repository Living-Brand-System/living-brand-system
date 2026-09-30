import { CiLockupHeroView } from '@/features/guideline/cards/deprecated/displays/dynamics/ci-lockup-hero/view'
import { PALETTES, resolvePalette } from '@/features/guideline/domain/contract/palette'
import { getGuidelinePalette } from '@/features/guideline/services/get-guideline-colors.service'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { TypeSpecimenReview } from './display-review-controls'
import { type GuidelineCardData, GuidelineDisplayFrame, GuidelineGridContainer } from './grid'
import { GuidelinePaletteDisplay } from './palette-display'

/** 폐기 여부 검토용: 기존 동작을 노출하며 새 디스플레이 계약으로 등록하지 않는다. */
export async function GuidelineDisplayReviewPlayground({
	colors,
}: {
	colors: Record<string, string>
}) {
	const catalog = await getGuidelinePalette()
	const logos = {
		default: '/brand/hd/hd-horizontal-default.svg',
		white: '/brand/hd/hd-horizontal-white.svg',
		mono: '/brand/hd/hd-horizontal-mono.svg',
	}
	const cards: GuidelineCardData[] = [
		{
			id: 'review-specimen',
			ratio: '4:3',
			display: <TypeSpecimenReview />,
			caption: {
				title: 'TypeSpecimen',
				description:
					'크기 단계·정렬·행간·문구를 편집합니다. 가이드 열람에 자유 편집이 필요한지 확인합니다.',
			},
		},
		...(['subsidiary', 'branch'] as const).map(
			(source): GuidelineCardData => ({
				id: `review-hero-${source}`,
				ratio: '4:3',
				display: (
					<GuidelineDisplayFrame>
						<CiLockupHeroView colors={colors} source={source} h={80} />
					</GuidelineDisplayFrame>
				),
				caption: {
					title: `CiLockupHero · ${source === 'subsidiary' ? '자회사' : '해외지사'}`,
					description:
						'기존 이름 자동 순환입니다. 조합 렌더러와 별개로 이 연출을 유지할지 확인합니다. 모션 감소 설정에서는 멈춥니다.',
				},
			}),
		),
	]
	return (
		<>
			<GuidelineSection id="display-review" hierarchy="main">
				<GuidelineSectionHeading
					id="display-review-heading"
					hierarchy="main"
					title="디스플레이 유지 조건 검토"
					description="서체 편집과 배경별 로고 사용을 비교합니다. CI Lockup 자동 순환 예제는 보류 상태로 유지합니다."
				/>
				<GuidelineGridContainer cards={cards} displayWidth={720} columns={2} />
				{!Object.keys(catalog).length && (
					<p>배경색 규정 데이터가 없어 LogoOnBackground 예제를 표시할 수 없습니다.</p>
				)}
			</GuidelineSection>
			{(
				[
					{ id: 'compact', width: 320, title: '320px · 셀 16:9' },
					{ id: 'landscape', width: 480, title: '480px · 셀 16:9' },
					{ id: 'large', width: 720, title: '720px · 셀 16:9' },
				] as const
			).map((sample) => (
				<GuidelineSection
					key={sample.id}
					id={`background-cells-${sample.id}`}
					hierarchy="sub"
				>
					<GuidelineSectionHeading
						id={`background-cells-${sample.id}-heading`}
						hierarchy="sub"
						title={`컬러 셀 비교 · ${sample.title}`}
						description="네 팔레트의 행 높이를 비교합니다. 왼쪽부터 기본형 · WHITE 워드마크 · 단색형이며, 좁은 화면에서는 가용 너비에 맞춰 함께 줄어듭니다."
					/>
					<GuidelineGridContainer
						displayWidth={sample.width}
						columns={2}
						cards={PALETTES.flatMap(({ id }) => {
							const palette = resolvePalette(id, catalog)
							if (!palette) return []
							const rows = palette.groups.reduce(
								(sum, group) => sum + group.colors.length,
								0,
							)
							return [
								{
									id: `${sample.id}-${id}`,
									ratio: '16:9',
									display: (
										<GuidelinePaletteDisplay
											variant="logo-backgrounds"
											groups={palette.groups}
											logos={logos}
										/>
									),
									caption: {
										title: palette.name,
										description: `${rows}행 · 너비 ${sample.width}px 기준 셀 높이 약 ${Math.round(((sample.width / 3) * 9) / 16)}px`,
									},
								} satisfies GuidelineCardData,
							]
						})}
					/>
				</GuidelineSection>
			))}
		</>
	)
}
