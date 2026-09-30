'use client'

import p5 from 'p5'
import {
	createGraphicRasterArtifact,
	type GraphicRuntimeAdapter,
} from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import type { RasterArtifact } from '@/modules/studio-artifact/studio-artifact'
import { toControllerPadPairValue } from './definition'
import { createKeyVisualLineScene, type KeyVisualLineInput, toKeyVisualLineInput } from './model'

const HANDLE_DRAG_HIT_RADIUS = 12

type HandleId = 'a' | 'b'

export type KeyVisualLineRuntime = {
	update(input: KeyVisualLineInput): void
	resize(width: number, height: number): void
	getViewport(): { width: number; height: number }
	artifacts: { raster: RasterArtifact }
	destroy(): void
}

/**
 * Key Visual 2D Line의 브라우저 미리보기만 소유한다.
 * 좌표 계산은 model이, Controller 상태는 호출자가 소유한다.
 */
export function createKeyVisualLineRuntime({
	container,
	input,
	onInputChange,
}: {
	container: HTMLElement
	input: KeyVisualLineInput
	onInputChange?: (input: KeyVisualLineInput) => boolean
}): KeyVisualLineRuntime {
	let currentInput = input
	let draggingHandle: HandleId | null = null
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
			const scene = createKeyVisualLineScene(currentInput, {
				width: preview.width,
				height: preview.height,
			})

			preview.background(scene.backgroundColor)
			preview.stroke(scene.lineColor)
			preview.noFill()
			for (const segment of scene.segments) {
				preview.strokeWeight(segment.weight)
				preview.line(segment.x1, segment.y1, segment.x2, segment.y2)
			}
		}

		preview.mousePressed = () => {
			const scene = createKeyVisualLineScene(currentInput, {
				width: preview.width,
				height: preview.height,
			})
			const pointer = { x: preview.mouseX, y: preview.mouseY }
			draggingHandle = isHandleHit(pointer, scene.startPoint)
				? 'a'
				: isHandleHit(pointer, scene.endPoint)
					? 'b'
					: null
			if (draggingHandle) return false
		}

		preview.mouseDragged = () => {
			if (!draggingHandle) return
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
				path: {
					...currentInput.path,
					[draggingHandle]: {
						x: preview.mouseX / preview.width,
						y: preview.mouseY / preview.height,
					},
				},
			}
			if (onInputChange?.(nextInput) === false) return false
			currentInput = nextInput
			preview.redraw()
			return false
		}

		preview.mouseReleased = () => {
			draggingHandle = null
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

/** 두 끝점은 그려지지 않으므로 히트 영역만 남는다 — 위치는 Position 패드가 보여준다. */
export function isHandleHit(pointer: { x: number; y: number }, handle: { x: number; y: number }) {
	return Math.hypot(pointer.x - handle.x, pointer.y - handle.y) <= HANDLE_DRAG_HIT_RADIUS
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
		const mounted = createKeyVisualLineRuntime({
			container,
			input: toKeyVisualLineInput(values),
			onInputChange: (next) => onChange('path', toControllerPadPairValue(next.path)),
		})
		return {
			update: (next) => mounted.update(toKeyVisualLineInput(next)),
			resize: (width, height) => mounted.resize(width, height),
			getViewport: () => mounted.getViewport(),
			artifacts: mounted.artifacts,
			destroy: () => mounted.destroy(),
		}
	},
} satisfies GraphicRuntimeAdapter

export default runtime
