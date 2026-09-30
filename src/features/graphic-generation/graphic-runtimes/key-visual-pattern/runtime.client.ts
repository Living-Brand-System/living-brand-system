'use client'

import p5 from 'p5'
import { isOriginHandleHit } from '@/features/graphic-generation/graphic-runtimes/forward-straight/runtime.client'
import {
	createGraphicRasterArtifact,
	type GraphicRuntimeAdapter,
} from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import type { RasterArtifact } from '@/modules/studio-artifact/studio-artifact'
import { toControllerPadValue } from './definition'
import {
	createKeyVisualPatternScene,
	type KeyVisualPatternInput,
	toKeyVisualPatternInput,
} from './model'

export type KeyVisualPatternRuntime = {
	update(input: KeyVisualPatternInput): void
	resize(width: number, height: number): void
	getViewport(): { width: number; height: number }
	artifacts: { raster: RasterArtifact }
	destroy(): void
}

/**
 * Key Visual Pattern의 브라우저 미리보기만 소유한다.
 * 좌표 계산은 model이, Controller 상태는 호출자가 소유한다.
 *
 * 그래픽은 정적이라 애니메이션 루프가 없다 — noLoop으로 두고 입력이 바뀔 때만 redraw한다.
 */
export function createKeyVisualPatternRuntime({
	container,
	input,
	onInputChange,
}: {
	container: HTMLElement
	input: KeyVisualPatternInput
	onInputChange?: (input: KeyVisualPatternInput) => boolean
}): KeyVisualPatternRuntime {
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
			const scene = createKeyVisualPatternScene(currentInput, {
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
			// 🔴 히트 판정은 `scene.origin`이 아니라 **저장된 기준점**에 건다 — 이 런타임의
			//    scene.origin은 칸에 스냅된 좌표라 사용자가 손을 뗀 자리와 최대 반 칸 어긋나고,
			//    핸들이 그려지지 않으므로 어긋난 만큼은 다시 잡을 방법이 없다.
			draggingOrigin = isOriginHandleHit(
				{ x: preview.mouseX, y: preview.mouseY },
				{
					x: currentInput.origin.x * preview.width,
					y: currentInput.origin.y * preview.height,
				},
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

function getCanvasSize(width: number, height: number) {
	return {
		width: Math.max(1, Math.floor(width)),
		height: Math.max(1, Math.floor(height)),
	}
}

const runtime = {
	type: 'p5',
	async mount({ container, values, onChange }) {
		const mounted = createKeyVisualPatternRuntime({
			container,
			input: toKeyVisualPatternInput(values),
			onInputChange: (next) => onChange('origin', toControllerPadValue(next.origin)),
		})
		return {
			update: (next) => mounted.update(toKeyVisualPatternInput(next)),
			resize: (width, height) => mounted.resize(width, height),
			getViewport: () => mounted.getViewport(),
			artifacts: mounted.artifacts,
			destroy: () => mounted.destroy(),
		}
	},
} satisfies GraphicRuntimeAdapter

export default runtime
