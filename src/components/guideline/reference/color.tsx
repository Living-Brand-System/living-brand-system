import Link from 'next/link'
import { GuidelineColorSwatch } from '@/components/guideline/structure/color-displays'
import {
	GuidelineDisplayFooter,
	GuidelineDisplayHeading,
	GuidelineSection,
	GuidelineSectionHeading,
} from '@/components/guideline/structure/components'
import {
	GuidelineDisplayFrame,
	GuidelineGridContainer,
} from '@/components/guideline/structure/grid'
import { GuidelinePaletteDisplay } from '@/components/guideline/structure/palette-display'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'
import {
	PALETTES,
	type PaletteCatalog,
	resolvePalette,
} from '@/features/guideline/domain/contract/palette'
import { hexToRgb } from '@/lib/color'

const logos = {
	default: '/brand/hd/hd-horizontal-default.svg',
	white: '/brand/hd/hd-horizontal-white.svg',
	mono: '/brand/hd/hd-horizontal-mono.svg',
}

export function ColorReference({ catalog }: { catalog: PaletteCatalog }) {
	const palettes = PALETTES.map(({ id }) => resolvePalette(id, catalog)).filter(
		(palette) => palette !== null,
	)
	const brand = resolvePalette('brand', catalog)
	return (
		<main data-slot="color-reference" className={GUIDELINE_DOCUMENT_SURFACE}>
			<nav
				aria-label="가이드 섹션 탐색"
				className="flex flex-wrap justify-center gap-6 px-8 py-4 text-sm"
			>
				{palettes.map(({ id, name }) => (
					<Link key={id} href={`#${id}`} className="underline underline-offset-4">
						{name}
					</Link>
				))}
				<Link href="#logo-backgrounds" className="underline underline-offset-4">
					Logo on Background
				</Link>
				<Link href="/guideline/mockup" className="underline underline-offset-4">
					플레이그라운드
				</Link>
			</nav>
			<GuidelineDisplayHeading title="Color" subtitle="컬러" />
			<GuidelineSection id="overview" hierarchy="main">
				<GuidelineSectionHeading
					id="overview-heading"
					hierarchy="main"
					title="Overview"
					description="Primary·Supportive·Monotone 세 색상군을 구분하여 사용합니다. Brand Palette는 Primary와 Supportive를 함께 구성한 팔레트입니다."
				/>
				{brand ? (
					<GuidelineGridContainer
						columns={1}
						displayWidth={1440}
						cards={[
							{
								id: 'overview',
								ratio: '16:9',
								display: (
									<GuidelinePaletteDisplay
										variant="swatches"
										groups={brand.groups}
									/>
								),
							},
						]}
					/>
				) : (
					<p>Primary와 Supportive 색상 그룹을 등록하면 Brand Palette가 표시됩니다.</p>
				)}
			</GuidelineSection>
			{palettes.map((palette) => (
				<GuidelineSection key={palette.id} id={palette.id} hierarchy="main">
					<GuidelineSectionHeading
						id={`${palette.id}-heading`}
						hierarchy="main"
						title={palette.name}
						description={
							palette.id === 'brand'
								? 'Primary와 Supportive를 함께 확인합니다.'
								: '색상 스와치를 선택하면 HEX 값을 복사할 수 있습니다.'
						}
					/>
					{palette.id === 'brand' ? (
						<GuidelineGridContainer
							columns={1}
							displayWidth={1440}
							cards={[
								{
									id: 'brand-stack',
									ratio: '16:9',
									display: (
										<GuidelinePaletteDisplay
											variant="swatches"
											groups={palette.groups}
										/>
									),
								},
							]}
						/>
					) : (
						<GuidelineGridContainer
							columns={4}
							displayWidth={320}
							minDisplayWidth={240}
							cards={palette.groups.flatMap((group) =>
								group.colors.map((color) => {
									const rgb = hexToRgb(color.value)
									return {
										id: color.id,
										ratio: '3:4' as const,
										display: (
											<GuidelineDisplayFrame>
												<div className="absolute inset-0 flex">
													<GuidelineColorSwatch color={color} />
												</div>
											</GuidelineDisplayFrame>
										),
										caption: {
											type: 'specification' as const,
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
					)}
				</GuidelineSection>
			))}
			<GuidelineSection id="logo-backgrounds" hierarchy="main">
				<GuidelineSectionHeading
					id="logo-backgrounds-heading"
					hierarchy="main"
					title="Logo on Background"
					description="배경색별 기본형·WHITE 워드마크·단색형 사용 규정을 비교합니다. 사용 규정이 등록되지 않은 항목은 별도로 표시됩니다."
				/>
				{palettes.length ? (
					<GuidelineGridContainer
						columns={2}
						displayWidth={720}
						minDisplayWidth={320}
						cards={palettes.map((palette) => ({
							id: palette.id,
							ratio: '4:3',
							display: (
								<GuidelinePaletteDisplay
									variant="logo-backgrounds"
									groups={palette.groups}
									logos={logos}
								/>
							),
							caption: { type: 'basic', title: palette.name },
						}))}
					/>
				) : (
					<p>등록된 색상 그룹이 없습니다.</p>
				)}
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
