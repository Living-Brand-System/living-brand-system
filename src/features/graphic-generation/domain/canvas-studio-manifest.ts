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
		/**
		 * 🔴 제한만 얹고 나머지 선언(`left`·`right`·`remountOn`·`roles`·`clusters`)은 그대로 싣는다 — 하나씩
		 *    골라 다시 조립하면 새 선언이 생길 때마다 조용히 빠진다(빠진 `roles`·`clusters`는 패널을 계약 없는
		 *    평면 목록으로 되돌리고, 빠진 `remountOn`은 모양을 바꿔도 캔버스를 옛 프로그램으로 남긴다).
		 *    전개는 있는 키만 옮기므로 미선언 런타임에 `undefined` 키가 생기지 않는다(JSON 직렬화 검사가 거부한다).
		 */
		controller: { ...manifest.controller, groups },
		controllerPresentation: resolveControllerPresentation(
			groups,
			profile.controllerPresentation,
		),
		previewImage: toStudioPreviewImage(profile.previewImage),
	}
	parseGraphicStudioConfig(config)
	return config
}
