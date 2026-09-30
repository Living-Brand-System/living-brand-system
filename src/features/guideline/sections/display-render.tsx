import {
	GuidelineCardActions,
	type GuidelineDisplayActions,
} from '@/components/guideline/structure/card-actions'
import { GuidelineClearspaceDisplay } from '@/components/guideline/structure/clearspace-display'
import {
	GuidelineColorSwatch,
	GuidelineLogoBackgroundDisplay,
} from '@/components/guideline/structure/color-displays'
import { GuidelineCardDisplay, GuidelineDisplayFrame } from '@/components/guideline/structure/grid'
import {
	GuidelineLayoutGridDisplay,
	GuidelineLayoutOverlayDisplay,
} from '@/components/guideline/structure/guide-displays'
import { GuidelinePaletteDisplay } from '@/components/guideline/structure/palette-display'
import {
	GuidelineTypeWeightAdjustableDisplay,
	GuidelineTypeWeightDisplay,
} from '@/components/guideline/structure/type-weight-display'
import { type PaletteCatalog, resolvePalette } from '../domain/contract/palette'
import { type CmsCard, resolveColor, resolveFile } from './model'

export function renderCmsDisplay(
	display: CmsCard['display'],
	actions: GuidelineDisplayActions,
	catalog: PaletteCatalog,
) {
	const colors = Object.fromEntries(
		Object.values(catalog).flatMap((group) =>
			group.colors.map((color) => [color.label, color.value]),
		),
	)
	switch (display.type) {
		case 'image': {
			const image = resolveFile(display.image)
			return image ? (
				<GuidelineCardDisplay
					src={image.url}
					alt={display.alt || image.alt}
					{...(display.fit === 'cover'
						? { fit: 'cover' as const }
						: { fit: 'contain' as const, scale: display.scale ?? 80 })}
				>
					<GuidelineCardActions {...actions} />
				</GuidelineCardDisplay>
			) : null
		}
		case 'guide': {
			const image = resolveFile(display.image)
			const guide = resolveFile(display.guide)
			return image && guide ? (
				<GuidelineClearspaceDisplay
					logoSrc={image.url}
					gridSrc={guide.url}
					alt={display.alt || image.alt}
					dimBackground={display.dimBackground ?? false}
					actions={actions}
				/>
			) : null
		}
		case 'layout-grid':
			return (
				<GuidelineLayoutGridDisplay
					sample={display.sample ?? 'a'}
					margin={display.marginPct ?? undefined}
					gutterX={display.gutterX ?? undefined}
					gutterY={display.gutterY ?? undefined}
					colors={colors}
					actions={actions}
				/>
			)
		case 'layout-overlay': {
			const images = (display.images ?? []).flatMap((image) =>
				typeof image === 'object' && image.url && image.width && image.height
					? [{ src: image.url, width: image.width, height: image.height }]
					: [],
			)
			return images.length ? (
				<GuidelineLayoutOverlayDisplay images={images} colors={colors} actions={actions} />
			) : null
		}
		case 'type-weight': {
			const languages = display.languages?.length
				? display.languages.map(({ language }) => language)
				: ['ko' as const]
			const props = {
				languages: [languages[0], ...languages.slice(1)] as [
					(typeof languages)[number],
					...(typeof languages)[number][],
				],
				weight: display.weight ?? ('medium' as const),
			}
			return display.adjustable === false ? (
				<GuidelineTypeWeightDisplay
					{...props}
					actions={<GuidelineCardActions {...actions} />}
				/>
			) : (
				<GuidelineTypeWeightAdjustableDisplay
					key={`${props.weight}-${languages.join()}`}
					{...props}
					actions={actions}
				/>
			)
		}
		case 'swatch': {
			const color = resolveColor(display.color)
			return color ? (
				<GuidelineDisplayFrame>
					<div className="absolute inset-0 flex">
						<GuidelineColorSwatch color={color} />
					</div>
					<GuidelineCardActions {...actions} />
				</GuidelineDisplayFrame>
			) : null
		}
		case 'palette': {
			const palette = resolvePalette(display.palette ?? 'brand', catalog)
			if (!palette) return null
			return display.variant === 'logo-backgrounds' ? (
				<GuidelinePaletteDisplay
					groups={palette.groups}
					variant="logo-backgrounds"
					logos={{
						default: resolveFile(display.logos?.default)?.url ?? null,
						white: resolveFile(display.logos?.white)?.url ?? null,
						mono: resolveFile(display.logos?.mono)?.url ?? null,
					}}
					actions={actions}
				/>
			) : (
				<GuidelinePaletteDisplay
					groups={palette.groups}
					variant="swatches"
					layout={display.paletteLayout ?? 'uniform'}
					actions={actions}
				/>
			)
		}
		case 'logo-background': {
			const palette = resolvePalette(display.palette ?? 'brand', catalog)
			const black = resolveFile(display.logos?.black)
			const white = resolveFile(display.logos?.white)
			return palette && black && white ? (
				<GuidelineLogoBackgroundDisplay
					key={palette.id}
					colors={palette.groups.flatMap((group) => group.colors)}
					logos={{ black: black.url, white: white.url }}
					opacity={display.opacity ?? 1}
					actions={actions}
				/>
			) : null
		}
	}
}

export function cmsDisplayAspectRatio(display: CmsCard['display'], catalog: PaletteCatalog) {
	if (display.type !== 'palette' || display.variant !== 'logo-backgrounds') return undefined
	const palette = resolvePalette(display.palette ?? 'brand', catalog)
	const count = palette?.groups.reduce((sum, group) => sum + group.colors.length, 0) ?? 0
	return count ? 48 / (9 * count) : undefined
}
