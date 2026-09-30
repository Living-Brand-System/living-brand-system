import type {
	GraphicRuntimeManifest,
	GraphicStudioConfig,
	PublishedGraphicProfileDefinition,
} from '@/features/graphic-generation/domain/graphic-studio-config'

/**
 * Graph Studio의 계약은 **Graphic과 한 벌이다** — 만드는 대상만 다르고 Manifest·Controller·
 * Artifact·Export는 같은 규칙을 탄다(`CANVAS_STUDIO_KINDS`).
 *
 * 🔑 그래서 여기서는 타입을 다시 만들지 않고 이름만 준다. 복제하면 두 스튜디오의 계약이
 *    조용히 갈라지고, 그때 무엇이 옳은지 판단할 근거가 사라진다.
 * 🔴 갈리는 것은 둘뿐이다: 런타임 카탈로그(`graph-runtimes`)와 프로파일 컬렉션(`graph-profiles`).
 */
export type GraphRuntimeManifest = GraphicRuntimeManifest
export type GraphStudioConfig = GraphicStudioConfig
export type PublishedGraphProfileDefinition = PublishedGraphicProfileDefinition
