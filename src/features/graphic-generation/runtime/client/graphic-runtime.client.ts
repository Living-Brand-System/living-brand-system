'use client'

import { graphRuntimeCatalog } from '@/features/graph-generation/graph-runtimes/catalog/runtime.generated.client'
import type { GraphicRuntimeManifest } from '@/features/graphic-generation/domain/graphic-studio-config'
import { graphicRuntimeCatalog } from '@/features/graphic-generation/graphic-runtimes/catalog/runtime.generated.client'
import type {
	CanvasVideoSource,
	RasterArtifact,
	VideoArtifact,
} from '@/modules/studio-artifact/studio-artifact'
import type {
	ControllerControlValue,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

export type GraphicBrowserArtifacts = {
	raster: RasterArtifact
	video?: VideoArtifact<CanvasVideoSource>
}

export type GraphicRuntime = {
	update(values: ControllerValues): void
	resize(width: number, height: number): void
	getViewport(): { width: number; height: number }
	artifacts: GraphicBrowserArtifacts
	destroy(): void
}

export type GraphicRuntimeAdapter = {
	type: GraphicRuntimeManifest['type']
	mount(options: {
		container: HTMLElement
		values: ControllerValues
		onChange: (controlId: string, value: ControllerControlValue) => boolean
	}): Promise<GraphicRuntime>
}

export type GraphicRuntimeLoader = () => Promise<GraphicRuntimeAdapter>

/**
 * Canvas 정적 렌더를 Raster Artifact로 노출하고 export 뒤 현재 preview 크기를 복원한다.
 *
 * 🔴 canvas를 **함수로도** 받는다. p5는 `document.readyState !== 'complete'`이면 `setup`을 `load`
 * 이벤트까지 미루므로(p5 1.x 생성자), mount 직후에는 캔버스가 아직 없을 수 있다. 그 시점에 값을
 * 요구하면 런타임이 통째로 실패해 Artifact가 등록되지 않고 내보내기·미리보기 갱신이 조용히 사라진다.
 * 실제로 필요한 시점은 캡처할 때뿐이므로 그때 조회한다.
 */
export function createGraphicRasterArtifact({
	canvas,
	getViewport,
	render,
}: {
	canvas: HTMLCanvasElement | (() => HTMLCanvasElement | null)
	getViewport: () => { width: number; height: number }
	render: (width: number, height: number) => void
}): RasterArtifact {
	return {
		kind: 'raster',
		source: {
			withSurface: (options, consume) => {
				const element = typeof canvas === 'function' ? canvas() : canvas
				if (!element) throw new Error('Canvas가 아직 준비되지 않았습니다.')
				const current = getViewport()
				const width = options.width ?? current.width
				const height = options.height ?? current.height
				const restore = () => render(current.width, current.height)
				try {
					render(width, height)
					const result = consume({ kind: 'canvas', element, width, height })
					if (result instanceof Promise) return result.finally(restore)
					restore()
					return result
				} catch (error) {
					restore()
					throw error
				}
			},
		},
	}
}

/** 🔴 서버의 plugin 카탈로그와 같은 갈래다 — 한쪽만 고치면 미리보기와 내보내기가 어긋난다. */
const CANVAS_RUNTIME_CATALOGS: Record<string, Record<string, GraphicRuntimeLoader | undefined>> = {
	graphic: graphicRuntimeCatalog,
	graph: graphRuntimeCatalog,
}

/** 선택한 Config의 브라우저 runtime만 지연 로드하고 id와 runtime type이 맞는 adapter를 반환한다. */
export async function loadGraphicRuntimeAdapter(
	config: GraphicRuntimeManifest,
): Promise<GraphicRuntimeAdapter | null> {
	const load = CANVAS_RUNTIME_CATALOGS[config.studio]?.[config.id]
	const adapter = await load?.()
	return adapter?.type === config.type ? adapter : null
}
