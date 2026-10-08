import {
	type BrandColorRecord,
	findPublishedBrandColors,
} from '../repositories/brand-color.payload.repository'

export type { BrandColorRecord }

/**
 * published 브랜드 색 목록 — 다른 경계가 `brand-colors`를 읽는 유일한 입구(경계 규칙 R1·R3).
 * 소비자는 자기 어휘로 좁힌다(검수는 `SwatchFamily`, 인쇄는 잉크 Map, 캔버스는 강조색 하나).
 */
export function listPublishedBrandColors(): Promise<BrandColorRecord[]> {
	return findPublishedBrandColors()
}
