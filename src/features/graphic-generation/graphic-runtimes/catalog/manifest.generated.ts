// 이 파일은 scripts/generate-graphic-runtime-catalogs.ts로 생성됩니다. 직접 수정하지 마세요.

import flutedGlassManifest from '../fluted-glass/definition'
import forwardStraightManifest from '../forward-straight/definition'
import keyVisualFormationManifest from '../key-visual-formation/definition'
import keyVisualLineManifest from '../key-visual-line/definition'
import keyVisualPatternManifest from '../key-visual-pattern/definition'

export const graphicRuntimeManifests = [
	flutedGlassManifest, // fluted-glass
	forwardStraightManifest, // forward-straight
	keyVisualFormationManifest, // key-visual-formation
	keyVisualLineManifest, // key-visual-line
	keyVisualPatternManifest, // key-visual-pattern
] as const

export type GraphicRuntimeId = (typeof graphicRuntimeManifests)[number]['id']
