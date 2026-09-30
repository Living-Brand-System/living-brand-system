import { cache } from 'react'
import type { Swatch, SwatchFamily } from '@/features/asset-check/checkers/palette-match'
import { listBrandColors } from '@/features/asset-check/repositories/brand-color.payload.repository'

function swatchFamily(colorGroup: unknown): SwatchFamily | null {
	if (colorGroup === 'neutral') return 'extreme'
	if (
		colorGroup === 'red' ||
		colorGroup === 'yellow' ||
		colorGroup === 'green' ||
		colorGroup === 'blue' ||
		colorGroup === 'purple' ||
		colorGroup === 'gray'
	) {
		return colorGroup
	}
	return null
}

/**
 * 검수 checker가 쓰는 팔레트 스냅샷을 published brand-colors에서 만든다.
 * Payload 조회는 repository가 소유하고, 이 service는 검수가 아는 어휘(`SwatchFamily`)로 좁힌다.
 */
export const getCheckPalette = cache(async (): Promise<Swatch[]> => {
	const colors = await listBrandColors()

	return colors.flatMap((color) => {
		const family = swatchFamily(color.colorGroup)
		if (!family) return []
		return [
			{
				name: color.name,
				hex: color.hex,
				family,
			},
		]
	})
})
