'use client'

import p5 from 'p5'
import {
	createGraphicRasterArtifact,
	type GraphicRuntimeAdapter,
} from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import type { RasterArtifact } from '@/modules/studio-artifact/studio-artifact'
import { toControllerPadValue } from './definition'
import {
	createForwardStraightScene,
	type ForwardStraightInput,
	toForwardStraightInput,
} from './model'

const ORIGIN_DRAG_HIT_RADIUS = 12

export type ForwardStraightRuntime = {
	update(input: ForwardStraightInput): void
	resize(width: number, height: number): void
	getViewport(): { width: number; height: number }
	artifacts: { raster: RasterArtifact }
	destroy(): void
}

/**
 * Forward Straight의 브라우저 미리보기만 소유한다.
 * 좌표 계산은 runtime이, Controller 상태는 호출자가 소유한다.
 */
export function createForwardStraightRuntime({
	container,
	input,
	onInputChange,
}: {
	container: HTMLElement
	input: ForwardStraightInput
	onInputChange?: (input: ForwardStraightInput) => boolean
}): ForwardStraightRuntime {
	let currentInput = input
	let draggingOrigin = false
	let canvas: HTMLCanvasElement | null = null
	const initialSize = getCanvasSize(container.clientWidth, container.clientHeight)
	let viewport = initialSize
	const instance = new p5((preview) => {
		preview.setup = () => {
			canvas = preview.createCanvas(initialSize.width, initialSize.height)
				.elt as HTMLCanvasElement
			preview.pixelDensity(2)
			preview.strokeCap(preview.SQUARE)
			preview.noLoop()
		}

		preview.draw = () => {
			const scene = createForwardStraightScene(currentInput, {
				width: preview.width,
				height: preview.height,
			})

			preview.background(scene.backgroundColor)
			preview.stroke(scene.lineColor)
			preview.noFill()
			for (const dash of scene.dashes) {
				preview.strokeWeight(dash.weight)
				preview.line(dash.x1, dash.y1, dash.x2, dash.y2)
			}
		}

		preview.mousePressed = () => {
			const scene = createForwardStraightScene(currentInput, {
				width: preview.width,
				height: preview.height,
			})
			draggingOrigin = isOriginHandleHit(
				{ x: preview.mouseX, y: preview.mouseY },
				scene.origin,
			)
			if (draggingOrigin) return false
		}

		preview.mouseDragged = () => {
			if (!draggingOrigin) return
			if (
				preview.mouseX < 0 ||
				preview.mouseX > preview.width ||
				preview.mouseY < 0 ||
				preview.mouseY > preview.height
			) {
				return
			}
			const nextInput = {
				...currentInput,
				origin: {
					x: preview.mouseX / preview.width,
					y: preview.mouseY / preview.height,
				},
			}
			if (onInputChange?.(nextInput) === false) return false
			currentInput = nextInput
			preview.redraw()
			return false
		}

		preview.mouseReleased = () => {
			draggingOrigin = false
		}
	}, container)

	function render(width: number, height: number) {
		const size = getCanvasSize(width, height)
		instance.resizeCanvas(size.width, size.height)
		instance.redraw()
	}

	// 🔴 여기서 canvas를 요구하지 않는다 — p5가 `setup`을 `load`까지 미루면 아직 null이고,
	//    throw하면 Artifact가 등록되지 않아 내보내기·미리보기 갱신이 사라진다(간헐적).
	const raster = createGraphicRasterArtifact({
		canvas: () => canvas,
		getViewport: () => viewport,
		render,
	})

	return {
		update(nextInput) {
			currentInput = nextInput
			instance.redraw()
		},
		resize(width, height) {
			viewport = getCanvasSize(width, height)
			render(viewport.width, viewport.height)
		},
		getViewport() {
			return viewport
		},
		artifacts: { raster },
		destroy() {
			instance.remove()
		},
	}
}

/** 기준점은 그려지지 않으므로 히트 영역만 남는다 — 위치는 Position 패드가 보여준다. */
export function isOriginHandleHit(
	pointer: { x: number; y: number },
	origin: { x: number; y: number },
) {
	return Math.hypot(pointer.x - origin.x, pointer.y - origin.y) <= ORIGIN_DRAG_HIT_RADIUS
}

function getCanvasSize(width: number, height: number) {
	return {
		width: Math.max(1, Math.floor(width)),
		height: Math.max(1, Math.floor(height)),
	}
}

const runtime = {
	type: 'p5',
	async mount({ container, values, onChange }) {
		const mounted = createForwardStraightRuntime({
			container,
			input: toForwardStraightInput(values),
			onInputChange: (next) => onChange('origin', toControllerPadValue(next.origin)),
		})
		return {
			update: (next) => mounted.update(toForwardStraightInput(next)),
			resize: (width, height) => mounted.resize(width, height),
			getViewport: () => mounted.getViewport(),
			artifacts: mounted.artifacts,
			destroy: () => mounted.destroy(),
		}
	},
} satisfies GraphicRuntimeAdapter

export default runtime
