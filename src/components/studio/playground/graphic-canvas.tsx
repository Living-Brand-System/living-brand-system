'use client'

import { useEffect, useRef, useState } from 'react'
import { fitPreviewSize } from '@/components/studio/shared/fit-preview-size'
import type { GraphicRuntimeManifest } from '@/features/graphic-generation/domain/graphic-studio-config'
import type { GraphicRuntimeId } from '@/features/graphic-generation/graphic-runtimes/catalog/manifest.generated'
import { graphicRuntimeCatalog } from '@/features/graphic-generation/graphic-runtimes/catalog/runtime.generated.client'
import type { GraphicRuntime } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import {
	type ControllerControlValue,
	type ControllerValues,
	controllerRemountKey,
} from '@/modules/studio-controller/controller-definition'

/** 공용 런타임 카탈로그를 사용하고 모듈·remount 축이 바뀔 때만 교체한다. */
export function PlaygroundGraphicCanvas({
	manifest,
	onChange,
	values,
	width,
	height,
}: {
	manifest: GraphicRuntimeManifest & { id: GraphicRuntimeId }
	onChange?: (id: string, value: ControllerControlValue) => void
	values: ControllerValues
	width: number
	height: number
}) {
	return (
		<GraphicSurface
			key={`${manifest.id}:${controllerRemountKey(manifest.controller.remountOn, values)}`}
			manifest={manifest}
			onChange={onChange}
			values={values}
			width={width}
			height={height}
		/>
	)
}

function GraphicSurface({
	manifest,
	onChange,
	values,
	width,
	height,
}: {
	manifest: GraphicRuntimeManifest & { id: GraphicRuntimeId }
	onChange?: (id: string, value: ControllerControlValue) => void
	values: ControllerValues
	width: number
	height: number
}) {
	const stageRef = useRef<HTMLDivElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const runtimeRef = useRef<GraphicRuntime | null>(null)
	const valuesRef = useRef(values)
	const onChangeRef = useRef(onChange)
	const [error, setError] = useState(false)

	useEffect(() => {
		onChangeRef.current = onChange
	}, [onChange])

	useEffect(() => {
		valuesRef.current = values
		runtimeRef.current?.update(values)
	}, [values])

	useEffect(() => {
		let disposed = false
		async function mount() {
			try {
				const adapter = await graphicRuntimeCatalog[manifest.id]()
				if (disposed || !containerRef.current) return
				const runtime = await adapter.mount({
					container: containerRef.current,
					values: valuesRef.current,
					onChange: (id, value) => {
						if (!onChangeRef.current) return false
						onChangeRef.current(id, value)
						return true
					},
				})
				if (disposed) {
					runtime.destroy()
					return
				}
				runtimeRef.current = runtime
				const container = containerRef.current
				if (container?.clientWidth && container.clientHeight) {
					runtime.resize(container.clientWidth, container.clientHeight)
				}
				runtime.update(valuesRef.current)
			} catch {
				if (!disposed) setError(true)
			}
		}
		void mount()
		return () => {
			disposed = true
			runtimeRef.current?.destroy()
			runtimeRef.current = null
		}
	}, [manifest.id])

	useEffect(() => {
		const stage = stageRef.current
		const container = containerRef.current
		if (!stage || !container) return
		const resize = () => {
			if (!stage.clientWidth || !stage.clientHeight) return
			const size = fitPreviewSize(
				{ width: stage.clientWidth, height: stage.clientHeight },
				{ width, height },
			)
			container.style.width = `${size.width}px`
			container.style.height = `${size.height}px`
			runtimeRef.current?.resize(size.width, size.height)
		}
		const observer = new ResizeObserver(resize)
		observer.observe(stage)
		resize()
		return () => observer.disconnect()
	}, [width, height])

	return (
		<div
			ref={stageRef}
			data-slot="playground-graphic"
			data-runtime={manifest.id}
			className="relative grid h-full min-h-64 w-full place-items-center"
		>
			<div ref={containerRef} className="overflow-hidden rounded-xl" />
			{error && (
				<p
					role="alert"
					className="absolute rounded-lg bg-background p-4 text-destructive text-sm"
				>
					{manifest.name} 미리보기를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
				</p>
			)}
		</div>
	)
}
