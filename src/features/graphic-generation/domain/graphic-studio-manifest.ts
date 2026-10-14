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

// 런타임 id 타입은 생성 카탈로그가 정본이다 — 여기서 다시 계산하지 않고 내보내기만 한다.
export type { GraphicRuntimeId } from '@/features/graphic-generation/graphic-runtimes/catalog/manifest.generated'
export { graphicRuntimeManifests }

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
