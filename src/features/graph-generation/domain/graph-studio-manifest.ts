import type {
	GraphRuntimeManifest,
	GraphStudioConfig,
	PublishedGraphProfileDefinition,
} from '@/features/graph-generation/domain/graph-studio-config'
import { graphRuntimeManifests } from '@/features/graph-generation/graph-runtimes/catalog/manifest.generated'
import {
	deriveCanvasStudioConfig,
	toCanvasRuntimeOptions,
} from '@/features/graphic-generation/domain/canvas-studio-manifest'

export { graphRuntimeManifests }

export type GraphRuntimeId = (typeof graphRuntimeManifests)[number]['id']

/** Admin의 runtime 드롭다운. 카탈로그가 곧 목록이라 손으로 적지 않는다. */
export const GRAPH_RUNTIME_OPTIONS = toCanvasRuntimeOptions(graphRuntimeManifests)

export function getGraphRuntimeManifest(id: string): GraphRuntimeManifest | null {
	return graphRuntimeManifests.find((manifest) => manifest.id === id) ?? null
}

/** published Graph Profile을 Manifest 기본 계약보다 좁은 Effective Config로 투영한다. */
export function deriveGraphStudioConfig(
	profile: PublishedGraphProfileDefinition,
): GraphStudioConfig {
	return deriveCanvasStudioConfig(profile, getGraphRuntimeManifest, 'Graph')
}
