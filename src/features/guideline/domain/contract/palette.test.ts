import { expect, it } from 'vitest'
import { PALETTES, type PaletteCatalog, type PaletteId, resolvePalette } from './palette'

it('세 기본군과 Brand 조합만 허용하고 누락된 군을 대체하지 않는다', () => {
	const group = (id: string) => ({ id, name: id, colors: [{ id, label: id, value: '#000000' }] })
	const catalog: PaletteCatalog = {
		primary: group('p'),
		supportive: group('s'),
		monotone: group('m'),
	}
	expect(PALETTES.map(({ id }) => id)).toEqual(['primary', 'supportive', 'monotone', 'brand'])
	expect(resolvePalette('brand', catalog)?.groups).toEqual([catalog.primary, catalog.supportive])
	expect(resolvePalette('monotone', catalog)?.groups).toEqual([catalog.monotone])
	expect(resolvePalette('brand', { primary: catalog.primary })).toBeNull()
	expect(resolvePalette('primary', { primary: { ...group('p'), colors: [] } })).toBeNull()
	expect(() => resolvePalette('all' as PaletteId, catalog)).toThrow()
})
