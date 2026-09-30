import {
	deriveCanvasStudioConfig,
	resolveCanvasStudioOutput,
	toCanvasRuntimeOptions,
} from '@/features/graphic-generation/domain/canvas-studio-manifest'
import type {
	GraphicRuntimeManifest,
	GraphicStudioConfig,
	PublishedGraphicProfileDefinition,
} from '@/features/graphic-generation/domain/graphic-studio-config'
import { graphicRuntimeManifests } from '@/features/graphic-generation/graphic-runtimes/catalog/manifest.generated'

export { graphicRuntimeManifests }

export type GraphicRuntimeId = (typeof graphicRuntimeManifests)[number]['id']

export const GRAPHIC_RUNTIME_OPTIONS = toCanvasRuntimeOptions(graphicRuntimeManifests)

/** Admin과 published projector가 읽는 서버 안전 Graphic Manifest를 찾는다. */
export function getGraphicRuntimeManifest(id: string): GraphicRuntimeManifest | null {
	return graphicRuntimeManifests.find((manifest) => manifest.id === id) ?? null
}

export const resolveGraphicStudioOutput = resolveCanvasStudioOutput

/** published Graphic Profile을 Manifest 기본 계약보다 좁은 Effective Config로 투영한다. */
export function deriveGraphicStudioConfig(
	profile: PublishedGraphicProfileDefinition,
): GraphicStudioConfig {
	return deriveCanvasStudioConfig(profile, getGraphicRuntimeManifest, 'Graphic')
}
