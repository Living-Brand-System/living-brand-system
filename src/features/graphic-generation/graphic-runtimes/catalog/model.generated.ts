// 이 파일은 scripts/generate-graphic-runtime-catalogs.ts로 생성됩니다. 직접 수정하지 마세요.

import type { GraphicStudioPlugin } from '../../runtime/graphic-plugin'
import flutedGlassManifest from '../fluted-glass/definition'
import flutedGlassModel from '../fluted-glass/model'
import forwardStraightManifest from '../forward-straight/definition'
import forwardStraightModel from '../forward-straight/model'
import keyVisualFormationManifest from '../key-visual-formation/definition'
import keyVisualFormationModel from '../key-visual-formation/model'
import keyVisualLineManifest from '../key-visual-line/definition'
import keyVisualLineModel from '../key-visual-line/model'
import keyVisualPatternManifest from '../key-visual-pattern/definition'
import keyVisualPatternModel from '../key-visual-pattern/model'

export const graphicStudioPlugins = [
	{ manifest: flutedGlassManifest, ...flutedGlassModel },
	{ manifest: forwardStraightManifest, ...forwardStraightModel },
	{ manifest: keyVisualFormationManifest, ...keyVisualFormationModel },
	{ manifest: keyVisualLineManifest, ...keyVisualLineModel },
	{ manifest: keyVisualPatternManifest, ...keyVisualPatternModel },
] as const satisfies readonly GraphicStudioPlugin[]
