'use client'

import p5 from 'p5'
import {
	createGraphicRasterArtifact,
	type GraphicRuntimeAdapter,
} from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import type { VectorPrimitive, VectorScene } from '@/modules/studio-artifact/studio-artifact'
import { createInfographicScene, type InfographicInput, toInfographicInput } from './model'

/**
 * 미리보기는 model이 만든 **같은 VectorScene**을 캔버스에 옮겨 그린다.
 * 🔑 기하를 두 번 쓰지 않는 것이 핵심이다 — 미리보기와 내보내기가 갈릴 자리가 없어진다.
 */
export function paintScene(context: CanvasRenderingContext2D, scene: VectorScene): void {
	context.clearRect(0, 0, scene.width, scene.height)
	if (scene.background) {
		context.fillStyle = scene.background
		context.fillRect(0, 0, scene.width, scene.height)
	}
	for (const primitive of scene.primitives) paintPrimitive(context, primitive)
}

function paintPrimitive(context: CanvasRenderingContext2D, primitive: VectorPrimitive): void {
	switch (primitive.kind) {
		case 'circle': {
			context.fillStyle = primitive.fill
			context.beginPath()
			context.arc(primitive.cx, primitive.cy, primitive.radius, 0, Math.PI * 2)
			context.fill()
			return
		}
		case 'rect': {
			if (!primitive.fill) return
			context.fillStyle = primitive.fill
			context.fillRect(primitive.x, primitive.y, primitive.width, primitive.height)
			return
		}
		case 'line': {
			context.strokeStyle = primitive.stroke
			context.lineWidth = primitive.strokeWidth
			// 🔴 다음 도형에 새지 않게 그린 뒤 되돌린다 — 캔버스 대시는 컨텍스트 상태다.
			context.setLineDash(primitive.dash ? [...primitive.dash] : [])
			context.beginPath()
			context.moveTo(primitive.x1, primitive.y1)
			context.lineTo(primitive.x2, primitive.y2)
			context.stroke()
			context.setLineDash([])
			return
		}
		case 'text': {
			context.fillStyle = primitive.fill
			context.font = `${primitive.fontWeight ?? 400} ${primitive.fontSize}px ${primitive.fontFamily}`
			context.textAlign = TEXT_ALIGN[primitive.textAnchor ?? 'start']
			context.textBaseline = 'alphabetic'
			context.fillText(primitive.text, primitive.x, primitive.y)
			return
		}
		case 'path': {
			const path = new Path2D(primitive.d)
			context.save()
			context.translate(primitive.x ?? 0, primitive.y ?? 0)
			if (primitive.scale) context.scale(primitive.scale, primitive.scale)
			// 선 차트는 fill 'none'으로 온다. SVG와 같은 규칙이라 여기서 예외를 만들지 않는다.
			if (primitive.fill && primitive.fill !== 'none') {
				context.fillStyle = primitive.fill
				context.fill(path, primitive.fillRule ?? 'nonzero')
			}
			if (primitive.stroke) {
				context.strokeStyle = primitive.stroke
				context.lineWidth = primitive.strokeWidth ?? 1
				context.lineJoin = 'round'
				context.stroke(path)
			}
			context.restore()
			return
		}
		default:
			// group·image는 이 runtime이 만들지 않는다.
			return
	}
}

const TEXT_ALIGN = { start: 'left', middle: 'center', end: 'right' } as const

export type InfographicRuntime = {
	update(input: InfographicInput): void
	resize(width: number, height: number): void
	getViewport(): { width: number; height: number }
	destroy(): void
}

function createInfographicRuntime({
	container,
	input,
}: {
	container: HTMLElement
	input: InfographicInput
}) {
	let currentInput = input
	let canvas: HTMLCanvasElement | null = null
	let viewport = getCanvasSize(container.clientWidth, container.clientHeight)
	const instance = new p5((preview) => {
		preview.setup = () => {
			canvas = preview.createCanvas(viewport.width, viewport.height).elt as HTMLCanvasElement
			preview.pixelDensity(2)
			preview.noLoop()
		}
		preview.draw = () => {
			paintScene(
				preview.drawingContext as CanvasRenderingContext2D,
				createInfographicScene(currentInput, viewport),
			)
		}
	}, container)

	/**
	 * 🔴 웹폰트가 늦게 오면 첫 렌더가 fallback 서체로 굳는다 — 캔버스는 CSS와 달리 스스로
	 *    다시 그리지 않는다. 지정 서체로 그려야 오남용 ②를 지키므로 도착하면 한 번 더 그린다.
	 */
	void document.fonts.ready.then(() => instance.redraw())

	const render = (width: number, height: number) => {
		viewport = { width, height }
		instance.resizeCanvas(width, height)
		instance.redraw()
	}

	return {
		update(next: InfographicInput) {
			currentInput = next
			instance.redraw()
		},
		resize(width: number, height: number) {
			const size = getCanvasSize(width, height)
			render(size.width, size.height)
		},
		getViewport: () => viewport,
		artifacts: {
			raster: createGraphicRasterArtifact({
				canvas: () => canvas,
				getViewport: () => viewport,
				render,
			}),
		},
		destroy() {
			instance.remove()
			canvas = null
		},
	}
}

function getCanvasSize(width: number, height: number) {
	return { width: Math.max(1, Math.floor(width)), height: Math.max(1, Math.floor(height)) }
}

const adapter: GraphicRuntimeAdapter = {
	type: 'p5',
	async mount({ container, values }) {
		const runtime = createInfographicRuntime({
			container,
			input: toInfographicInput(values),
		})
		return {
			...runtime,
			update: (next) => runtime.update(toInfographicInput(next)),
		}
	},
}

export default adapter
