import { z } from 'zod'
import type { GraphicModelAdapter } from '@/features/graphic-generation/runtime/graphic-plugin'
import type {
	VectorPrimitive,
	VectorSceneArtifact,
} from '@/modules/studio-artifact/studio-artifact'
import type {
	ControllerControlValue,
	ControllerValues,
	StudioControllerRestrictions,
} from '@/modules/studio-controller/controller-definition'
import {
	KEY_VISUAL_FORMATION_ANCHORS,
	KEY_VISUAL_FORMATION_COLOR_LEVELS,
	KEY_VISUAL_FORMATION_DEFAULT_INPUT,
	KEY_VISUAL_FORMATION_MIN_LINE_WEIGHT,
	KEY_VISUAL_FORMATION_REFERENCE_BASE,
	type KeyVisualFormationAnchorId,
	type KeyVisualFormationColorId,
	keyVisualFormationColorHex,
	keyVisualFormationColorLevel,
} from './definition'

export {
	KEY_VISUAL_FORMATION_DEFAULT_INPUT,
	KEY_VISUAL_FORMATION_REFERENCE_BASE,
} from './definition'

const colorIds = KEY_VISUAL_FORMATION_COLOR_LEVELS.map(
	(color) => color.key,
) as KeyVisualFormationColorId[]
const anchorIds = Object.keys(KEY_VISUAL_FORMATION_ANCHORS) as KeyVisualFormationAnchorId[]

export const keyVisualFormationInputSchema = z.strictObject({
	// 새 두 색 UI가 명시적으로 전달할 때만 사용한다. 기존 팔레트 입력은 그대로 유지한다.
	foregroundColor: z
		.string()
		.regex(/^#[0-9a-f]{6}$/i)
		.optional(),
	backgroundColor: z
		.string()
		.regex(/^#[0-9a-f]{6}$/i)
		.optional(),
	planeColor: z.enum(colorIds),
	lineColor: z.enum(colorIds),
	planeImage: z.string().min(1).nullable(),
	dimmer: z.boolean(),
	dimmerOpacity: z.number().min(0).max(0.7),
	anchor: z.enum(anchorIds),
	lineRatio: z.number().min(0.05).max(0.33),
	planeRatio: z.number().min(0).max(0.33),
	steps: z.number().int().min(6).max(20),
	decay: z.number().min(0.1).max(4),
})

export type KeyVisualFormationInput = z.infer<typeof keyVisualFormationInputSchema>

function resolveOption<Id extends string>(
	value: ControllerControlValue,
	allowed: readonly Id[],
	fallback: Id,
): Id {
	return typeof value === 'string' && (allowed as readonly string[]).includes(value)
		? (value as Id)
		: fallback
}

/** 면보다 밝은(단계가 낮은) 색만 — 선이 고를 수 있는 전부다. */
export function keyVisualFormationLineChoices(planeColor: string): KeyVisualFormationColorId[] {
	const planeLevel = keyVisualFormationColorLevel(planeColor)
	return KEY_VISUAL_FORMATION_COLOR_LEVELS.filter((_, level) => level < planeLevel).map(
		(color) => color.key,
	)
}

export function toKeyVisualFormationInput(values: ControllerValues): KeyVisualFormationInput {
	const base = KEY_VISUAL_FORMATION_DEFAULT_INPUT
	const planeColor = resolveOption(values.planeColor, colorIds, base.planeColor)
	const choices = keyVisualFormationLineChoices(planeColor)
	// 🔴 면을 더 밝게 바꾸면 들고 있던 선 색이 규칙 밖으로 나간다 — 남은 것 중 가장 짙은 쪽으로
	//    끌어내린다. 화면은 좁아진 선택지를 보여 주지만 값은 사용자가 다시 고르기 전까지 옛 것이다.
	const lineColor = resolveOption(
		values.lineColor,
		choices,
		choices[choices.length - 1] ?? base.lineColor,
	)
	return keyVisualFormationInputSchema.parse({
		...(values.foregroundColor !== undefined
			? { foregroundColor: values.foregroundColor }
			: {}),
		...(values.backgroundColor !== undefined
			? { backgroundColor: values.backgroundColor }
			: {}),
		planeColor,
		lineColor,
		planeImage:
			typeof values.planeImage === 'string' && values.planeImage ? values.planeImage : null,
		dimmer: typeof values.dimmer === 'boolean' ? values.dimmer : base.dimmer,
		dimmerOpacity: values.dimmerOpacity,
		anchor: resolveOption(values.anchor, anchorIds, base.anchor),
		lineRatio: values.lineRatio,
		planeRatio: values.planeRatio,
		steps: values.steps,
		decay: values.decay,
	})
}

export type KeyVisualFormationBand = {
	x: number
	y: number
	width: number
	height: number
}

export type KeyVisualFormationScene = {
	width: number
	height: number
	/** 면 — 판 전체다. 이미지가 있으면 그 위를 덮고, 디머는 다시 그 위를 덮는다. */
	planeColor: string
	planeImage: string | null
	dimmerOpacity: number
	lineColor: string
	/** 선의 영역 안의 선들. 판 배경(면 색) 위에 얹힌다. */
	bands: KeyVisualFormationBand[]
	/**
	 * 「선의 자리」 쪽 면 — **선 색으로 꽉 찬 사각형**이다. 선이 모여 만들어진 면이라 판 배경이
	 * 아니라 선과 같은 색을 쓴다. 비율이 0이면 없다.
	 */
	planeBand: KeyVisualFormationBand | null
	/** 선의 영역 양쪽에 남는 면의 길이 — [자리 쪽, 반대쪽]. 각각 0일 수 있다. */
	planeAreas: readonly [number, number]
}

/**
 * 선은 「선의 자리」 변에 붙어 반대쪽으로 차오른다.
 *
 * 🔑 실제 선언은 **unit(선 + 여백) 두께와 개수**다. 창작자에게는 그 둘 대신 면 비율과 단계를 묻고
 *    여기서 역산한다 — 미지수 둘에 식이 둘이라 정확히 풀린다.
 *
 *      선의 영역 = 선영역비율 × 판형
 *      unit      = 선의 영역 / 단계        (모든 unit의 두께는 같다)
 *
 * 🔴 각 unit 안에서 선은 **「선의 자리」 쪽 모서리에 붙어** 반대쪽으로 찬다. 반대로 붙이면 굵어지는
 *    방향이 면에서 번져 나가는 모양이 되고 판 끝이 빈다.
 *
 * 🔑 판은 **[면] [선의 영역] [면]** 세 토막이다. 앞의 둘을 비율로 받고 나머지가 반대쪽 면이다.
 *    두 비율의 상한이 각각 1/3이라 합이 2/3을 넘지 못하고, 그래서 반대쪽 면은 언제나 1/3 이상 —
 *    선의 영역보다 좁을 수 없다. **가이드라인의 1:1이 범위 자체로 지켜진다.**
 */
export function createKeyVisualFormationScene(
	input: KeyVisualFormationInput,
	viewport: { width: number; height: number },
): KeyVisualFormationScene {
	const anchor = KEY_VISUAL_FORMATION_ANCHORS[input.anchor]
	const vertical = anchor.axis === 'vertical'
	const axisLength = vertical ? viewport.height : viewport.width
	const crossLength = vertical ? viewport.width : viewport.height
	const lineArea = axisLength * input.lineRatio
	const unit = lineArea / input.steps
	const nearPlane = axisLength * input.planeRatio
	/**
	 * 🔴 최소 두께는 **양쪽 모두**에 걸린다. unit에서 칠하는 쪽이 선이고 남는 쪽이 면인데, 그 면도
	 *    눈에는 선으로 보인다 — 한쪽만 받치면 반대쪽이 머리카락처럼 남는다.
	 *    unit이 하한 두 몫보다 좁으면 반씩 나눈다.
	 */
	const minWeight = Math.min(
		unit / 2,
		KEY_VISUAL_FORMATION_MIN_LINE_WEIGHT *
			(Math.min(viewport.width, viewport.height) / KEY_VISUAL_FORMATION_REFERENCE_BASE),
	)
	// 「선의 자리」 변에서 잰 거리로 먼저 풀고, 판 좌표로는 마지막에 한 번만 옮긴다.
	const nearEdge = input.anchor === 'top' || input.anchor === 'left'
	const bands: KeyVisualFormationBand[] = []

	for (let index = 0; index < input.steps; index++) {
		// index 0이 자리에 붙은 unit이다. p가 1에서 시작해 1/steps까지 내려가므로 0으로 눌리지 않는다.
		const progress = (input.steps - index) / input.steps
		const size = clamp(unit * progress ** input.decay, minWeight, unit - minWeight)
		const distance = nearPlane + index * unit
		bands.push(toBand(vertical, nearEdge, axisLength, crossLength, distance, size))
	}

	return {
		width: viewport.width,
		height: viewport.height,
		planeBand:
			nearPlane > 0
				? toBand(vertical, nearEdge, axisLength, crossLength, 0, nearPlane)
				: null,
		planeColor: input.backgroundColor ?? keyVisualFormationColorHex(input.planeColor),
		planeImage: input.planeImage,
		dimmerOpacity: input.dimmer ? input.dimmerOpacity : 0,
		lineColor: input.foregroundColor ?? keyVisualFormationColorHex(input.lineColor),
		bands,
		planeAreas: [nearPlane, axisLength - nearPlane - lineArea],
	}
}

/** 「선의 자리」 변에서 잰 거리·두께를 판 좌표의 사각형으로 옮긴다 — 방향 뒤집기는 여기 한 곳뿐이다. */
function toBand(
	vertical: boolean,
	nearEdge: boolean,
	axisLength: number,
	crossLength: number,
	distance: number,
	size: number,
): KeyVisualFormationBand {
	const offset = nearEdge ? distance : axisLength - distance - size
	return vertical
		? { x: 0, y: offset, width: crossLength, height: size }
		: { x: offset, y: 0, width: size, height: crossLength }
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

export function createKeyVisualFormationVectorArtifact(
	scene: KeyVisualFormationScene,
): VectorSceneArtifact {
	const primitives: VectorPrimitive[] = []
	if (scene.planeImage) {
		// 면 이미지는 판을 덮는다 — 비율을 지키고 넘치는 쪽을 자른다(화면의 cover와 같게).
		primitives.push({
			kind: 'image',
			x: 0,
			y: 0,
			width: scene.width,
			height: scene.height,
			href: scene.planeImage,
			preserveAspectRatio: 'xMidYMid slice',
		})
	}
	if (scene.dimmerOpacity > 0) {
		primitives.push({
			kind: 'rect',
			x: 0,
			y: 0,
			width: scene.width,
			height: scene.height,
			fill: '#000000',
			opacity: scene.dimmerOpacity,
		})
	}
	// 자리 쪽 면과 선은 같은 색이다 — 선이 모여 그 면이 된 것이라 색이 갈리면 안 된다.
	for (const band of [...(scene.planeBand ? [scene.planeBand] : []), ...scene.bands]) {
		primitives.push({
			kind: 'rect',
			x: band.x,
			y: band.y,
			width: band.width,
			height: band.height,
			fill: scene.lineColor,
		})
	}

	return {
		kind: 'vector',
		source: {
			width: scene.width,
			height: scene.height,
			background: scene.planeColor,
			primitives,
		},
	}
}

const model = {
	createVectorArtifact: (values, viewport) =>
		createKeyVisualFormationVectorArtifact(
			createKeyVisualFormationScene(toKeyVisualFormationInput(values), viewport),
		),
	/** 면을 고르면 선 선택지가 그보다 밝은 색으로 좁아진다. */
	getRestrictions: (values): StudioControllerRestrictions => {
		const planeColor = resolveOption(
			values.planeColor,
			colorIds,
			KEY_VISUAL_FORMATION_DEFAULT_INPUT.planeColor,
		)
		const choices = keyVisualFormationLineChoices(planeColor)
		return {
			controls: [
				{
					controlId: 'lineColor',
					optionValues: choices,
					// 🔴 기본값도 함께 좁힌다 — 선택지만 줄이면 목록 밖으로 나간 기본값을 계약이 거부한다.
					//    남은 것 중 가장 짙은 쪽이 원래 기본값에 가장 가깝다.
					defaultValue: choices[choices.length - 1],
				},
			],
		}
	},
} satisfies GraphicModelAdapter

export default model
