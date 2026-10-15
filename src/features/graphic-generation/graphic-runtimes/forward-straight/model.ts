import { z } from 'zod'
import type { GraphicModelAdapter } from '@/features/graphic-generation/runtime/graphic-plugin'
import { HEX_COLOR_PATTERN } from '@/lib/color'
import type { VectorSceneArtifact } from '@/modules/studio-artifact/studio-artifact'
import {
	type ControllerRuntimeBindings,
	type ControllerValues,
	isControllerPadValue,
} from '@/modules/studio-controller/controller-definition'
import { FORWARD_STRAIGHT_DEFAULT_INPUT, FORWARD_STRAIGHT_REFERENCE_BASE } from './definition'

export { FORWARD_STRAIGHT_DEFAULT_INPUT, FORWARD_STRAIGHT_REFERENCE_BASE } from './definition'

const hexColorSchema = z.string().regex(HEX_COLOR_PATTERN)

export const forwardStraightInputSchema = z.strictObject({
	backgroundColor: hexColorSchema,
	lineColor: hexColorSchema,
	lineLength: z.number().min(2).max(200),
	columnGap: z.number().min(8).max(200),
	rowGap: z.number().min(8).max(200),
	margin: z.number().min(0).max(200),
	weightNear: z.number().min(0.1).max(20),
	weightFar: z.number().min(0.1).max(20),
	weightFalloff: z.number().min(100).max(3000),
	perspectiveGamma: z.number().min(1).max(6),
	depthScaleMin: z.number().min(0.05).max(1),
	origin: z.strictObject({
		x: z.number().min(0).max(1),
		y: z.number().min(0).max(1),
	}),
})

export type ForwardStraightInput = z.infer<typeof forwardStraightInputSchema>

/** Controller primitive 값(-1~1)을 Forward Straight 입력(0~1)으로 바꾸고 검증한다. */
export function toForwardStraightInput(values: ControllerValues): ForwardStraightInput {
	const origin = values.origin
	return forwardStraightInputSchema.parse({
		backgroundColor: values.backgroundColor ?? FORWARD_STRAIGHT_DEFAULT_INPUT.backgroundColor,
		lineColor: values.lineColor ?? FORWARD_STRAIGHT_DEFAULT_INPUT.lineColor,
		lineLength: values.lineLength,
		columnGap: values.columnGap,
		rowGap: values.rowGap,
		margin: values.margin,
		weightNear: values.weightNear,
		weightFar: values.weightFar,
		weightFalloff: values.weightFalloff,
		perspectiveGamma: values.perspectiveGamma,
		depthScaleMin: values.depthScaleMin,
		origin: isControllerPadValue(origin)
			? { x: (origin.x + 1) / 2, y: (origin.y + 1) / 2 }
			: origin,
	})
}

type Point = {
	x: number
	y: number
}

/** 기준 px control을 현재 캔버스 px로 환산한 값 — 미리보기와 export의 구도를 같게 만드는 유일한 지점. */
type ForwardStraightMetrics = {
	scale: number
	columnGap: number
	rowGap: number
	margin: number
}

export type ForwardStraightDash = {
	x1: number
	y1: number
	x2: number
	y2: number
	weight: number
}

export type ForwardStraightScene = {
	width: number
	height: number
	backgroundColor: string
	lineColor: string
	origin: Point
	dashes: ForwardStraightDash[]
}

export function createForwardStraightScene(
	input: ForwardStraightInput,
	viewport: { width: number; height: number },
): ForwardStraightScene {
	const scale = Math.min(viewport.width, viewport.height) / FORWARD_STRAIGHT_REFERENCE_BASE
	const metrics: ForwardStraightMetrics = {
		scale,
		columnGap: input.columnGap * scale,
		rowGap: input.rowGap * scale,
		margin: input.margin * scale,
	}
	const origin = {
		x: input.origin.x * viewport.width,
		y: input.origin.y * viewport.height,
	}
	const columns = getAxisCount(viewport.width, metrics.margin, metrics.columnGap)
	const rows = getAxisCount(viewport.height, metrics.margin, metrics.rowGap)
	const dashes: ForwardStraightDash[] = []

	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const position = getGridPosition(
				input,
				viewport,
				origin,
				metrics,
				rows,
				columns,
				row,
				column,
			)
			const angle = Math.atan2(origin.y - position.y, origin.x - position.x)
			const length = input.lineLength * metrics.scale * position.depthScale
			const halfX = Math.cos(angle) * length * 0.5
			const halfY = Math.sin(angle) * length * 0.5

			dashes.push({
				x1: position.x + halfX,
				y1: position.y + halfY,
				x2: position.x - halfX,
				y2: position.y - halfY,
				weight: getLineWeight(input, position, origin, metrics) * position.depthScale,
			})
		}
	}

	return {
		width: viewport.width,
		height: viewport.height,
		backgroundColor: input.backgroundColor,
		lineColor: input.lineColor,
		origin,
		dashes,
	}
}

function getAxisCount(length: number, margin: number, gap: number) {
	if (gap <= 0) return 0
	return Math.max(0, Math.floor((length - margin * 2) / gap) + 1)
}

function getGridPosition(
	input: ForwardStraightInput,
	viewport: { width: number; height: number },
	origin: Point,
	metrics: ForwardStraightMetrics,
	rows: number,
	columns: number,
	row: number,
	column: number,
) {
	const flatX = metrics.margin + column * metrics.columnGap
	const flatY = metrics.margin + row * metrics.rowGap
	const dx = origin.x - viewport.width / 2
	const dy = origin.y - viewport.height / 2
	const tiltAngle = Math.atan2(dy, dx)
	const rowWeight = Math.abs(Math.sin(tiltAngle))
	const columnWeight = Math.abs(Math.cos(tiltAngle))
	const rawRow = rows > 1 ? row / (rows - 1) : 0
	const rawColumn = columns > 1 ? column / (columns - 1) : 0
	const rowNearBottom = dy >= 0
	const columnNearRight = dx >= 0
	const rowNearness = rowNearBottom ? rawRow : 1 - rawRow
	const columnNearness = columnNearRight ? rawColumn : 1 - rawColumn
	const gamma = input.perspectiveGamma
	const rowDepth = rowNearness ** gamma
	const columnDepth = columnNearness ** gamma
	const rowSpatial = rowNearBottom ? rawRow ** gamma : 1 - (1 - rawRow) ** gamma
	const columnSpatial = columnNearRight ? rawColumn ** gamma : 1 - (1 - rawColumn) ** gamma
	const minX = metrics.margin
	const maxX = metrics.margin + (columns - 1) * metrics.columnGap
	const minY = metrics.margin
	const maxY = metrics.margin + (rows - 1) * metrics.rowGap
	const totalWeight = rowWeight + columnWeight
	const normalizedRowWeight = totalWeight > 0 ? rowWeight / totalWeight : 0.5
	const normalizedColumnWeight = totalWeight > 0 ? columnWeight / totalWeight : 0.5
	const depth = normalizedRowWeight * rowDepth + normalizedColumnWeight * columnDepth

	return {
		x: lerp(flatX, lerp(minX, maxX, columnSpatial), columnWeight),
		y: lerp(flatY, lerp(minY, maxY, rowSpatial), rowWeight),
		depthScale: lerp(input.depthScaleMin, 1, depth),
	}
}

function getLineWeight(
	input: ForwardStraightInput,
	position: Point,
	origin: Point,
	metrics: ForwardStraightMetrics,
) {
	const distance = Math.hypot(origin.x - position.x, origin.y - position.y)
	const progress = Math.min(1, distance / (input.weightFalloff * metrics.scale))
	const eased = progress * progress * (3 - 2 * progress)
	return lerp(input.weightNear, input.weightFar, eased) * metrics.scale
}

function lerp(start: number, end: number, progress: number) {
	return start + (end - start) * progress
}

export function createForwardStraightVectorArtifact(
	scene: ForwardStraightScene,
): VectorSceneArtifact {
	return {
		kind: 'vector',
		source: {
			width: scene.width,
			height: scene.height,
			background: scene.backgroundColor,
			primitives: scene.dashes.map((dash) => ({
				kind: 'line' as const,
				x1: dash.x1,
				y1: dash.y1,
				x2: dash.x2,
				y2: dash.y2,
				stroke: scene.lineColor,
				strokeWidth: dash.weight,
				lineCap: 'square' as const,
			})),
		},
	}
}

const model = {
	createVectorArtifact: (values, viewport) =>
		createForwardStraightVectorArtifact(
			createForwardStraightScene(toForwardStraightInput(values), viewport),
		),
	getBindings: (viewport): ControllerRuntimeBindings =>
		viewport.width > 0 && viewport.height > 0
			? { origin: { padAspectRatio: viewport.width / viewport.height } }
			: {},
} satisfies GraphicModelAdapter

export default model
