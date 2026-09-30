import {
	type GraphicStudioConfig,
	parseGraphicStudioConfig,
} from '@/features/graphic-generation/domain/graphic-studio-config'
import {
	IMAGE_ASPECT_RATIOS,
	IMAGE_OUTPUT_SIZES,
	type ImageAspectRatio,
	type ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import {
	getImageStudioControls,
	type ImageStudioConfig,
	parseImageStudioConfig,
} from '@/features/image-generation/domain/image-studio-config'
import { isPrintPpi, type PrintPpi } from '@/features/studio-export/print-policy'
import {
	DEFAULT_RASTER_VIDEO_CAPABILITY,
	parseStudioOutputCapability,
	projectStudioOutputPolicy,
	resolveMaxExportScale,
	resolveStudioArtifactOutputFormats,
	resolveStudioOutputCapability,
	type StudioOutputCapability,
} from '@/features/studio-export/studio-output'
import {
	collectTemplateImageSlots,
	collectTemplateSlots,
	collectTemplateVectorSlots,
	type ResolvedTemplateLayerPolicy,
} from '@/features/template-core/domain/collect-template-slots'
import { IMAGE_EDIT_TRANSFORM_LIMITS } from '@/lib/template-image-transform'
import type {
	ControllerControlDefinition,
	ControllerGroupDefinition,
	StudioControllerConfig,
	StudioPreviewImage,
	StudioRuntimeManifest,
} from '@/modules/studio-controller/controller-definition'
import {
	parseStudioControllerConfig,
	resolveControllerPresentation,
} from '@/modules/studio-controller/controller-definition'
import type { TemplateNodeConfig } from '@/types/template'

const BACKGROUND_TYPE_CONTROL_ID = 'background.type'
const BACKGROUND_COLOR_CONTROL_ID = 'background.color'
const BACKGROUND_DIMMER_CONTROL_ID = 'background.dimmer'
const BACKGROUND_DIMMER_OPACITY_CONTROL_ID = 'background.dimmerOpacity'
const TEXT_COLOR_CONTROL_ID = 'text.color'

const BACKGROUND_TYPE_OPTIONS: readonly { value: TemplateBackgroundType; label: string }[] = [
	{ value: 'color', label: 'Color' },
	{ value: 'image', label: 'Image' },
	{ value: 'graphic', label: 'Graphic' },
]

type TemplateSlotBindingBase = {
	/** DOM 합성 주소. Label과 분리되어 Admin에서 이름을 바꿔도 binding은 유지된다. */
	id: string
	layer: string
	label: string
}

type TemplateEditableSlotBase = TemplateSlotBindingBase & ResolvedTemplateLayerPolicy

type TextControlDefinition = Extract<ControllerControlDefinition, { kind: 'text' }>
type SelectControlDefinition = Extract<ControllerControlDefinition, { kind: 'select' }>

export type TemplateTextSlot = TemplateEditableSlotBase & {
	kind: 'text'
	/** 공통 controller.groups에 있는 text Definition의 stable id. */
	controlId: string
	/** HTML input 동작과 줄 수는 아직 공통 text primitive가 표현하지 못하는 DOM binding 제약이다. */
	input: {
		format: 'free' | 'number' | 'email' | 'date'
		maxLines?: number
	}
}

export type TransformLimits = typeof IMAGE_EDIT_TRANSFORM_LIMITS

export type TemplateImageConfigSlot = TemplateEditableSlotBase & {
	kind: 'image'
	/** 대상 슬롯 기하 — 생성 비율과 transform px 환산의 단일 원천. */
	box: { width?: number; height?: number }
	/** ImageStudioConfig를 복제하지 않고 참조하는 Template 정책. */
	imageConfig:
		| { mode: 'pinned'; configId: number }
		| { mode: 'selectable'; allowedConfigIds?: readonly number[] }
	/** Image feature capability가 있을 때만 적용하는 Template 값 override. */
	featureOverrides?: {
		colorAdjustment?: { line: string; background?: string }
	}
	transform: { enabled: boolean; limits: TransformLimits }
}

export type TemplateVectorSlot = TemplateEditableSlotBase & {
	kind: 'vector'
	color?: string
}

export type TemplateBackgroundSlot = TemplateSlotBindingBase & {
	kind: 'background'
	/** 공통 controller.groups에 있는 background type Definition의 stable id. */
	typeControlId: typeof BACKGROUND_TYPE_CONTROL_ID
	colorControlId: typeof BACKGROUND_COLOR_CONTROL_ID
	/** 배경 위 디머의 on/off와 강도 — 형식과 무관하게 항상 있다. */
	dimmerControlId: typeof BACKGROUND_DIMMER_CONTROL_ID
	dimmerOpacityControlId: typeof BACKGROUND_DIMMER_OPACITY_CONTROL_ID
	imageConfig: { mode: 'selectable'; allowedConfigIds?: readonly number[] }
}

export type TemplateEditableLayer = TemplateTextSlot | TemplateImageConfigSlot | TemplateVectorSlot

export type TemplateStudioConfigSlot = TemplateEditableLayer | TemplateBackgroundSlot

export type TemplateBackgroundType = 'color' | 'image' | 'graphic'

/** Admin이 정하는 배경 정책. 목록이 없으면 전부 허용이다 — exportPolicy와 같은 규칙. */
export type TemplateBackgroundPolicy = {
	types?: readonly TemplateBackgroundType[]
	imageConfigIds?: readonly number[]
	graphicConfigIds?: readonly string[]
	/** 배경 위 디머 허용 — 다른 키처럼 미지정은 허용이다(기존 저장분 호환). false만 금지다. */
	dimmer?: boolean
}

/** Template Studio SSR에 노출하는 node config 부분집합. */
export type PublishedTemplateNodeConfig = {
	input?: Omit<NonNullable<TemplateNodeConfig['input']>, 'aiInstruction'>
	imageInput?: TemplateNodeConfig['imageInput']
	imageColorize?: TemplateNodeConfig['imageColorize']
	creator?: TemplateNodeConfig['creator']
	vectorColor?: TemplateNodeConfig['vectorColor']
}

/** Published Template을 Template Studio Config와 세션이 소비하는 read model로 투영한 계약. */
export type PublishedHtmlTemplate = {
	kind: 'html'
	id: number
	name: string
	html: string
	nodeConfigs: Record<string, PublishedTemplateNodeConfig>
	width: number
	height: number
	/** 판형 선언 — 이 px를 몇 ppi로 그렸는가. 없으면 디지털판이라 물리 크기가 없다. */
	canvasPpi?: PrintPpi
	templateVersion: string
	exportPolicy?: unknown
	backgroundPolicy?: TemplateBackgroundPolicy
	previewImage?: StudioPreviewImage
}

/**
 * 클라이언트(Provider·Canvas)로 건너가는 published 템플릿 뷰.
 * Admin 정책(exportPolicy·backgroundPolicy)은 derive 입력일 뿐이므로 타입에서 제외해
 * RSC payload로 직렬화될 수 없게 한다.
 */
export type PublishedTemplateView = Pick<
	PublishedHtmlTemplate,
	'id' | 'name' | 'html' | 'width' | 'height'
>

/**
 * Template의 controller.groups에는 Template 전역에서 id가 유일한 Definition만 둔다.
 * ImageStudioConfig의 prompt/ratio처럼 슬롯마다 id가 반복되는 Definition은 각 슬롯 scope에서
 * 원본 Config를 직접 소비한다. 전역 id를 만들기 위한 prefix DSL이나 Definition 복제는 하지 않는다.
 */
export type TemplateStudioConfig = StudioControllerConfig<'template', number> & {
	output: StudioOutputCapability
	template: {
		slots: readonly TemplateStudioConfigSlot[]
		textColorControlId?: typeof TEXT_COLOR_CONTROL_ID
		imageConfigs: readonly ImageStudioConfig[]
		graphicConfigs: readonly GraphicStudioConfig[]
		exportOption: {
			canvas: { width: number; height: number }
			/** 판형이 선언된 템플릿의 인쇄 해상도. 있으면 창작자가 크기도 해상도도 고르지 않는다. */
			canvasPpi?: PrintPpi
			/** 캔버스 좌표계 대비 허용 최대 출력 배율. MP4 인코딩 한도에서 되짚어 구한다. */
			maxScale: number
		}
	}
}

/** unknown 입력을 공통 Controller와 Template slot/reference/export descriptor까지 검증한다. */
export function parseTemplateStudioConfig(input: unknown): TemplateStudioConfig {
	const common = parseStudioControllerConfig(input)
	const root = templateRecord(input, 'TemplateStudioConfig')
	parseStudioOutputCapability(root.output)
	assertTemplateKeys(root, [
		'studio',
		'id',
		'version',
		'name',
		'artifacts',
		'output',
		'controller',
		'controllerPresentation',
		'previewImage',
		'template',
	])
	if (common.studio !== 'template')
		throw new Error('TemplateStudioConfig studio: template이어야 합니다.')
	if (typeof common.id !== 'number' || !Number.isInteger(common.id)) {
		throw new Error('TemplateStudioConfig id: 정수여야 합니다.')
	}
	const template = templateRecord(root.template, 'TemplateStudioConfig.template')
	assertTemplateKeys(template, [
		'slots',
		'textColorControlId',
		'imageConfigs',
		'graphicConfigs',
		'exportOption',
	])
	if (!Array.isArray(template.slots))
		throw new Error('TemplateStudioConfig slots는 배열이어야 합니다.')
	if (!Array.isArray(template.imageConfigs) || !Array.isArray(template.graphicConfigs)) {
		throw new Error('TemplateStudioConfig 참조 Config는 배열이어야 합니다.')
	}
	if (template.textColorControlId !== undefined) {
		assertTemplateString(template.textColorControlId, 'textColorControlId')
	}
	const imageConfigIds = new Set<number>()
	for (const config of template.imageConfigs) {
		const parsed = parseImageStudioConfig(config)
		if (imageConfigIds.has(parsed.id))
			throw new Error(`TemplateStudioConfig Image Config id가 중복되었습니다: ${parsed.id}`)
		imageConfigIds.add(parsed.id)
	}
	const graphicConfigIds = new Set<string>()
	for (const config of template.graphicConfigs) {
		const parsed = parseGraphicStudioConfig(config)
		if (graphicConfigIds.has(parsed.id))
			throw new Error(`TemplateStudioConfig Graphic Config id가 중복되었습니다: ${parsed.id}`)
		graphicConfigIds.add(parsed.id)
	}

	const slotIds = new Set<string>()
	for (const value of template.slots) {
		const slot = templateRecord(value, 'TemplateStudioConfig slot')
		for (const key of ['id', 'layer', 'label']) assertTemplateString(slot[key], `slot.${key}`)
		if (slotIds.has(slot.id as string))
			throw new Error(`TemplateStudioConfig slot id가 중복되었습니다: ${slot.id}`)
		slotIds.add(slot.id as string)
		if (slot.kind !== 'background') assertTemplateLayerPolicy(slot)
		switch (slot.kind) {
			case 'text': {
				assertTemplateKeys(slot, [
					'id',
					'layer',
					'label',
					'kind',
					'access',
					'visibility',
					'controlId',
					'input',
				])
				assertTemplateString(slot.controlId, 'slot.controlId')
				const textInput = templateRecord(slot.input, 'Template text input')
				assertTemplateKeys(textInput, ['format', 'maxLines'])
				if (!['free', 'number', 'email', 'date'].includes(textInput.format as string)) {
					throw new Error('Template text input format이 올바르지 않습니다.')
				}
				if (textInput.maxLines !== undefined)
					assertPositiveInteger(textInput.maxLines, 'maxLines')
				break
			}
			case 'image': {
				assertTemplateKeys(slot, [
					'id',
					'layer',
					'label',
					'kind',
					'access',
					'visibility',
					'box',
					'imageConfig',
					'featureOverrides',
					'transform',
				])
				assertTemplateBox(slot.box)
				assertTemplateImagePolicy(slot.imageConfig)
				if (slot.featureOverrides !== undefined) {
					assertTemplateFeatureOverrides(slot.featureOverrides)
				}
				const transform = templateRecord(slot.transform, 'Template transform')
				assertTemplateKeys(transform, ['enabled', 'limits'])
				if (typeof transform.enabled !== 'boolean')
					throw new Error('Template transform enabled가 올바르지 않습니다.')
				assertTemplateTransformLimits(transform.limits)
				break
			}
			case 'vector':
				assertTemplateKeys(slot, [
					'id',
					'layer',
					'label',
					'kind',
					'access',
					'visibility',
					'color',
				])
				if (slot.color !== undefined) assertTemplateString(slot.color, 'slot.color')
				break
			case 'background':
				assertTemplateKeys(slot, [
					'id',
					'layer',
					'label',
					'kind',
					'typeControlId',
					'colorControlId',
					'dimmerControlId',
					'dimmerOpacityControlId',
					'imageConfig',
				])
				assertTemplateString(slot.typeControlId, 'slot.typeControlId')
				assertTemplateString(slot.colorControlId, 'slot.colorControlId')
				assertTemplateString(slot.dimmerControlId, 'slot.dimmerControlId')
				assertTemplateString(slot.dimmerOpacityControlId, 'slot.dimmerOpacityControlId')
				assertTemplateImagePolicy(slot.imageConfig)
				break
			default:
				throw new Error(`지원하지 않는 Template slot입니다: ${String(slot.kind)}`)
		}
	}

	const exportOption = templateRecord(template.exportOption, 'TemplateStudioConfig exportOption')
	assertTemplateKeys(exportOption, ['canvas', 'canvasPpi', 'maxScale'])
	resolveStudioArtifactOutputFormats(
		common.artifacts,
		(root.output as StudioOutputCapability).formats,
	)
	const canvas = templateRecord(exportOption.canvas, 'TemplateStudioConfig canvas')
	assertTemplateKeys(canvas, ['width', 'height'])
	assertPositiveNumber(canvas.width, 'canvas.width')
	assertPositiveNumber(canvas.height, 'canvas.height')
	assertPositiveNumber(exportOption.maxScale, 'exportOption.maxScale')
	if (exportOption.canvasPpi !== undefined && !isPrintPpi(exportOption.canvasPpi)) {
		throw new Error('TemplateStudioConfig canvasPpi: 인쇄 해상도 범위의 정수여야 합니다.')
	}

	const typed = input as TemplateStudioConfig
	const { text, background } = partitionTemplateSlots(typed.template.slots)
	for (const slot of text) {
		if (findTemplateControl(typed, slot.controlId)?.kind !== 'text') {
			throw new Error(`Template text control 참조가 올바르지 않습니다: ${slot.controlId}`)
		}
	}
	if (
		typed.template.textColorControlId &&
		findTemplateControl(typed, typed.template.textColorControlId)?.kind !== 'color'
	) {
		throw new Error('Template text color control 참조가 올바르지 않습니다.')
	}
	if (
		background &&
		(findTemplateControl(typed, background.typeControlId)?.kind !== 'select' ||
			findTemplateControl(typed, background.colorControlId)?.kind !== 'color')
	) {
		throw new Error('Template background control 참조가 올바르지 않습니다.')
	}
	return typed
}

export const isTextSlot = (slot: TemplateStudioConfigSlot): slot is TemplateTextSlot =>
	slot.kind === 'text'
export const isImageSlot = (slot: TemplateStudioConfigSlot): slot is TemplateImageConfigSlot =>
	slot.kind === 'image'
export const isVectorSlot = (slot: TemplateStudioConfigSlot): slot is TemplateVectorSlot =>
	slot.kind === 'vector'
export const isBackgroundSlot = (slot: TemplateStudioConfigSlot): slot is TemplateBackgroundSlot =>
	slot.kind === 'background'

/** slot kind 추가 시 모든 소비 경로가 한 exhaustive switch에서 컴파일 실패하도록 분류한다. */
/**
 * 레이어 패널이 보여 주는 **묶음(그룹)** — 슬롯 하나하나가 아니다(사용자 지시, 2026-09-10).
 *
 * 🔑 「좀 더 포괄적으로 묶음」: text는 title·subtitle·body 등 **모든 텍스트**를, image는 n개의
 *    이미지를, CI는 CI를, background는 판의 배경(solid color·image·graphic)을 하나로 묶는다.
 *    그래서 슬롯이 7개인 템플릿(`poster`)도 목록은 4줄이다 — 「컨트롤러가 너무 많다」의 답이다.
 * 🔴 순서는 **고정**이다. 그룹은 겹침에서 한 자리를 갖지 않으므로(텍스트와 이미지가 z에서
 *    엇갈린다) 겹침 순서로 정렬할 수 없다 — 대신 모든 템플릿에서 목록이 같은 모양이 된다.
 *    배경만은 언제나 맨 아래라서 마지막이다.
 * 🔴 비어 있는 그룹은 줄을 내지 않는다. 배경은 노드가 아니라 도화지라 항상 있다.
 */
export type TemplateLayerGroup = {
	kind: TemplateStudioConfigSlot['kind']
	label: string
	/**
	 * 이 묶음에 든 슬롯 — 캔버스 하이라이트가 한 번에 집는 대상이고, 레이어 패널이 묶음 아래에
	 * 이름을 늘어놓는 대상이다(Title·Subtitle·Image 1 …).
	 * 🔴 이름의 정본은 CMS다 — 텍스트는 Admin의 `input.label`, 그 밖은 노드의 `data-name`이다.
	 * 🔴 배경은 노드가 아니라 도화지라 **비어 있다.** 하위가 없는 것이 사실이다.
	 */
	members: readonly { id: string; label: string }[]
}

/**
 * 배경 묶음의 이름. 🔴 **묶음에 들지 않은 노드가 모이는 자리**이기도 하다 — 배경은 노드가 아니라
 * 도화지라 정의상 나머지를 받는다(`mapTemplateNodeLayers`가 목록을 내지 않는 이유).
 */
export const TEMPLATE_BACKGROUND_LAYER = 'Background'

const LAYER_GROUP_ORDER = [
	{ kind: 'text', label: 'Text' },
	{ kind: 'image', label: 'Image' },
	// 벡터 슬롯의 실제 이름은 12개 템플릿에서 CI 10 · Logo 1 · Vector 1이다 — 묶음 이름은 CI다.
	{ kind: 'vector', label: 'CI' },
	{ kind: 'background', label: TEMPLATE_BACKGROUND_LAYER },
] as const satisfies readonly { kind: TemplateStudioConfigSlot['kind']; label: string }[]

export function listTemplateLayerGroups(
	slots: readonly TemplateStudioConfigSlot[],
): TemplateLayerGroup[] {
	const groups: TemplateLayerGroup[] = []
	for (const { kind, label } of LAYER_GROUP_ORDER) {
		const matched = slots.filter((slot) => slot.kind === kind)
		if (!matched.length) continue
		groups.push({
			kind,
			label,
			// 배경은 도화지 하나라 하위를 갖지 않는다 — 자기 이름을 한 번 더 적지 않는다.
			members: kind === 'background' ? [] : matched.map(({ id, label }) => ({ id, label })),
		})
	}
	return groups
}

/**
 * nodeId → 묶음 이름. 인쇄 PDF가 묶음을 Form XObject로 싣는 데 쓴다 — 레이어 패널과 **같은 정본**을
 * 읽으므로 화면의 묶음과 파일의 그룹이 갈라지지 않는다.
 * 🔴 여기 없는 노드는 배경이다. 배경 슬롯은 도화지라 member가 없고, 그래서 항목도 내지 않는다.
 */
export function mapTemplateNodeLayers(
	slots: readonly TemplateStudioConfigSlot[],
): ReadonlyMap<string, string> {
	return new Map(
		listTemplateLayerGroups(slots).flatMap((group) =>
			group.members.map((member) => [member.id, group.label] as const),
		),
	)
}

export function partitionTemplateSlots(slots: readonly TemplateStudioConfigSlot[]) {
	const text: TemplateTextSlot[] = []
	const image: TemplateImageConfigSlot[] = []
	const vector: TemplateVectorSlot[] = []
	let background: TemplateBackgroundSlot | undefined
	for (const slot of slots) {
		switch (slot.kind) {
			case 'text':
				text.push(slot)
				break
			case 'image':
				image.push(slot)
				break
			case 'vector':
				vector.push(slot)
				break
			case 'background':
				if (background) throw new Error('Template background slot은 하나만 허용됩니다.')
				background = slot
				break
			default:
				return assertNeverTemplateSlot(slot)
		}
	}
	return { text, image, vector, background }
}

function assertNeverTemplateSlot(slot: never): never {
	throw new Error(`지원하지 않는 Template slot입니다: ${JSON.stringify(slot)}`)
}

export function findTemplateControl(
	config: TemplateStudioConfig,
	controlId: string,
): ControllerControlDefinition | undefined {
	return config.controller.groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === controlId)
}

export function findTemplateControlGroup(
	config: TemplateStudioConfig,
	controlId: string,
): ControllerGroupDefinition | undefined {
	return config.controller.groups.find((group) =>
		group.controls.some((control) => control.id === controlId),
	)
}

export type ResolvedTemplateImageConfig = {
	config: ImageStudioConfig
	prompt: TextControlDefinition
	ratio: SelectControlDefinition & {
		defaultValue: ImageAspectRatio
		options: readonly [{ value: ImageAspectRatio; label: string }]
	}
	imageSize: ImageOutputSize
}

/**
 * Image Config를 Template 슬롯에 좁혀 적용한다. Template은 1장 생성과 슬롯 기하만 강제하고,
 * 원본 Config에 없는 비율·해상도·컨트롤을 추가하지 않는다.
 */
export function resolveTemplateImageConfig(
	config: ImageStudioConfig,
	box: { width?: number; height?: number },
): ResolvedTemplateImageConfig | null {
	let controls: ReturnType<typeof getImageStudioControls>
	try {
		controls = getImageStudioControls(config)
	} catch {
		return null
	}
	const { prompt, batch, ratio, resolution } = controls
	const batchSupportsOne =
		batch.availability === undefined || batch.availability === 'enabled'
			? batch.options.some((option) => option.value === '1')
			: batch.defaultValue === '1'
	if (!batchSupportsOne) return null

	const ratioIsEnabled = ratio.availability === undefined || ratio.availability === 'enabled'
	const selectedRatio = ratioIsEnabled
		? nearestAllowedAspectRatio(
				box.width,
				box.height,
				ratio.options
					.map(({ value }) => value)
					.filter((value): value is ImageAspectRatio => isImageAspectRatio(value)),
				isImageAspectRatio(ratio.defaultValue) ? ratio.defaultValue : undefined,
			)
		: isImageAspectRatio(ratio.defaultValue)
			? ratio.defaultValue
			: undefined
	const imageSize = resolution.defaultValue
	if (
		!selectedRatio ||
		!isImageOutputSize(imageSize) ||
		!resolution.options.some((option) => option.value === imageSize)
	) {
		return null
	}

	const selectedOption = ratio.options.find((option) => option.value === selectedRatio)
	if (!selectedOption) return null
	return {
		config,
		prompt,
		ratio: {
			...ratio,
			availability: 'readonly',
			defaultValue: selectedRatio,
			options: [{ value: selectedRatio, label: selectedOption.label }],
		},
		imageSize,
	}
}

export function listCompatibleTemplateImageConfigs(
	slot: TemplateImageConfigSlot | TemplateBackgroundSlot,
	configs: readonly ImageStudioConfig[],
	box = slot.kind === 'image' ? slot.box : { width: undefined, height: undefined },
): ResolvedTemplateImageConfig[] {
	const policy = slot.imageConfig
	const allowedConfigIds =
		policy.mode === 'selectable' && policy.allowedConfigIds
			? new Set(policy.allowedConfigIds)
			: null
	const candidates = configs.filter((config) => {
		if (policy.mode === 'pinned') return config.id === policy.configId
		return !allowedConfigIds || allowedConfigIds.has(config.id)
	})
	return candidates.flatMap((config) => {
		const resolved = resolveTemplateImageConfig(config, box)
		return resolved ? [resolved] : []
	})
}

function nearestAllowedAspectRatio(
	width: number | undefined,
	height: number | undefined,
	allowed: readonly ImageAspectRatio[],
	fallback: ImageAspectRatio | undefined,
): ImageAspectRatio | undefined {
	if (allowed.length === 0) return undefined
	if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height)) {
		return fallback && allowed.includes(fallback) ? fallback : allowed[0]
	}
	const target = Math.log(width / height)
	return allowed.reduce((nearest, candidate) =>
		ratioDistance(candidate, target) < ratioDistance(nearest, target) ? candidate : nearest,
	)
}

function ratioDistance(ratio: ImageAspectRatio, target: number) {
	const [width, height] = ratio.split(':').map(Number)
	return Math.abs(Math.log(width / height) - target)
}

function isImageOutputSize(value: string | null): value is ImageOutputSize {
	return IMAGE_OUTPUT_SIZES.includes(value as ImageOutputSize)
}

function isImageAspectRatio(value: string | null): value is ImageAspectRatio {
	return IMAGE_ASPECT_RATIOS.includes(value as ImageAspectRatio)
}

/**
 * 배경 그룹을 정책으로 좁혀 만든다.
 *
 * 🔴 background.color 컨트롤은 형식에서 색을 막아도 지운다 — TemplateBackgroundSlot.colorControlId가
 * 필수고 parse가 그 존재를 검증하므로, 없애면 슬롯 계약과 소비 컴포넌트까지 optional이 번진다.
 * 색이 형식에 없으면 창작자가 그 자리에 닿지 못하므로 남겨 두어도 해가 없다.
 */
function buildBackgroundGroup(
	policy: TemplateBackgroundPolicy | undefined,
): ControllerGroupDefinition {
	const allowed = policy?.types
	const options = allowed
		? BACKGROUND_TYPE_OPTIONS.filter((option) => allowed.includes(option.value))
		: BACKGROUND_TYPE_OPTIONS
	if (options.length === 0) {
		throw new Error('Template 배경 형식은 최소 하나를 허용해야 합니다.')
	}
	return {
		id: 'background',
		title: 'Background',
		controls: [
			{
				id: BACKGROUND_TYPE_CONTROL_ID,
				kind: 'select',
				label: 'Type',
				defaultValue: options[0].value,
				options,
				// 고를 것이 하나면 열어 둘 이유가 없다.
				...(options.length === 1 ? { availability: 'readonly' as const } : {}),
			},
			{
				id: BACKGROUND_COLOR_CONTROL_ID,
				kind: 'color',
				label: 'Background Color',
				defaultValue: null,
			},
			// 형식(types)과 같은 정책 흐름 — 정책이 끄면 컨트롤이 매니페스트에서 빠지고
			// 사이드바에 행 자체가 그려지지 않는다. 슬롯의 controlId는 상수라 그대로 남고,
			// 소비자(provider·sidebar)는 컨트롤 부재를 이미 견딘다.
			...(policy?.dimmer === false
				? []
				: ([
						// 강도를 따로 두는 이유는 껐다 켜도 맞춰 둔 값이 남아야 하기 때문이다.
						{
							id: BACKGROUND_DIMMER_CONTROL_ID,
							kind: 'toggle',
							label: 'Dimmer',
							defaultValue: false,
						},
						{
							id: BACKGROUND_DIMMER_OPACITY_CONTROL_ID,
							kind: 'range',
							label: 'Dimmer Opacity',
							defaultValue: 0.2,
							min: 0,
							// 실용 상한 — 1.0은 배경을 완전한 검정으로 덮어 배경을 고른 의미가 없어진다.
							max: 0.7,
							step: 0.01,
							display: { precision: 2 },
						},
					] as const)),
		],
	}
}

/** Template 문서 구조에서 Admin 제한 전의 결정적 Runtime Manifest를 파생한다. */
export function getTemplateRuntimeManifest({
	html,
	nodeConfigs,
	width,
	height,
	backgroundPolicy,
}: Pick<PublishedHtmlTemplate, 'html' | 'nodeConfigs'> &
	Partial<
		Pick<PublishedHtmlTemplate, 'width' | 'height' | 'backgroundPolicy'>
	>): StudioRuntimeManifest {
	const textControls: TextControlDefinition[] = collectTemplateSlots(html, nodeConfigs).map(
		(slot) => ({
			id: `text:${slot.nodeId}`,
			kind: 'text',
			label: slot.input.label ?? slot.name,
			defaultValue: slot.text,
			...(slot.policy.access === 'readonly' ? { availability: 'readonly' as const } : {}),
			multiline: (slot.input.inputFormat ?? 'free') === 'free' && slot.input.maxLines !== 1,
			...(slot.input.maxLength === undefined ? {} : { maxLength: slot.input.maxLength }),
			...(slot.input.placeholder === undefined
				? {}
				: { placeholder: slot.input.placeholder }),
		}),
	)
	// 세로형 캔버스는 폴백의 가로형 1080p 상한에 막힌다 — 자기 캔버스에 허용 배율을 곱해 선언한다.
	// capability는 fps별 상한을 담을 수 없으므로 프레임 크기 예산만 본 바깥 경계다.
	// 초당 처리량까지 본 정확한 배율은 export 훅이 선택된 fps로 좁힌다.
	const maxScale = width && height ? resolveMaxExportScale(width, height) : 1
	const videoFrame =
		width && height && width > 0 && height > 0
			? {
					...DEFAULT_RASTER_VIDEO_CAPABILITY,
					maxWidth: width * maxScale,
					maxHeight: height * maxScale,
				}
			: null
	return {
		// 벡터는 캔버스 크기와 무관하게 항상 낼 수 있다 — 재서 도형으로 옮기는 것이라 배율 예산이 없다.
		artifacts: { raster: {}, vector: {}, ...(videoFrame ? { video: videoFrame } : {}) },
		controller: {
			groups: [
				...(textControls.length
					? [
							{
								id: 'text',
								title: 'Text',
								controls: [
									...textControls,
									{
										id: TEXT_COLOR_CONTROL_ID,
										kind: 'color' as const,
										label: 'Color',
										defaultValue: null,
									},
								],
							},
						]
					: []),
				buildBackgroundGroup(backgroundPolicy),
			],
		},
	}
}

/** published Template과 접근 가능한 Image·Graphic Config에서 실행 가능한 Template 계약을 순수 파생한다. */
export function deriveTemplateStudioConfig(
	template: PublishedHtmlTemplate,
	imageConfigs: readonly ImageStudioConfig[] = [],
	graphicConfigs: readonly GraphicStudioConfig[] = [],
): TemplateStudioConfig {
	const { html, nodeConfigs } = template
	const backgroundPolicy = template.backgroundPolicy
	// ponytail: template.graphicConfigs는 배경 그래픽에서만 소비된다 — 슬롯에 id 목록을 더하지 않고 목록 자체를 좁힌다.
	const allowedGraphicIds = backgroundPolicy?.graphicConfigIds
	const scopedGraphicConfigs = allowedGraphicIds
		? graphicConfigs.filter((config) => allowedGraphicIds.includes(config.id))
		: graphicConfigs
	const textSlots = collectTemplateSlots(html, nodeConfigs)
	const vectorSlots = collectTemplateVectorSlots(html, nodeConfigs)
	const slots: TemplateStudioConfigSlot[] = [
		...textSlots.map(
			(slot): TemplateTextSlot => ({
				id: slot.nodeId,
				layer: slot.name,
				label: slot.input.label ?? slot.name,
				kind: 'text',
				access: slot.policy.access,
				visibility: slot.policy.visibility,
				controlId: `text:${slot.nodeId}`,
				input: {
					format: slot.input.inputFormat ?? 'free',
					maxLines: slot.input.maxLines,
				},
			}),
		),
		...collectTemplateImageSlots(html, nodeConfigs).map(
			(slot): TemplateImageConfigSlot => ({
				id: slot.nodeId,
				layer: slot.name,
				label: slot.name,
				kind: 'image',
				access: slot.policy.access,
				visibility: slot.policy.visibility,
				box: { width: slot.boxWidth, height: slot.boxHeight },
				imageConfig: slot.profileId
					? { mode: 'pinned', configId: slot.profileId }
					: {
							mode: 'selectable',
							...(slot.allowedProfileIds
								? { allowedConfigIds: slot.allowedProfileIds }
								: {}),
						},
				...(nodeConfigs[slot.nodeId]?.imageColorize
					? {
							featureOverrides: {
								colorAdjustment: nodeConfigs[slot.nodeId].imageColorize,
							},
						}
					: {}),
				transform: { enabled: slot.transformEnabled, limits: IMAGE_EDIT_TRANSFORM_LIMITS },
			}),
		),
		...vectorSlots.map(
			(slot): TemplateVectorSlot => ({
				id: slot.nodeId,
				layer: slot.name,
				label: slot.name,
				kind: 'vector',
				access: slot.policy.access,
				visibility: slot.policy.visibility,
				...(slot.color ? { color: slot.color } : {}),
			}),
		),
		{
			id: 'background',
			layer: 'background',
			label: 'Background',
			kind: 'background',
			typeControlId: BACKGROUND_TYPE_CONTROL_ID,
			colorControlId: BACKGROUND_COLOR_CONTROL_ID,
			dimmerControlId: BACKGROUND_DIMMER_CONTROL_ID,
			dimmerOpacityControlId: BACKGROUND_DIMMER_OPACITY_CONTROL_ID,
			imageConfig: {
				mode: 'selectable',
				...(backgroundPolicy?.imageConfigIds
					? { allowedConfigIds: backgroundPolicy.imageConfigIds }
					: {}),
			},
		},
	]

	// 🔴 슬롯을 **그리는 순서(아래 → 위)** 로 정렬한다. 위에서 세 수집기(text·image·vector)를
	//    이어 붙였을 뿐이라 그 순서는 판에서 무엇이 위인지와 무관했다 — 레이어 패널이 그것을
	//    그대로 보여 주면 「겹침 순서」로 읽히는데 사실이 아니었다.
	// 🔑 문서 순서가 곧 겹침 순서다(템플릿 12개 전부 z-index 0건 · 전부 `position: absolute`).
	//    그래서 Admin의 `childOrder`가 compose에서 DOM을 재배치하면 이 정렬이 그것을 따라간다.
	//    배경은 노드가 아니라 도화지라 언제나 맨 아래다.
	const documentOrder = new Map(
		Array.from(html.matchAll(/data-node-id="([^"]*)"/g), (match, index) => [match[1], index]),
	)
	const orderOf = (slot: TemplateStudioConfigSlot) =>
		slot.kind === 'background' ? Number.NEGATIVE_INFINITY : (documentOrder.get(slot.id) ?? 0)
	slots.sort((left, right) => orderOf(left) - orderOf(right))

	const runtimeManifest = getTemplateRuntimeManifest(template)
	const controllerGroups = runtimeManifest.controller.groups

	const config: TemplateStudioConfig = {
		studio: 'template',
		id: template.id,
		version: 1,
		name: template.name,
		output: resolveStudioOutputCapability(
			runtimeManifest.artifacts,
			withGuaranteedTemplateFormats(projectStudioOutputPolicy(template.exportPolicy)),
		),
		artifacts: runtimeManifest.artifacts,
		controller: {
			groups: controllerGroups,
		},
		// 어드민 입력을 없앤 뒤에도 창작자 사이드바가 이 값을 읽으므로 기본값을 계산해 싣는다.
		controllerPresentation: resolveControllerPresentation(controllerGroups, undefined),
		previewImage: template.previewImage,
		template: {
			slots,
			...(textSlots.length ? { textColorControlId: TEXT_COLOR_CONTROL_ID } : {}),
			imageConfigs,
			graphicConfigs: scopedGraphicConfigs,
			exportOption: {
				canvas: { width: template.width, height: template.height },
				...(template.canvasPpi === undefined ? {} : { canvasPpi: template.canvasPpi }),
				maxScale: resolveMaxExportScale(template.width, template.height),
			},
		},
	}
	parseTemplateStudioConfig(config)
	return config
}

/**
 * 🔑 템플릿은 어떤 정책이든 **벡터(svg·pdf)** 를 낸다. 벡터는 고르는 선택지가 아니라 판이 가진
 *    성질이라, 정책이 지우면 「왜 벡터가 없지」를 템플릿마다 다시 디버깅하게 된다(2026-08-27에
 *    실제로 그랬다 — 발행된 12개 중 벡터를 허용한 것이 하나도 없었다).
 *    콘텐츠에 따라 벡터라도 사실상 이미지 덩어리일 수 있으나 그것은 결과의 성격이지 가부가 아니다.
 * 🔴 래스터는 보장하지 않는다 — png를 못 끄게 만들면 admin의 「래스터」 토글이 거짓말을 한다.
 */
export const GUARANTEED_TEMPLATE_FORMATS = ['svg', 'pdf'] as const

function withGuaranteedTemplateFormats(
	policy: ReturnType<typeof projectStudioOutputPolicy>,
): ReturnType<typeof projectStudioOutputPolicy> {
	// 좁히지 않는 정책은 이미 전부 낸다 — 손대면 오히려 의미가 바뀐다.
	if (!policy?.allowedFormats) return policy
	return {
		...policy,
		allowedFormats: [...new Set([...policy.allowedFormats, ...GUARANTEED_TEMPLATE_FORMATS])],
	}
}

function templateRecord(value: unknown, name: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${name}이 객체가 아닙니다.`)
	}
	return value as Record<string, unknown>
}

function assertTemplateKeys(value: Record<string, unknown>, allowed: readonly string[]) {
	const allowedKeys = new Set(allowed)
	for (const key of Object.keys(value)) {
		if (!allowedKeys.has(key)) {
			throw new Error(`TemplateStudioConfig에 알 수 없는 필드가 있습니다: ${key}`)
		}
	}
}

function assertTemplateString(value: unknown, name: string) {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`TemplateStudioConfig ${name}은 비어 있지 않은 문자열이어야 합니다.`)
	}
}

function assertPositiveNumber(value: unknown, name: string) {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		throw new Error(`TemplateStudioConfig ${name}은 양수여야 합니다.`)
	}
}

function assertFiniteNumber(value: unknown, name: string) {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`TemplateStudioConfig ${name}은 유한한 숫자여야 합니다.`)
	}
}

function assertPositiveInteger(value: unknown, name: string) {
	assertPositiveNumber(value, name)
	if (!Number.isInteger(value)) throw new Error(`TemplateStudioConfig ${name}은 정수여야 합니다.`)
}

function assertTemplateBox(value: unknown) {
	const box = templateRecord(value, 'TemplateStudioConfig box')
	assertTemplateKeys(box, ['width', 'height'])
	if (box.width !== undefined) assertPositiveNumber(box.width, 'box.width')
	if (box.height !== undefined) assertPositiveNumber(box.height, 'box.height')
}

function assertTemplateLayerPolicy(slot: Record<string, unknown>) {
	if (slot.access !== 'readonly' && slot.access !== 'editable') {
		throw new Error('TemplateStudioConfig layer access가 올바르지 않습니다.')
	}
	const visibility = templateRecord(slot.visibility, 'TemplateStudioConfig layer visibility')
	assertTemplateKeys(visibility, ['defaultVisible', 'allowToggle'])
	if (
		typeof visibility.defaultVisible !== 'boolean' ||
		typeof visibility.allowToggle !== 'boolean'
	) {
		throw new Error('TemplateStudioConfig layer visibility가 올바르지 않습니다.')
	}
	if (slot.access !== 'editable' && (!visibility.defaultVisible || visibility.allowToggle)) {
		throw new Error('TemplateStudioConfig readonly layer는 visibility 정책을 바꿀 수 없습니다.')
	}
}

function assertTemplateFeatureOverrides(value: unknown) {
	const overrides = templateRecord(value, 'TemplateStudioConfig featureOverrides')
	assertTemplateKeys(overrides, ['colorAdjustment'])
	if (overrides.colorAdjustment === undefined) return
	const color = templateRecord(overrides.colorAdjustment, 'TemplateStudioConfig colorAdjustment')
	assertTemplateKeys(color, ['line', 'background'])
	assertTemplateString(color.line, 'colorAdjustment.line')
	if (color.background !== undefined) {
		assertTemplateString(color.background, 'colorAdjustment.background')
	}
}

function assertTemplateTransformLimits(value: unknown) {
	const limits = templateRecord(value, 'TemplateStudioConfig transform limits')
	assertTemplateKeys(limits, ['translate', 'scale', 'rotate'])
	for (const key of ['translate', 'scale', 'rotate'] as const) {
		const range = templateRecord(limits[key], `TemplateStudioConfig transform limits.${key}`)
		assertTemplateKeys(range, ['min', 'max'])
		assertFiniteNumber(range.min, `transform limits.${key}.min`)
		assertFiniteNumber(range.max, `transform limits.${key}.max`)
		if ((range.min as number) > (range.max as number)) {
			throw new Error(
				`TemplateStudioConfig transform limits.${key}의 범위가 올바르지 않습니다.`,
			)
		}
	}
}

function assertTemplateImagePolicy(value: unknown) {
	const policy = templateRecord(value, 'TemplateStudioConfig image policy')
	if (policy.mode === 'pinned') {
		assertTemplateKeys(policy, ['mode', 'configId'])
		assertPositiveInteger(policy.configId, 'imageConfig.configId')
		return
	}
	if (policy.mode !== 'selectable')
		throw new Error('TemplateStudioConfig image policy mode가 올바르지 않습니다.')
	assertTemplateKeys(policy, ['mode', 'allowedConfigIds'])
	if (policy.allowedConfigIds === undefined) return
	if (!Array.isArray(policy.allowedConfigIds)) {
		throw new Error('TemplateStudioConfig allowedConfigIds는 배열이어야 합니다.')
	}
	const ids = new Set<number>()
	for (const id of policy.allowedConfigIds) {
		assertPositiveInteger(id, 'allowedConfigIds')
		if (ids.has(id as number))
			throw new Error('TemplateStudioConfig allowedConfigIds가 중복되었습니다.')
		ids.add(id as number)
	}
}
