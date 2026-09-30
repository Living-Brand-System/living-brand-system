import { WEIGHTS } from '../../cards/displays/dynamics/brand-typeface'
import { GUTTER_X, GUTTER_Y, MARGIN } from '../../cards/displays/dynamics/layout-grid/manifest'
import { GUIDE_LINE_WIDTH, guideColorOf } from '../../cards/displays/guide-style'
import { type CmsCard, resolveColor, resolveFile } from '../../sections/model'
import { type PaletteCatalog, resolvePalette } from '../contract/palette'

export type GuidelineReadControl = {
	kind: 'toggle' | 'color'
	label: string
	target: string
	defaultValue: string
	options: { label: string; value: string }[]
	effect: string
}

export type GuidelineReadAction =
	| { kind: 'download'; label: string; files: NonNullable<ReturnType<typeof resolveFile>>[] }
	| { kind: 'link'; label: string; href: string }
	| { kind: 'copy'; label: string; value: string }
	| { kind: 'reset'; label: string; target: string; value: string }

/** 활성 도판 입력만 해석한다. 파일·팔레트 조회는 호출 전에 끝나 있어야 한다. */
export function toReadVisual(display: CmsCard['display'], catalog: PaletteCatalog) {
	const type = display.type
	const guideStyle = {
		color: guideColorOf(
			Object.fromEntries(
				Object.values(catalog).flatMap((group) =>
					group.colors.map((color) => [color.label, color.value]),
				),
			),
		),
		lineWidth: GUIDE_LINE_WIDTH,
	}
	switch (type) {
		case 'image':
		case 'guide': {
			const image = resolveFile(display.image)
			const alt = display.alt || image?.alt || ''
			if (type === 'guide')
				return {
					type,
					image,
					alt,
					guide: resolveFile(display.guide),
					dimBackground: display.dimBackground ?? false,
				}
			return {
				type,
				image,
				alt,
				...(display.fit === 'cover'
					? { fit: 'cover' as const }
					: { fit: 'contain' as const, scale: display.scale ?? 80 }),
			}
		}
		case 'layout-grid':
			return {
				type,
				sample: display.sample ?? 'a',
				marginPct: display.marginPct ?? MARGIN.defaultValue,
				gutterX: display.gutterX ?? GUTTER_X.defaultValue,
				gutterY: display.gutterY ?? GUTTER_Y.defaultValue,
				guideStyle,
			}
		case 'layout-overlay':
			return {
				type,
				guideStyle,
				images: (display.images ?? []).flatMap((image) => {
					const file = resolveFile({ relationTo: 'application-images', value: image })
					return file && typeof image === 'object' && image.width && image.height
						? [{ ...file, width: image.width, height: image.height }]
						: []
				}),
			}
		case 'type-weight':
			return {
				type,
				languages: [
					...new Set(
						display.languages?.length
							? display.languages.map(({ language }) => language)
							: ['ko' as const],
					),
				],
				weight: display.weight ?? 'medium',
				adjustable: display.adjustable !== false,
			}
		case 'swatch':
			return { type, color: resolveColor(display.color) }
		case 'palette': {
			const palette = resolvePalette(display.palette ?? 'brand', catalog)
			return {
				type,
				paletteId: display.palette ?? 'brand',
				palette,
				...(display.variant === 'logo-backgrounds'
					? {
							variant: 'logo-backgrounds' as const,
							logos: {
								default: resolveFile(display.logos?.default),
								white: resolveFile(display.logos?.white),
								mono: resolveFile(display.logos?.mono),
							},
						}
					: { variant: 'swatches' as const, layout: display.paletteLayout ?? 'uniform' }),
			}
		}
		case 'logo-background':
			return {
				type,
				paletteId: display.palette ?? 'brand',
				palette: resolvePalette(display.palette ?? 'brand', catalog),
				opacity: Number.isFinite(display.opacity ?? 1)
					? Math.max(0, Math.min(1, display.opacity ?? 1))
					: 1,
				underlay: '#FFFFFF',
				logos: {
					black: resolveFile(display.logos?.black),
					white: resolveFile(display.logos?.white),
				},
			}
	}
}

export type GuidelineReadVisual = ReturnType<typeof toReadVisual>

/** UI의 조작을 설명할 뿐 실행하거나 현재 사용자 상태를 추정하지 않는다. */
export function visualInteractions(visual: GuidelineReadVisual): {
	controls: GuidelineReadControl[]
	actions: GuidelineReadAction[]
} {
	const controls: GuidelineReadControl[] = []
	const actions: GuidelineReadAction[] = []
	if (
		(visual.type === 'guide' && visual.image && visual.guide) ||
		visual.type === 'layout-grid' ||
		(visual.type === 'layout-overlay' && visual.images.length)
	) {
		controls.push({
			kind: 'toggle',
			label:
				visual.type === 'guide'
					? `${visual.alt} 가이드`
					: visual.type === 'layout-grid'
						? '레이아웃 배치 가이드'
						: '레이아웃 오버레이',
			target: 'visual.guideVisibility',
			defaultValue: 'off',
			options: [
				{ label: 'Off', value: 'off' },
				{ label: 'On', value: 'on' },
			],
			effect: '가이드 레이어 표시 전환',
		})
	}
	if (visual.type === 'type-weight' && visual.adjustable)
		controls.push({
			kind: 'toggle',
			label: '서체 굵기',
			target: 'visual.weight',
			defaultValue: visual.weight,
			options: WEIGHTS.map(({ key, label }) => ({ label, value: key })),
			effect: '도판의 서체 굵기 변경',
		})
	if (visual.type === 'swatch' && visual.color)
		actions.push({
			kind: 'copy',
			label: `${visual.color.label} 색상값 복사`,
			value: visual.color.value,
		})
	if (visual.type === 'palette' && visual.variant === 'swatches' && visual.palette) {
		for (const group of visual.palette.groups)
			for (const color of group.colors)
				actions.push({
					kind: 'copy',
					label: `${color.label} 색상값 복사`,
					value: color.value,
				})
		actions.push({
			kind: 'copy',
			label: '팔레트 전체 복사',
			value: visual.palette.groups
				.map(
					(group) =>
						`${group.name}\n${group.colors.map((color) => `${color.label}: ${color.value}`).join('\n')}`,
				)
				.join('\n\n'),
		})
	}
	if (
		visual.type === 'logo-background' &&
		visual.palette &&
		visual.logos.black &&
		visual.logos.white
	) {
		const options = visual.palette.groups.flatMap((group) =>
			group.colors.map(({ label, value }) => ({ label, value })),
		)
		controls.push({
			kind: 'color',
			label: '배경색',
			target: 'visual.backgroundColor',
			defaultValue: options[0].value,
			options,
			effect: '배경색 변경. 프리셋 외 색상 입력 가능. 불투명도와 흰색 바탕을 합성한 배경 대비에 따라 블랙·화이트 로고 자동 선택',
		})
		actions.push({
			kind: 'reset',
			label: '배경색 초기화',
			target: 'visual.backgroundColor',
			value: options[0].value,
		})
	}
	return { controls, actions }
}
