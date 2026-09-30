import { findCiLockupColors } from '../repositories/ci-lockup-colors.payload.repository'
import { findPaletteCatalog } from '../repositories/palette.payload.repository'

export async function getGuidelinePalette() {
	return findPaletteCatalog()
}

export async function getGuidelineLockupColors() {
	return findCiLockupColors()
}
