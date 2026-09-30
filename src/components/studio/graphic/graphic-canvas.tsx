'use client'

import { type ComponentType, type CSSProperties, useEffect, useRef, useState } from 'react'
import { ControllerBar } from '@/components/shared/controller'
import { fitPreviewSize } from '@/components/studio/shared/fit-preview-size'
import {
	DEFAULT_PREVIEW_SIZE,
	PreviewSizeControl,
} from '@/components/studio/shared/preview-size-control'
import { Typography } from '@/components/ui/typography'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import {
	type GraphicRuntime,
	loadGraphicRuntimeAdapter,
} from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import { getGraphicStudioRuntimeBindings } from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import type { GraphicExportView } from '@/features/studio-export/hooks/use-graphic-export'
import { controllerRemountKey } from '@/modules/studio-controller/controller-definition'

/** runtime type에 맞는 공용 Canvas를 고른다. 개별 그래픽 id는 Preview registry가 해석한다. */
export function GraphicCanvas({
	output,
	registerArtifacts,
}: {
	output: GraphicExportView
	registerArtifacts: (
		artifacts: GraphicRuntime['artifacts'] | null,
		viewport?: { width: number; height: number },
	) => void
}) {
	const { config } = useGraphicStudio()
	const RuntimeCanvas = canvasByType[config.type]
	return <RuntimeCanvas output={output} registerArtifacts={registerArtifacts} />
}

type RuntimeCanvasProps = {
	output: GraphicExportView
	registerArtifacts: (
		artifacts: GraphicRuntime['artifacts'] | null,
		viewport?: { width: number; height: number },
	) => void
}

const canvasByType = {
	p5: P5Canvas,
	shader: WebGLCanvas,
} satisfies Record<GraphicStudioConfig['type'], ComponentType<RuntimeCanvasProps>>

function P5Canvas(props: RuntimeCanvasProps) {
	return <RegisteredGraphicCanvas type="p5" {...props} />
}

function WebGLCanvas(props: RuntimeCanvasProps) {
	return <RegisteredGraphicCanvas type="shader" {...props} />
}

function RegisteredGraphicCanvas({
	type,
	output,
	registerArtifacts,
}: RuntimeCanvasProps & { type: GraphicStudioConfig['type'] }) {
	return (
		<GraphicPreviewCanvas type={type} output={output} registerArtifacts={registerArtifacts} />
	)
}

function GraphicPreviewCanvas({
	type,
	output,
	registerArtifacts,
}: {
	type: GraphicStudioConfig['type']
} & RuntimeCanvasProps) {
	const { config, controls } = useGraphicStudio()
	const valuesRef = useRef(controls.values)
	const stageRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const runtimeRef = useRef<GraphicRuntime>(null)
	const [error, setError] = useState<string | null>(null)
	const [previewSize, setPreviewSize] = useState(DEFAULT_PREVIEW_SIZE)
	const outputWidth = output.draft?.width
	const outputHeight = output.draft?.height
	// 런타임을 다시 세워야 하는 값들의 지문 — 규칙과 근거는 계약이 갖는다.
	const remountKey = controllerRemountKey(config.controller.remountOn, controls.values)

	useEffect(() => {
		valuesRef.current = controls.values
		runtimeRef.current?.update(controls.values)
	}, [controls.values])

	/*
	 * `remountKey`는 본문에 이름이 보이지 않는다 — 런타임은 `valuesRef.current`로 모양을 읽는다.
	 * 그래도 의존성이어야 한다: 그 값이 바뀌면 다른 셰이더 프로그램을 컴파일해야 하므로 effect가
	 * 다시 돌아야 한다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies(remountKey): 위 주석 — 재마운트 트리거다
	useEffect(() => {
		let runtime: GraphicRuntime | undefined
		let disposed = false

		async function mountPreview() {
			const container = containerRef.current
			if (!container) return

			try {
				const adapter = await loadGraphicRuntimeAdapter(config)
				if (disposed) return
				if (!adapter || adapter.type !== type) {
					if (!disposed) setError('지원하지 않는 그래픽 런타임입니다.')
					return
				}
				const mounted = await adapter.mount({
					container,
					values: valuesRef.current,
					onChange: controls.update,
				})
				if (disposed) {
					mounted.destroy()
					return
				}
				setError(null)
				runtime = mounted
				runtimeRef.current = mounted
				const viewport = mounted.getViewport()
				controls.registerBindings(getGraphicStudioRuntimeBindings(config, viewport))
				registerArtifacts(mounted.artifacts, viewport)
			} catch (mountError) {
				console.error(mountError)
				if (!disposed) setError('그래픽 미리보기를 불러오지 못했습니다.')
			}
		}

		void mountPreview()
		return () => {
			disposed = true
			runtime?.destroy()
			runtimeRef.current = null
			registerArtifacts(null)
			controls.registerBindings({})
		}
	}, [config, controls.registerBindings, controls.update, registerArtifacts, remountKey, type])

	useEffect(() => {
		const stage = stageRef.current
		const container = containerRef.current
		if (!stage || !container) return

		const resizePreview = (width: number, height: number) => {
			if (width <= 0 || height <= 0) return
			const viewport =
				outputWidth && outputHeight
					? fitPreviewSize(
							{ width, height },
							{ width: outputWidth, height: outputHeight },
						)
					: { width, height }
			container.style.width = `${viewport.width}px`
			container.style.height = `${viewport.height}px`
			runtimeRef.current?.resize(viewport.width, viewport.height)
			controls.registerBindings(getGraphicStudioRuntimeBindings(config, viewport))
		}

		const resizeObserver = new ResizeObserver(([entry]) => {
			if (!entry) return
			resizePreview(entry.contentRect.width, entry.contentRect.height)
		})
		resizePreview(stage.clientWidth, stage.clientHeight)
		resizeObserver.observe(stage)
		return () => resizeObserver.disconnect()
	}, [config, controls.registerBindings, outputHeight, outputWidth])

	return (
		<figure data-slot="graphic-canvas" className="relative flex min-h-0 flex-1 flex-col">
			{/* 🔴 하단 예약: 플로팅 바가 bottom-10(40px)에 높이 60px으로 떠 있어서, 예약이 없으면
			    기본 100% 배율의 프리뷰 아래쪽이 바 뒤로 들어간다. 바는 `lg:`에서만 보이므로 예약도
			    그쪽만 한다. 실측 bounds가 그만큼 줄어 프리뷰가 바 위에 딱 맞는다. */}
			<div
				ref={stageRef}
				className="flex min-h-96 flex-1 items-center justify-center overflow-hidden lg:min-h-0 lg:pb-28"
			>
				<div
					ref={containerRef}
					className="h-full w-full shrink-0 overflow-hidden rounded-xl transition-transform duration-200 ease-out motion-reduce:transition-none lg:[transform:scale(var(--preview-scale))] [&>canvas]:block"
					style={{ '--preview-scale': previewSize / 100 } as CSSProperties}
				/>
			</div>
			<ControllerBar placement="canvas">
				<PreviewSizeControl value={previewSize} onChange={setPreviewSize} />
			</ControllerBar>
			{error && (
				<Typography role="alert" size="sm" className="pt-2 text-destructive">
					{error}
				</Typography>
			)}
		</figure>
	)
}
