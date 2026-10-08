// 이 파일은 scripts/generate-graphic-runtime-catalogs.ts로 생성됩니다. 직접 수정하지 마세요.

'use client'

import type { GraphicRuntimeLoader } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import type { GraphRuntimeId } from './manifest.generated'

export const graphRuntimeCatalog = {
	'infographic': () =>
		import('../infographic/runtime.client').then((module) => module.default),
} satisfies Record<GraphRuntimeId, GraphicRuntimeLoader>
