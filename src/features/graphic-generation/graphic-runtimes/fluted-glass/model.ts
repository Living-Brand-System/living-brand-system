import { z } from 'zod'
import type { GraphicModelAdapter } from '@/features/graphic-generation/runtime/graphic-plugin'
import {
	type ControllerRuntimeBindings,
	type ControllerValues,
	createControllerValues,
	isControllerPadValue,
} from '@/modules/studio-controller/controller-definition'
import flutedGlassRuntimeManifest, {
	FLUTED_GLASS_SHAPE_FAMILIES,
	FLUTED_GLASS_SHAPE_INPUTS,
	FLUTED_GLASS_SHAPES,
	FLUTED_GLASS_STYLES,
	type FlutedGlassShape,
	type FlutedGlassStyleId,
} from './definition'

const hexColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i)
const unitPointSchema = z.strictObject({
	x: z.number().min(-1).max(1),
	y: z.number().min(-1).max(1),
})

/** 네 모양이 공유하는 축 — 어느 셰이더 원문에도 같은 이름의 uniform이 있다. */
const sharedFields = {
	source: unitPointSchema,
	sourceOffsetX: z.number().min(-2).max(2),
	sourceOffsetY: z.number().min(-2).max(2),
	zoom: z.number().min(0.5).max(3),
	tilt: z.number().min(-45).max(45),
	vignette: z.number().min(0).max(1),
	bloomColor: hexColorSchema,
	rayColor1: hexColorSchema,
	rayColor2: hexColorSchema,
	rayColor3: hexColorSchema,
	rayColor4: hexColorSchema,
	rayColor5: hexColorSchema,
	rayBackgroundColor: hexColorSchema,
	rayBloom: z.number().min(0).max(1),
	rayIntensity: z.number().min(0).max(1),
	rayDensity: z.number().min(0).max(1),
	raySpotty: z.number().min(0).max(1),
	rayMidSize: z.number().min(0).max(1),
	rayMidIntensity: z.number().min(0).max(1),
	speed: z.number().min(0).max(2),
	frameOffsetMs: z.number().min(0).max(1000),
	rayScale: z.number().min(0.1).max(2),
	rayRotation: z.number().min(-180).max(180),
	pulseIntensity: z.number().min(0).max(2),
	pulseSpeed: z.number().min(0).max(2),
	pulseDensity: z.number().min(0.1).max(4),
	pulseWidth: z.number().min(0.01).max(0.5),
	glassSize: z.number().min(0).max(1),
	glassAngle: z.number().min(-180).max(180),
	glassOriginOffset: unitPointSchema,
	glassOffset: z.number().min(-2).max(2),
	glassSpeed: z.number().min(-1).max(1),
	glassDrift: unitPointSchema,
	glassDriftSpeedX: z.number().min(0).max(2),
	glassDriftSpeedY: z.number().min(0).max(2),
	glassDistortion: z.number().min(0).max(1),
	glassEdgeSoftness: z.number().min(0).max(1),
	glassBlur: z.number().min(0).max(1),
	glassScattering: z.number().min(0).max(1),
	glassHighlights: z.number().min(0).max(1),
	glassShadows: z.number().min(0).max(1),
	distortionShape: z.enum(['cascade', 'flat', 'contour', 'lens']),
} as const

/** 가로·세로 셰이더의 입력 — 축 좌표로 광선을 색인하므로 감쇠·흐름·팔레트 위상이 자기 축을 갖는다. */
export const flutedGlassLinearInputSchema = z.strictObject({
	...sharedFields,
	axisFalloff: z.number().min(0).max(3),
	flowSpeed: z.number().min(0).max(1),
	paletteShift: z.number().min(0).max(4),
	paletteDrift: z.number().min(-1).max(1),
	ribCurve: z.number().min(0.2).max(3),
})

/**
 * 스윕·방사 셰이더의 입력 — 각도로 색인하므로 반경 감쇠·흐름을 따로 갖고, 광원 근처에서 유리를
 * 걷어낼 페이드 구간이 필요하다.
 *
 * `sweepSpeed`는 스윕에만 있는 uniform이지만 스키마는 방사와 공유한다 — 방사는 0으로 선언되어
 * 있고(광선 밭이 돌지 않는다) 그 프로그램에는 uniform이 없어 배선이 조용히 무시된다.
 */
export const flutedGlassRadialInputSchema = z.strictObject({
	...sharedFields,
	sweepSpeed: z.number().min(-1).max(1),
	radialFalloff: z.number().min(0).max(3),
	radialFlowSpeed: z.number().min(0).max(1),
	glassSourceFadeStart: z.number().min(0).max(0.34),
	glassSourceFadeEnd: z.number().min(0.34).max(1),
})

export type FlutedGlassLinearInput = z.infer<typeof flutedGlassLinearInputSchema>
export type FlutedGlassRadialInput = z.infer<typeof flutedGlassRadialInputSchema>

/** 어느 셰이더로 그릴지와 그 셰이더가 받는 입력을 함께 나른다 — 둘이 어긋나면 화면이 빈다. */
export type FlutedGlassInput =
	| { family: 'linear'; shape: FlutedGlassShape; input: FlutedGlassLinearInput }
	| { family: 'sweep' | 'radial'; shape: FlutedGlassShape; input: FlutedGlassRadialInput }

function isPoint(value: unknown): value is { x: number; y: number } {
	return typeof value === 'object' && value !== null && 'x' in value && 'y' in value
}

/**
 * 모양·스타일이 정하지 **않는** 축 — 창작자가 실제로 다루기를 기대하는 큰 축이다.
 *
 * 🔑 「색 조합」은 모양과 독립이다. 모양을 바꿔도 색이 따라오면 두 축이 하나로 묶여 버린다.
 *    광원 위치는 여기 없다 — 광선을 어느 좌표로 색인하는지가 모양마다 달라서, 모양의 기하에
 *    딸린 값이다(가로는 판 왼쪽 끝, 스윕은 판 안쪽).
 */
const INDEPENDENT_CONTROL_IDS: ReadonlySet<string> = new Set([
	'rayColor1',
	'rayColor2',
	'rayColor3',
	'rayColor4',
	'rayColor5',
	'rayBackgroundColor',
	'bloomColor',
	'speed',
])

/** 선언된 컨트롤의 기본값 — 「창작자가 이 축을 만졌는가」의 기준선이다. */
const CONTROL_DEFAULTS: ControllerValues = createControllerValues(
	flutedGlassRuntimeManifest.controller.groups,
)

function isSameControlValue(left: unknown, right: unknown) {
	if (isPoint(left) && isPoint(right)) return left.x === right.x && left.y === right.y
	return left === right
}

/** 저장된 값이 낡아도 화면은 뜬다 — 알 수 없는 모양이면 기본 모양으로 떨어진다. */
export function resolveFlutedGlassShape(value: unknown): FlutedGlassShape {
	return FLUTED_GLASS_SHAPES.includes(value as FlutedGlassShape)
		? (value as FlutedGlassShape)
		: 'sweep'
}

/** 모양이 스타일을 갖지 않으면(스윕·방사) 빈 덮어쓰기다 — 고르는 것 자체는 막지 않는다. */
function resolveFlutedGlassStyle(shape: FlutedGlassShape, value: unknown) {
	const styles = shape in FLUTED_GLASS_STYLES ? FLUTED_GLASS_STYLES[shape as 'linear'] : undefined
	if (!styles) return {}
	const id = typeof value === 'string' ? value : ''
	return id in styles ? styles[id as FlutedGlassStyleId] : styles.basic
}

/**
 * Controller 값을 셰이더 uniform 입력으로 검증한다.
 *
 * 🔑 순서는 **모양 기본값 → 스타일 → 컨트롤 값**이고, 컨트롤 값은 두 가지 조건에서만 이긴다:
 *
 * 1. **그 모양에 있는 축일 때**(`id in base`). 네 모양의 축 집합이 서로 다른데 컨트롤 선언은 그
 *    합집합이라, 이 걸러내기가 없으면 가로에 `sweepSpeed`가 섞여 strictObject가 입력을 거부한다.
 * 2. **창작자가 실제로 만졌을 때**(선언된 기본값과 다를 때). 🔴 이것이 없으면 스타일이 조용히
 *    죽는다 — 합치면서 컨트롤 선언이 합집합이 되어 스타일이 정하려는 값 13개가 이미 컨트롤
 *    기본값으로 채워져 있고, 컨트롤 값이 무조건 이기면 스타일을 골라도 아무것도 바뀌지 않는다.
 *    「우측 잔 축은 창작자가 실제로 다루리라 기대하지 않는다」가 이 규칙의 근거다.
 *    `INDEPENDENT_CONTROL_IDS`(색 조합·속도)는 모양의 값을 먼저 덮어 두므로 이 조건에 걸려도
 *    모양이 아니라 그 하나의 조합으로 떨어진다.
 */
export function toFlutedGlassInput(values: ControllerValues): FlutedGlassInput {
	const shape = resolveFlutedGlassShape(values.shape)
	const base: Record<string, unknown> = {
		...FLUTED_GLASS_SHAPE_INPUTS[shape],
		...resolveFlutedGlassStyle(shape, values.preset),
	}
	// 모양과 독립인 축은 모양의 기본값을 덮는다 — 네 모양이 「색 조합」 하나를 공유한다는 뜻이다.
	for (const id of INDEPENDENT_CONTROL_IDS) {
		if (id in base) base[id] = CONTROL_DEFAULTS[id]
	}
	for (const [id, value] of Object.entries(values)) {
		// null은 컨트롤의 reset이다 — base가 정한 값을 그대로 남긴다.
		if (value === undefined || value === null || !(id in base)) continue
		// 만지지 않은 축은 모양과 스타일이 정한 값을 그대로 둔다.
		if (isSameControlValue(value, CONTROL_DEFAULTS[id])) continue
		// pad 자리에는 점만 들어간다 — 아니면 base가 정한 값을 그대로 남긴다.
		if (isPoint(base[id])) {
			if (isControllerPadValue(value)) base[id] = value
			continue
		}
		base[id] = value
	}

	const family = FLUTED_GLASS_SHAPE_FAMILIES[shape]
	return family === 'linear'
		? { family, shape, input: flutedGlassLinearInputSchema.parse(base) }
		: { family, shape, input: flutedGlassRadialInputSchema.parse(base) }
}

export function flutedGlassColorToRgb(color: string): readonly [number, number, number] {
	const value = hexColorSchema.parse(color).slice(1)
	return [0, 2, 4].map(
		(offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255,
	) as [number, number, number]
}

/** 화면 좌표(아래가 +Y)를 WebGL 좌표(위가 +Y)로 바꾼다. */
export function toFlutedGlassShaderPoint(
	point: { x: number; y: number },
	offset: { x: number; y: number } = { x: 0, y: 0 },
): readonly [number, number] {
	return [point.x + offset.x, -(point.y + offset.y)]
}

const DISTORTION_SHAPE_UNIFORMS: Record<FlutedGlassLinearInput['distortionShape'], number> = {
	cascade: 0,
	flat: 1,
	contour: 2,
	lens: 3,
}

export function flutedGlassDistortionShapeToUniform(
	shape: FlutedGlassLinearInput['distortionShape'],
) {
	return DISTORTION_SHAPE_UNIFORMS[shape]
}

const flutedGlassModel = {
	getBindings: (viewport: { width: number; height: number }): ControllerRuntimeBindings =>
		viewport.width > 0 && viewport.height > 0
			? Object.fromEntries(
					['source', 'glassOriginOffset', 'glassDrift'].map((id) => [
						id,
						{ padAspectRatio: viewport.width / viewport.height },
					]),
				)
			: {},
} satisfies GraphicModelAdapter

export default flutedGlassModel
