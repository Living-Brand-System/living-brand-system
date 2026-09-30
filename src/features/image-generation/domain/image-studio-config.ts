import {
	type CameraAzimuth,
	type CameraElevation,
	isCameraAzimuth,
	isCameraElevation,
} from '@/features/image-generation/domain/camera-control'
import type { ImageModelPreset } from '@/features/image-generation/domain/image-model'
import {
	parseStudioOutputCapability,
	projectStudioOutputPolicy,
	resolveStudioArtifactOutputFormats,
	resolveStudioOutputCapability,
	type StudioOutputCapability,
} from '@/features/studio-export/studio-output'
import {
	acceptsControllerExecutionValue,
	applyControllerRestrictions,
	type ControllerControlDefinition,
	parseStudioControllerConfig,
	projectPayloadControllerRestrictions,
	resolveControllerPresentation,
	type StudioControllerConfig,
	toStudioPreviewImage,
} from '@/modules/studio-controller/controller-definition'
import {
	getImageRuntimeManifest,
	IMAGE_STUDIO_CONTROL_IDS,
	IMAGE_STUDIO_GROUP_IDS,
	type ImageRuntimeManifest,
} from './image-runtime-manifest'

export {
	IMAGE_STUDIO_CONTROL_IDS,
	IMAGE_STUDIO_GROUP_IDS,
} from './image-runtime-manifest'

export type ImageStudioFeature =
	| {
			type: 'color-adjustment'
			controls: { line: string; background?: string }
	  }
	| {
			type: 'camera-control'
			/** Admin이 좁힌 뒤 사용자가 실제로 고를 수 있는 구간. 항상 비어 있지 않다. */
			azimuths: readonly CameraAzimuth[]
			elevations: readonly CameraElevation[]
	  }
	| { type: 'reference-image' }

export type ImageProfileFeatureSelection =
	| { type: 'color-adjustment'; background: boolean }
	| {
			type: 'camera-control'
			/** 비우면 런타임 전체 구간을 그대로 쓴다. */
			azimuths?: readonly CameraAzimuth[]
			elevations?: readonly CameraElevation[]
	  }
	| { type: 'reference-image' }

/** Image Studio Config를 파생하는 서버측 published 프로파일 read model. */
export type PublishedImageProfileDefinition = {
	id: number
	name: string
	slug: string | null
	imageModelPreset: ImageModelPreset
	controllerRestrictions?: unknown
	controllerPresentation?: unknown
	features?: unknown
	exportPolicy?: unknown
	previewImage?: unknown
}

/** 이미지 프로파일 하나가 발행하는 공통 Controller envelope와 이미지 실행 descriptor. */
export type ImageStudioConfig = StudioControllerConfig<'image', number> & {
	output: StudioOutputCapability & { original: boolean }
	image: {
		slug: string | null
		features: readonly ImageStudioFeature[]
	}
}

type ControlOfKind<Kind extends ControllerControlDefinition['kind']> = Extract<
	ControllerControlDefinition,
	{ kind: Kind }
>

export type ImageStudioControls = {
	prompt: ControlOfKind<'text'>
	batch: ControlOfKind<'select'>
	ratio: ControlOfKind<'select'>
	resolution: ControlOfKind<'select'>
}

/** unknown 입력을 공통 Controller와 Image descriptor까지 검증한다. */
export function parseImageStudioConfig(input: unknown): ImageStudioConfig {
	const common = parseStudioControllerConfig(input)
	const config = record(input, 'ImageStudioConfig')
	assertKeys(config, [
		'studio',
		'id',
		'version',
		'name',
		'artifacts',
		'output',
		'controller',
		'controllerPresentation',
		'previewImage',
		'image',
	])
	if (common.studio !== 'image') throw new Error('ImageStudioConfig studio: image여야 합니다.')
	if (typeof common.id !== 'number' || !Number.isInteger(common.id)) {
		throw new Error('ImageStudioConfig id: 정수여야 합니다.')
	}
	const output = parseStudioOutputCapability(config.output)
	resolveStudioArtifactOutputFormats(common.artifacts, output.formats)
	if (typeof output.original !== 'boolean') {
		throw new Error('ImageStudioConfig output.original은 boolean이어야 합니다.')
	}
	const image = record(config.image, 'ImageStudioConfig.image')
	assertKeys(image, ['slug', 'features'])
	if (image.slug !== null && typeof image.slug !== 'string') {
		throw new Error('ImageStudioConfig image.slug는 문자열 또는 null이어야 합니다.')
	}
	if (!Array.isArray(image.features)) {
		throw new Error('ImageStudioConfig image.features는 배열이어야 합니다.')
	}
	const featureTypes = new Set<string>()
	for (const featureValue of image.features) {
		const feature = record(featureValue, 'ImageStudioConfig feature')
		if (feature.type === 'camera-control') {
			assertKeys(feature, ['type', 'azimuths', 'elevations'])
			assertSectors(feature.azimuths, isCameraAzimuth, 'azimuths')
			assertSectors(feature.elevations, isCameraElevation, 'elevations')
		} else if (feature.type === 'reference-image') {
			assertKeys(feature, ['type'])
		} else if (feature.type === 'color-adjustment') {
			assertKeys(feature, ['type', 'controls'])
			const controls = record(feature.controls, 'ImageStudioConfig color controls')
			assertKeys(controls, ['line', 'background'])
			if (typeof controls.line !== 'string' || controls.line.length === 0) {
				throw new Error('ImageStudioConfig color line control이 필요합니다.')
			}
			if (controls.background !== undefined && typeof controls.background !== 'string') {
				throw new Error('ImageStudioConfig color background control이 올바르지 않습니다.')
			}
		} else {
			throw new Error(`지원하지 않는 ImageStudioFeature입니다: ${String(feature.type)}`)
		}
		if (featureTypes.has(feature.type as string)) {
			throw new Error(`Image feature type이 중복되었습니다: ${String(feature.type)}`)
		}
		featureTypes.add(feature.type as string)
	}

	const typed = input as ImageStudioConfig
	getImageStudioControls(typed)
	getImageColorAdjustmentControls(typed)
	return typed
}

/** Image와 Template 생성 경로가 공유하는 prompt 실행 판정이다. */
export function acceptsImagePromptExecution(
	control: ControlOfKind<'text'>,
	value: string,
): boolean {
	return value.trim().length > 0 && acceptsControllerExecutionValue(control, value)
}

export function resolveImagePromptExecution(control: ControlOfKind<'text'>, value: string): string {
	return control.availability === 'readonly' || control.availability === 'disabled'
		? (control.defaultValue ?? '')
		: value.trim()
}

/** stable ID로 이미지 도메인의 필수 생성 컨트롤과 선택 색 컨트롤을 찾는다. */
export function getImageStudioControls(config: ImageStudioConfig): ImageStudioControls {
	return {
		prompt: requireControl(config, IMAGE_STUDIO_CONTROL_IDS.prompt, 'text'),
		batch: requireControl(config, IMAGE_STUDIO_CONTROL_IDS.batch, 'select'),
		ratio: requireControl(config, IMAGE_STUDIO_CONTROL_IDS.ratio, 'select'),
		resolution: requireControl(config, IMAGE_STUDIO_CONTROL_IDS.resolution, 'select'),
	}
}

/** Image feature type으로 published capability를 찾는다. */
export function getImageStudioFeature<Type extends ImageStudioFeature['type']>(
	config: ImageStudioConfig,
	type: Type,
): Extract<ImageStudioFeature, { type: Type }> | undefined {
	return config.image.features.find((feature) => feature.type === type) as
		| Extract<ImageStudioFeature, { type: Type }>
		| undefined
}

/** color-adjustment feature의 semantic ref를 실제 color Definition으로 해석한다. */
export function getImageColorAdjustmentControls(config: ImageStudioConfig): {
	line: ControlOfKind<'color'>
	background?: ControlOfKind<'color'>
} | null {
	const feature = getImageStudioFeature(config, 'color-adjustment')
	if (!feature) return null
	return {
		line: requireControl(config, feature.controls.line, 'color'),
		...(feature.controls.background
			? { background: requireControl(config, feature.controls.background, 'color') }
			: {}),
	}
}

/** common ControllerRenderer에서 feature dispatcher가 소유한 control을 제외할 ID 목록이다. */
export function getImageStudioFeatureControlIds(config: ImageStudioConfig): readonly string[] {
	return config.image.features.flatMap((feature) => {
		switch (feature.type) {
			case 'color-adjustment':
				return [feature.controls.line, feature.controls.background].filter(
					(value): value is string => Boolean(value),
				)
			case 'camera-control':
			case 'reference-image':
				return []
			default:
				return assertNeverFeature(feature)
		}
	})
}

/** Effective feature의 구간 목록은 비어 있을 수 없다 — 비면 조작 가능한 시점이 없다. */
function assertSectors(
	value: unknown,
	isSector: (candidate: unknown) => boolean,
	label: string,
): void {
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(`ImageStudioConfig camera-control ${label}가 비어 있습니다.`)
	}
	for (const sector of value) {
		if (!isSector(sector)) {
			throw new Error(
				`ImageStudioConfig camera-control ${label}에 알 수 없는 값이 있습니다: ${String(sector)}`,
			)
		}
	}
}

function assertNeverFeature(value: never): never {
	throw new Error(`지원하지 않는 ImageStudioFeature입니다: ${JSON.stringify(value)}`)
}

/**
 * Runtime Manifest를 Profile feature 선택과 Admin Restrictions로 좁혀 Effective Config를 만든다.
 */
export function deriveImageStudioConfig(
	profile: PublishedImageProfileDefinition,
): ImageStudioConfig {
	const manifest = getImageRuntimeManifest(profile.imageModelPreset)
	const featureSelections = projectSupportedImageProfileFeatureSelections(
		manifest,
		profile.features,
	)
	const controller = deriveImageProfileController(
		profile.imageModelPreset,
		profile.features,
		profile.controllerRestrictions,
	)
	const config: ImageStudioConfig = {
		studio: 'image',
		id: profile.id,
		version: 1,
		name: profile.name,
		output: resolveStudioOutputCapability(
			manifest.artifacts,
			projectStudioOutputPolicy(profile.exportPolicy),
			{ packages: ['zip'] },
		) as StudioOutputCapability & { original: boolean },
		artifacts: manifest.artifacts,
		controller,
		controllerPresentation: resolveControllerPresentation(
			controller.groups,
			profile.controllerPresentation,
		),
		previewImage: toStudioPreviewImage(profile.previewImage),
		image: {
			slug: profile.slug ?? null,
			features: projectEffectiveFeatures(manifest, featureSelections),
		},
	}

	parseImageStudioConfig(config)
	return config
}

/** Payload feature block을 Service가 알고 있는 선택으로 좁힌다. */
export function projectImageProfileFeatureSelections(
	input: unknown,
): readonly ImageProfileFeatureSelection[] {
	if (input == null) return []
	if (!Array.isArray(input)) throw new Error('Image features가 배열이 아닙니다.')

	return input.map((value) => {
		const feature = record(value, 'Image feature')
		switch (feature.blockType) {
			case 'colorAdjustment':
				assertFeatureKeys(feature, ['id', 'blockName', 'blockType', 'background'])
				if (feature.background != null && typeof feature.background !== 'boolean') {
					throw new Error('Image color-adjustment background은 boolean이어야 합니다.')
				}
				return {
					type: 'color-adjustment' as const,
					background: feature.background === true,
				}
			case 'referenceImage':
				assertFeatureKeys(feature, ['id', 'blockName', 'blockType'])
				return { type: 'reference-image' as const }
			case 'cameraControl': {
				assertFeatureKeys(feature, [
					'id',
					'blockName',
					'blockType',
					'azimuths',
					'elevations',
				])
				return {
					type: 'camera-control' as const,
					...definedSectors(
						'azimuths',
						projectCameraSectors(feature.azimuths, isCameraAzimuth, 'azimuths'),
					),
					...definedSectors(
						'elevations',
						projectCameraSectors(feature.elevations, isCameraElevation, 'elevations'),
					),
				}
			}
			default:
				throw new Error(`지원하지 않는 Image feature blockType입니다: ${feature.blockType}`)
		}
	})
}

// 🔴 `blockName`은 Payload blocks가 항상 붙이는 내장 필드다(값이 없어도 키는 온다). 허용 목록에서
// 빠지면 블록이 하나라도 있는 프로필이 전부 이 가드에 걸린다 — 데이터가 빈 환경에서는 경로를 안 타서
// 드러나지 않는다. 이 가드의 목적은 스키마 드리프트 감지이므로 Payload 내장 키는 통과시킨다.
/** Admin이 고른 구간이 런타임 지원 범위를 넘지 못하게 한다 — 좁히기만 허용한다. */
function assertNarrowedSectors<Sector extends string>(
	selected: readonly Sector[] | undefined,
	supported: readonly Sector[],
	label: string,
) {
	if (!selected) return
	const outside = selected.filter((sector) => !supported.includes(sector))
	if (outside.length > 0) {
		throw new Error(
			`Image camera-control ${label}가 런타임 지원 범위를 넘습니다: ${outside.join(', ')}`,
		)
	}
}

/** Payload select(hasMany)의 구간 목록을 읽는다 — 비었거나 없으면 좁히지 않는 것으로 본다. */
function projectCameraSectors<Sector extends string>(
	input: unknown,
	isSector: (value: unknown) => value is Sector,
	label: string,
): readonly Sector[] | undefined {
	if (input == null) return undefined
	if (!Array.isArray(input)) throw new Error(`Image camera-control ${label}가 배열이 아닙니다.`)
	if (input.length === 0) return undefined
	const sectors = new Set<Sector>()
	for (const value of input) {
		if (!isSector(value)) {
			throw new Error(`Image camera-control ${label}에 알 수 없는 값이 있습니다: ${value}`)
		}
		sectors.add(value)
	}
	return [...sectors]
}

function definedSectors<Key extends string, Sector extends string>(
	key: Key,
	value: readonly Sector[] | undefined,
) {
	return value === undefined ? {} : ({ [key]: value } as Record<Key, readonly Sector[]>)
}

function assertFeatureKeys(value: Record<string, unknown>, allowed: readonly string[]) {
	const allowedKeys = new Set(allowed)
	for (const key of Object.keys(value)) {
		if (!allowedKeys.has(key))
			throw new Error(`Image feature에 알 수 없는 필드가 있습니다: ${key}`)
	}
}

/** Admin form과 published projector가 같은 Manifest→Feature→Restrictions 순서를 소비한다. */
export function deriveImageProfileController(
	modelPreset: ImageModelPreset,
	features: unknown,
	controllerRestrictions: unknown,
): ImageStudioConfig['controller'] {
	const manifest = getImageRuntimeManifest(modelPreset)
	const featureSelections = projectSupportedImageProfileFeatureSelections(manifest, features)
	return {
		groups: applyControllerRestrictions(
			selectImageProfileControllerGroups(manifest, featureSelections),
			projectPayloadControllerRestrictions(controllerRestrictions),
		),
	}
}

function projectSupportedImageProfileFeatureSelections(
	manifest: ImageRuntimeManifest,
	input: unknown,
): readonly ImageProfileFeatureSelection[] {
	const selections = projectImageProfileFeatureSelections(input)
	const selectedTypes = new Set<ImageProfileFeatureSelection['type']>()
	const supportedFeatures = new Map(
		manifest.supportedFeatures.map((feature) => [feature.type, feature]),
	)
	for (const selection of selections) {
		if (selectedTypes.has(selection.type)) {
			throw new Error(`Image feature type이 중복되었습니다: ${selection.type}`)
		}
		selectedTypes.add(selection.type)
		const supported = supportedFeatures.get(selection.type)
		if (!supported) {
			throw new Error(`Image runtime이 지원하지 않는 feature입니다: ${selection.type}`)
		}
		if (
			selection.type === 'color-adjustment' &&
			selection.background &&
			(supported.type !== 'color-adjustment' || !supported.controls.background)
		) {
			throw new Error('Image runtime이 background color adjustment를 지원하지 않습니다.')
		}
		if (selection.type === 'camera-control' && supported.type === 'camera-control') {
			assertNarrowedSectors(selection.azimuths, supported.azimuths, 'azimuths')
			assertNarrowedSectors(selection.elevations, supported.elevations, 'elevations')
		}
	}
	return selections
}

function selectImageProfileControllerGroups(
	manifest: ImageRuntimeManifest,
	features: readonly ImageProfileFeatureSelection[],
): ImageStudioConfig['controller']['groups'] {
	const color = features.find((feature) => feature.type === 'color-adjustment')
	const capability = manifest.supportedFeatures.find(
		(feature) => feature.type === 'color-adjustment',
	)
	return manifest.controller.groups.flatMap((group) => {
		if (group.id !== IMAGE_STUDIO_GROUP_IDS.profileSettings) return [group]
		if (!color || !capability || capability.type !== 'color-adjustment') return []
		const enabledControlIds = new Set([
			capability.controls.line,
			...(color.background && capability.controls.background
				? [capability.controls.background]
				: []),
		])
		return [
			{ ...group, controls: group.controls.filter(({ id }) => enabledControlIds.has(id)) },
		]
	})
}

function projectEffectiveFeatures(
	manifest: ImageRuntimeManifest,
	features: readonly ImageProfileFeatureSelection[],
): readonly ImageStudioFeature[] {
	return features.map((feature) => {
		if (feature.type === 'reference-image') return { type: 'reference-image' }
		if (feature.type === 'camera-control') {
			const capability = manifest.supportedFeatures.find(
				(candidate) => candidate.type === 'camera-control',
			)
			if (capability?.type !== 'camera-control') {
				throw new Error('Image runtime이 camera-control feature를 지원하지 않습니다.')
			}
			// Admin이 비워 두면 런타임 전체 구간이 곧 사용자 범위다.
			return {
				type: 'camera-control',
				azimuths: feature.azimuths ?? capability.azimuths,
				elevations: feature.elevations ?? capability.elevations,
			}
		}
		const capability = manifest.supportedFeatures.find(
			(candidate) => candidate.type === 'color-adjustment',
		)
		if (capability?.type !== 'color-adjustment') {
			throw new Error('Image runtime이 color-adjustment feature를 지원하지 않습니다.')
		}
		return {
			type: 'color-adjustment',
			controls: {
				line: capability.controls.line,
				...(feature.background && capability.controls.background
					? { background: capability.controls.background }
					: {}),
			},
		}
	})
}

function requireControl<Kind extends ControllerControlDefinition['kind']>(
	config: ImageStudioConfig,
	id: string,
	kind: Kind,
): ControlOfKind<Kind> {
	const control = optionalControl(config, id, kind)
	if (!control) throw new Error(`Image controller에 ${id} ${kind} control이 필요합니다.`)
	return control
}

function optionalControl<Kind extends ControllerControlDefinition['kind']>(
	config: ImageStudioConfig,
	id: string,
	kind: Kind,
): ControlOfKind<Kind> | undefined {
	const control = config.controller.groups
		.flatMap((group) => group.controls)
		.find((candidate) => candidate.id === id)
	if (!control) return undefined
	if (control.kind !== kind) {
		throw new Error(`Image controller의 ${id} control은 ${kind}이어야 합니다.`)
	}
	return control as ControlOfKind<Kind>
}

function record(value: unknown, name: string): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${name}이 객체가 아닙니다.`)
	}
	return value as Record<string, unknown>
}

function assertKeys(value: Record<string, unknown>, allowed: readonly string[]) {
	const allowedKeys = new Set(allowed)
	for (const key of Object.keys(value)) {
		if (!allowedKeys.has(key))
			throw new Error(`ImageStudioConfig에 알 수 없는 필드가 있습니다: ${key}`)
	}
}
