import type { GraphicRuntimeManifest } from '@/features/graphic-generation/domain/graphic-studio-config'
import type { VectorSceneArtifact } from '@/modules/studio-artifact/studio-artifact'
import type {
	ControllerRuntimeBindings,
	ControllerValues,
	StudioControllerRestrictions,
} from '@/modules/studio-controller/controller-definition'

export type GraphicViewport = { width: number; height: number }

/** Graphic 하나가 Catalog에 제공하는 직렬화 가능한 Manifest와 순수 runtime adapter 계약. */
export type GraphicStudioPlugin<Id extends string = string> = {
	manifest: GraphicRuntimeManifest & { id: Id }
	createVectorArtifact?: (
		values: ControllerValues,
		viewport: GraphicViewport,
	) => VectorSceneArtifact
	getBindings?: (viewport: GraphicViewport) => ControllerRuntimeBindings
	/**
	 * 현재 값에 따라 **선택지를 좁힌다** — 「면을 고르면 선 색 선택지가 바뀐다」가 사는 자리.
	 *
	 * 🔴 좁히기만 된다. `applyControllerRestrictions`가 기본 계약보다 넓히면 던지므로, 여기서
	 *    낼 수 있는 것은 언제나 Definition의 부분집합이다.
	 * 🔑 binding이 아니라 restriction인 이유: binding은 `(viewport)`만 받고 값이 바뀌어도
	 *    다시 계산되지 않는다. 값에 따라 달라지는 것은 이 채널이 갖는다.
	 */
	getRestrictions?: (values: ControllerValues) => StudioControllerRestrictions | null
}

/** 자산 model 파일이 Manifest와 분리해 제공하는 순수 계산 adapter 계약. */
export type GraphicModelAdapter = Omit<GraphicStudioPlugin, 'manifest'>

/** Plugin ID 중복을 거부하고 조회 전용 Catalog를 만든다. */
export function createGraphicStudioPluginCatalog<
	const Plugins extends readonly GraphicStudioPlugin[],
>(plugins: Plugins): Readonly<Record<Plugins[number]['manifest']['id'], Plugins[number]>> {
	const catalog: Record<string, GraphicStudioPlugin> = Object.create(null)
	for (const plugin of plugins) {
		const { id } = plugin.manifest
		if (Object.hasOwn(catalog, id)) throw new Error(`중복된 Graphic plugin입니다: ${id}`)
		catalog[id] = plugin
	}
	return Object.freeze(catalog) as Readonly<
		Record<Plugins[number]['manifest']['id'], Plugins[number]>
	>
}
