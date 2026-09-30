import { z } from 'zod'
import type { GraphicModelAdapter } from '@/features/graphic-generation/runtime/graphic-plugin'
import type { VectorSceneArtifact } from '@/modules/studio-artifact/studio-artifact'
import {
	type ControllerControlValue,
	type ControllerPadValue,
	type ControllerRuntimeBindings,
	type ControllerValues,
	isControllerPadPairValue,
} from '@/modules/studio-controller/controller-definition'
import {
	KEY_VISUAL_LINE_COLORWAYS,
	KEY_VISUAL_LINE_DEFAULT_INPUT,
	KEY_VISUAL_LINE_REFERENCE_BASE,
	type KeyVisualLineColorwayId,
} from './definition'

export { KEY_VISUAL_LINE_DEFAULT_INPUT, KEY_VISUAL_LINE_REFERENCE_BASE } from './definition'

const colorwayIds = Object.keys(KEY_VISUAL_LINE_COLORWAYS) as KeyVisualLineColorwayId[]

const pointSchema = z.strictObject({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
})

export const keyVisualLineInputSchema = z.strictObject({
	colorway: z.enum(colorwayIds),
	lineCount: z.number().int().min(4).max(24),
	angleStart: z.number().min(0).max(180),
	angleSpread: z.number().min(-90).max(90),
	lengthStart: z.number().min(60).max(600),
	lengthEnd: z.number().min(4).max(600),
	weightThin: z.number().min(1).max(6),
	weightRatio: z.number().int().min(2).max(6),
	path: z.strictObject({ a: pointSchema, b: pointSchema }),
})

export type KeyVisualLineInput = z.infer<typeof keyVisualLineInputSchema>

function resolveOption<Id extends string>(
	value: ControllerControlValue,
	allowed: readonly Id[],
	fallback: Id,
): Id {
	return typeof value === 'string' && (allowed as readonly string[]).includes(value)
		? (value as Id)
		: fallback
}

function toPoint(value: ControllerPadValue) {
	return { x: (value.x + 1) / 2, y: (value.y + 1) / 2 }
}

function toPath(value: ControllerValues[string]) {
	if (!isControllerPadPairValue(value)) return KEY_VISUAL_LINE_DEFAULT_INPUT.path
	return { a: toPoint(value.a), b: toPoint(value.b) }
}

/** Controller primitive 값(-1~1)을 Key Visual 2D Line 입력(0~1)으로 바꾸고 검증한다. */
export function toKeyVisualLineInput(values: ControllerValues): KeyVisualLineInput {
	return keyVisualLineInputSchema.parse({
		colorway: resolveOption(
			values.colorway,
			colorwayIds,
			KEY_VISUAL_LINE_DEFAULT_INPUT.colorway,
		),
		lineCount: values.lineCount,
		angleStart: values.angleStart,
		angleSpread: values.angleSpread,
		lengthStart: values.lengthStart,
		lengthEnd: values.lengthEnd,
		weightThin: values.weightThin,
		weightRatio: values.weightRatio,
		path: toPath(values.path),
	})
}

export type KeyVisualLineSegment = {
	x1: number
	y1: number
	x2: number
	y2: number
	weight: number
}

export type KeyVisualLineScene = {
	width: number
	height: number
	backgroundColor: string
	lineColor: string
	startPoint: { x: number; y: number }
	endPoint: { x: number; y: number }
	segments: KeyVisualLineSegment[]
}

/**
 * 라인은 Start Line → End Line 경로 위에 균등 간격으로 놓인다.
 * 경로를 따라가며 세 값이 함께 변한다 — 두께는 두꺼움→얇음, 길이는 짧음→긺, 각도는 시작각→시작각+변화량.
 *
 * 🔑 중심이 이동하고 각도가 균일하게 돈다. 끝점은 그 결과라 원호를 그린다(실루엣이 볼록해진다) —
 *    의도된 모양이다.
 */
export function createKeyVisualLineScene(
	input: KeyVisualLineInput,
	viewport: { width: number; height: number },
): KeyVisualLineScene {
	const colorway = KEY_VISUAL_LINE_COLORWAYS[input.colorway]
	const scale = Math.min(viewport.width, viewport.height) / KEY_VISUAL_LINE_REFERENCE_BASE
	const startPoint = {
		x: input.path.a.x * viewport.width,
		y: input.path.a.y * viewport.height,
	}
	const endPoint = { x: input.path.b.x * viewport.width, y: input.path.b.y * viewport.height }
	const segments: KeyVisualLineSegment[] = []

	for (let index = 0; index < input.lineCount; index++) {
		const progress = input.lineCount > 1 ? index / (input.lineCount - 1) : 0
		const centerX = lerp(startPoint.x, endPoint.x, progress)
		const centerY = lerp(startPoint.y, endPoint.y, progress)
		const angle = toRadians(input.angleStart + input.angleSpread * progress)
		const length = lerp(input.lengthStart, input.lengthEnd, progress) * scale
		const halfX = (Math.cos(angle) * length) / 2
		const halfY = (Math.sin(angle) * length) / 2

		segments.push({
			x1: centerX - halfX,
			y1: centerY - halfY,
			x2: centerX + halfX,
			y2: centerY + halfY,
			// ponytail: 두께는 선마다 균일하다. 한 선 안에서 테이퍼가 필요해지면 line이 아니라 polygon으로.
			weight: lerp(input.weightThin * input.weightRatio, input.weightThin, progress) * scale,
		})
	}

	return {
		width: viewport.width,
		height: viewport.height,
		backgroundColor: colorway.background,
		lineColor: colorway.line,
		startPoint,
		endPoint,
		segments,
	}
}

function lerp(start: number, end: number, progress: number) {
	return start + (end - start) * progress
}

function toRadians(degrees: number) {
	return (degrees * Math.PI) / 180
}

export function createKeyVisualLineVectorArtifact(scene: KeyVisualLineScene): VectorSceneArtifact {
	return {
		kind: 'vector',
		source: {
			width: scene.width,
			height: scene.height,
			background: scene.backgroundColor,
			primitives: scene.segments.map((segment) => ({
				kind: 'line' as const,
				x1: segment.x1,
				y1: segment.y1,
				x2: segment.x2,
				y2: segment.y2,
				stroke: scene.lineColor,
				strokeWidth: segment.weight,
				lineCap: 'square' as const,
			})),
		},
	}
}

const model = {
	createVectorArtifact: (values, viewport) =>
		createKeyVisualLineVectorArtifact(
			createKeyVisualLineScene(toKeyVisualLineInput(values), viewport),
		),
	getBindings: (viewport): ControllerRuntimeBindings =>
		viewport.width > 0 && viewport.height > 0
			? { path: { padAspectRatio: viewport.width / viewport.height } }
			: {},
} satisfies GraphicModelAdapter

export default model
