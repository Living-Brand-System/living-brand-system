'use client'

import { type ReactNode, useEffect, useRef } from 'react'
import {
	type GraphicRuntimeId,
	graphicRuntimeManifests,
} from '@/features/graphic-generation/graphic-runtimes/catalog/manifest.generated'
import { graphicRuntimeCatalog } from '@/features/graphic-generation/graphic-runtimes/catalog/runtime.generated.client'
import type { GraphicRuntime } from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import { cn } from '@/lib/utils'
import {
	type ControllerControlValue,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'

type PageHeroProps = {
	/** 배경을 그릴 그래픽 런타임. 카탈로그의 어떤 런타임이든 기본값으로 재생한다. */
	runtimeId: GraphicRuntimeId
	/**
	 * 런타임 기본값 위에 덮을 컨트롤 값. 한 런타임이 여러 모양을 갖는 경우(Fluted Glass의
	 * 가로·세로·스윕·방사) 어느 모양으로 재생할지를 이것으로 고른다.
	 *
	 * 🔴 **모듈 상수로 넘긴다.** 렌더마다 새로 만든 객체를 넘기면 shader가 매 렌더 다시 마운트된다.
	 */
	values?: Readonly<Record<string, ControllerControlValue>>
	/** 정지 폴백 이미지. shader가 붙지 않는 경우(WebGL 불가, 모션 감소 설정)에 그대로 남는다. */
	fallbackSrc: string
	className?: string
	/** 배경 위 중앙에 앉는 락업(워드마크·CI 조합). */
	children?: ReactNode
}

/**
 * 페이지 상단 히어로 배너. 그래픽 런타임 shader가 배경을 그리고, 락업이 그 위에 앉는다.
 * 어드민 대시보드와 가이드라인 메인이 함께 쓴다.
 *
 * 정지 이미지를 배경에 먼저 깔아 두므로 shader 실패를 따로 분기하지 않는다 —
 * canvas가 없으면 그 이미지가 그대로 남는다.
 *
 * 수치는 px로 고정한다: Payload admin은 root가 13px이라 rem 유틸리티가 표면마다
 * 다르게 그려지므로, 두 표면이 공유하는 컴포넌트는 px만 동일하게 렌더된다.
 */
export function PageHero({
	runtimeId,
	values: overrides,
	fallbackSrc,
	className,
	children,
}: PageHeroProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const container = containerRef.current
		if (!container) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

		let runtime: GraphicRuntime | undefined
		let disposed = false

		const observer = new ResizeObserver(([entry]) => {
			if (!entry) return
			const { height, width } = entry.contentRect
			runtime?.resize(Math.round(width), Math.round(height))
		})

		// 런타임마다 필수 컨트롤 값이 다르므로 manifest 기본값을 통째로 넘긴다. 빈 객체는 검증에서 거부된다.
		const manifest = graphicRuntimeManifests.find(({ id }) => id === runtimeId)
		if (!manifest) return

		graphicRuntimeCatalog[runtimeId]()
			.then((adapter) =>
				adapter.mount({
					container,
					values: {
						...createControllerValues(manifest.controller.groups),
						...overrides,
					},
					onChange: () => false,
				}),
			)
			.then((mounted) => {
				if (disposed) {
					mounted.destroy()
					return
				}
				runtime = mounted
				observer.observe(container)
			})
			.catch((error) => {
				// 배경 이미지가 남으므로 화면은 깨지지 않는다. 원인만 남긴다.
				console.error('히어로 배너 shader를 띄우지 못했습니다.', error)
			})

		return () => {
			disposed = true
			observer.disconnect()
			runtime?.destroy()
		}
	}, [overrides, runtimeId])

	return (
		<div
			data-slot="page-hero"
			className={cn(
				'relative isolate overflow-hidden rounded-[24px] bg-cover bg-center',
				className,
			)}
			style={{ backgroundImage: `url(${fallbackSrc})` }}
		>
			<div className="absolute inset-0" ref={containerRef} />
			<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
				{children}
			</div>
		</div>
	)
}
