/** 기본 색상군은 세 가지이며 Brand는 저장하지 않고 조합합니다. */
export type PaletteFamily = 'primary' | 'supportive' | 'monotone'
export const PALETTES = [
	{ id: 'primary', name: 'Primary Palette', families: ['primary'] },
	{ id: 'supportive', name: 'Supportive Palette', families: ['supportive'] },
	{ id: 'monotone', name: 'Monotone Palette', families: ['monotone'] },
	{ id: 'brand', name: 'Brand Palette', families: ['primary', 'supportive'] },
] as const satisfies readonly { id: string; name: string; families: readonly PaletteFamily[] }[]
export type PaletteId = (typeof PALETTES)[number]['id']
export type PaletteColor = {
	id: string
	label: string
	value: string
	cmyk?: string | null
	pantone?: string | null
	/** 배경별 로고 사용 규정. 대비 계산으로 추론하지 않습니다. */
	logoUsage?: {
		fullColor: boolean | null
		whiteWordmark: boolean | null
		mono: 'black' | 'white' | null
	}
}
export type PaletteGroup = { id: string; name: string; colors: PaletteColor[] }
export type PaletteCatalog = Partial<Record<PaletteFamily, PaletteGroup>>

/** 일부 색상군이 없으면 불완전한 Brand를 만들지 않습니다. */
export function resolvePalette(id: PaletteId, catalog: PaletteCatalog) {
	const definition = PALETTES.find((palette) => palette.id === id)
	if (!definition) throw new Error(`지원하지 않는 팔레트: ${id}`)
	const groups = definition.families.map((family) => catalog[family])
	if (groups.some((group) => !group?.colors.length)) return null
	return { id: definition.id, name: definition.name, groups: groups as PaletteGroup[] }
}
