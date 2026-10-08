// 이 파일은 scripts/generate-graphic-runtime-catalogs.ts로 생성됩니다. 직접 수정하지 마세요.

import type { GraphicStudioPlugin } from '@/features/graphic-generation/runtime/graphic-plugin'
import infographicManifest from '../infographic/definition'
import infographicModel from '../infographic/model'

export const graphStudioPlugins = [
	{ manifest: infographicManifest, ...infographicModel },
] as const satisfies readonly GraphicStudioPlugin[]
