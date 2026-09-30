// 이 파일은 scripts/generate-graphic-runtime-catalogs.ts로 생성됩니다. 직접 수정하지 마세요.

'use client'

import type { GraphicRuntimeLoader } from '../../runtime/client/graphic-runtime.client'
import type { GraphicRuntimeId } from './manifest.generated'

export const graphicRuntimeCatalog = {
	'fluted-glass': () =>
		import('../fluted-glass/runtime.client').then((module) => module.default),
	'forward-straight': () =>
		import('../forward-straight/runtime.client').then((module) => module.default),
	'key-visual-formation': () =>
		import('../key-visual-formation/runtime.client').then((module) => module.default),
	'key-visual-line': () =>
		import('../key-visual-line/runtime.client').then((module) => module.default),
	'key-visual-pattern': () =>
		import('../key-visual-pattern/runtime.client').then((module) => module.default),
} satisfies Record<GraphicRuntimeId, GraphicRuntimeLoader>
