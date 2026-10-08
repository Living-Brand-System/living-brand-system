// 이 파일은 scripts/generate-graphic-runtime-catalogs.ts로 생성됩니다. 직접 수정하지 마세요.

import infographicManifest from '../infographic/definition'

export const graphRuntimeManifests = [
	infographicManifest, // infographic
] as const

export type GraphRuntimeId = (typeof graphRuntimeManifests)[number]['id']
