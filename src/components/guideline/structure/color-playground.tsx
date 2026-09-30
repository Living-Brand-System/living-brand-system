import { PALETTES, resolvePalette } from '@/features/guideline/domain/contract/palette'
import { getGuidelinePalette } from '@/features/guideline/services/get-guideline-colors.service'
import { hexToRgb } from '@/lib/color'
import { GuidelineColorSwatch, GuidelineLogoBackgroundDisplay } from './color-displays'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { type GuidelineCardData, GuidelineDisplayFrame, GuidelineGridContainer } from './grid'
import { GuidelinePaletteDisplay } from './palette-display'

export async function GuidelineColorPlayground() {
	const catalog = await getGuidelinePalette()
	const logos = {
		black: '/brand/hd/ko-horizontal-default-blk@2x.png',
		white: '/brand/hd/ko-horizontal-default-wht@2x.png',
	}
	const palettes = PALETTES.map(({ id }) => resolvePalette(id, catalog)).filter(
		(palette) => palette !== null,
	)
	const cards: GuidelineCardData[] = palettes.flatMap((palette) => [
		{
			id: `background-${palette.id}`,
			ratio: '1:1',
			display: (
				<GuidelineLogoBackgroundDisplay
					colors={palette.groups.flatMap((group) => group.colors)}
					logos={logos}
				/>
			),
			caption: {
				title: `${palette.name} · 로고 배경색`,
				description: '배경과 대비가 높은 블랙·화이트 로고로 자동 전환합니다.',
			},
		},
		{
			id: `palette-${palette.id}`,
			ratio: '1:1',
			display: <GuidelinePaletteDisplay variant="swatches" groups={palette.groups} />,
			caption: {
				type: 'specification',
				title: `${palette.name} · 컬러 스택`,
				groups: palette.groups.map((group) => ({
					title: group.name,
					items: group.colors.map((color) => {
						const rgb = hexToRgb(color.value)
						return {
							label: color.label,
							value: `${color.value} · RGB ${rgb.r} ${rgb.g} ${rgb.b}${color.cmyk ? ` · CMYK ${color.cmyk}` : ''}${color.pantone ? ` · PMS ${color.pantone}` : ''}`,
						}
					}),
				})),
			},
		},
	])
	return (
		<GuidelineSection id="color-playground" hierarchy="main">
			<GuidelineSectionHeading
				id="color-playground-heading"
				hierarchy="main"
				title="Color Playground"
				description="Primary · Supportive · Monotone · Brand 네 가지 팔레트의 로고 배경색과 스와치를 확인합니다."
			/>
			{cards.length ? (
				<GuidelineGridContainer cards={cards} columns={2} displayWidth={480} />
			) : (
				<p>등록된 색상 그룹이 없습니다.</p>
			)}
			{palettes
				.filter((palette) => palette.id !== 'brand')
				.map((palette) => (
					<div key={palette.id} className="w-full" id={`single-swatch-${palette.id}`}>
						<GuidelineSectionHeading
							id={`single-swatch-${palette.id}-heading`}
							hierarchy="sub"
							title={`${palette.name} · 단독 스와치`}
						/>
						<GuidelineGridContainer
							columns={4}
							displayWidth={320}
							cards={palette.groups.flatMap((group) =>
								group.colors.map((color): GuidelineCardData => {
									const rgb = hexToRgb(color.value)
									return {
										id: `swatch-${color.id}`,
										ratio: '3:4',
										display: (
											<GuidelineDisplayFrame>
												<div className="absolute inset-0 flex">
													<GuidelineColorSwatch color={color} />
												</div>
											</GuidelineDisplayFrame>
										),
										caption: {
											type: 'specification',
											title: color.label,
											groups: [
												{
													items: [
														{
															label: 'RGB',
															value: `${rgb.r} / ${rgb.g} / ${rgb.b}`,
														},
														{ label: 'HEX', value: color.value },
														{ label: 'CMYK', value: color.cmyk || '—' },
														{
															label: 'PANTONE',
															value: color.pantone || '—',
														},
													],
												},
											],
										},
									}
								}),
							)}
						/>
					</div>
				))}
		</GuidelineSection>
	)
}
