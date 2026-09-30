import type {
	GraphicRuntimeManifest,
	GraphicStudioConfig,
	PublishedGraphicProfileDefinition,
} from '@/features/graphic-generation/domain/graphic-studio-config'
import { parseGraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import {
	projectStudioOutputPolicy,
	resolveStudioOutputCapability,
	type StudioOutputCapability,
} from '@/features/studio-export/studio-output'
import {
	applyControllerRestrictions,
	projectPayloadControllerRestrictions,
	resolveControllerPresentation,
	toStudioPreviewImage,
} from '@/modules/studio-controller/controller-definition'

/**
 * 캔버스 스튜디오 둘(Graphic·Graph)이 **함께 쓰는** 파생 로직.
 *
 * 🔑 갈리는 것은 카탈로그와 컬렉션뿐이라, 「프로파일 → Effective Config」를 두 벌로 두면
 *    같은 규칙을 두 번 구현하게 된다. 스튜디오별로 다른 것은 인자로 받는다.
 */

/** Admin의 runtime 드롭다운은 카탈로그가 곧 목록이다. */
export function toCanvasRuntimeOptions(
	manifests: readonly { id: string; name: string }[],
): { value: string; label: string }[] {
	return manifests.map((manifest) => ({ value: manifest.id, label: manifest.name }))
}

/** Artifact와 Admin 정책을 Export Layer가 소비할 effective capability로 투영한다. */
export function resolveCanvasStudioOutput(
	manifest: GraphicRuntimeManifest,
	policy?: unknown,
): StudioOutputCapability {
	return resolveStudioOutputCapability(manifest.artifacts, projectStudioOutputPolicy(policy))
}

export function deriveCanvasStudioConfig(
	profile: PublishedGraphicProfileDefinition,
	findManifest: (id: string) => GraphicRuntimeManifest | null,
	studioLabel: string,
): GraphicStudioConfig {
	const manifest = findManifest(profile.runtime)
	if (!manifest) throw new Error(`등록되지 않은 ${studioLabel} runtime입니다: ${profile.runtime}`)
	const restrictions = projectPayloadControllerRestrictions(profile.controllerRestrictions)
	const groups = applyControllerRestrictions(manifest.controller.groups, restrictions)
	const config: GraphicStudioConfig = {
		...manifest,
		name: profile.name,
		output: resolveCanvasStudioOutput(manifest, profile.exportPolicy),
		controller: {
			groups,
			/**
			 * 🔴 재조립하면서 빠뜨리면 선언이 통째로 사라진다 — `left`를 빠뜨리면 오른쪽 컨트롤이
			 *    전부 왼쪽 패널로 몰리고, `right`를 빠뜨리면 admin 전용으로 내린 축이 전부 오른쪽에
			 *    되살아나고, `remountOn`을 빠뜨리면 모양을 바꿔도 캔버스가 옛 프로그램으로 남는다.
			 *    미선언 런타임의 `undefined`를 그대로 실으면 JSON 직렬화 검사가 프로파일을 거부하므로
			 *    키 자체를 빼야 한다.
			 */
			...(manifest.controller.left ? { left: manifest.controller.left } : {}),
			...(manifest.controller.right ? { right: manifest.controller.right } : {}),
			...(manifest.controller.remountOn ? { remountOn: manifest.controller.remountOn } : {}),
		},
		controllerPresentation: resolveControllerPresentation(
			groups,
			profile.controllerPresentation,
		),
		previewImage: toStudioPreviewImage(profile.previewImage),
	}
	parseGraphicStudioConfig(config)
	return config
}
