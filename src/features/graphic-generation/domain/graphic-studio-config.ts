import {
	parseStudioOutputCapability,
	resolveStudioArtifactOutputFormats,
	type StudioOutputCapability,
} from '@/features/studio-export/studio-output'
import {
	parseStudioControllerConfig,
	type StudioControllerConfig,
} from '@/modules/studio-controller/controller-definition'

/**
 * 캔버스 runtime이 쓰는 스튜디오. Graphic과 Graph는 **실행 계약이 같다** — 만드는 대상이 다를 뿐
 * Manifest·Controller·Artifact·Export가 한 벌이라, 두 벌로 복제하면 같은 규칙을 두 번 구현하게 된다.
 * 🔴 갈리는 것은 둘뿐이다: 어떤 runtime이 있나(카탈로그)와 어떤 프로파일이 저장되나(컬렉션).
 */
export const CANVAS_STUDIO_KINDS = ['graphic', 'graph'] as const

export type CanvasStudioKind = (typeof CANVAS_STUDIO_KINDS)[number]

export function isCanvasStudioKind(value: unknown): value is CanvasStudioKind {
	return CANVAS_STUDIO_KINDS.includes(value as CanvasStudioKind)
}

/** Admin 제한 전 P5·Shader runtime이 발행하는 서버 안전 원본 계약. */
export type GraphicRuntimeManifest = StudioControllerConfig<CanvasStudioKind, string> & {
	type: 'p5' | 'shader'
}

/** Published Graphic Profile 정책이 적용된 Effective Config. */
export type GraphicStudioConfig = GraphicRuntimeManifest & {
	output: StudioOutputCapability
}

/** Payload Graphic Profile이 runtime Config를 좁히기 위해 공개하는 서버측 정의. */
export type PublishedGraphicProfileDefinition = {
	id: number
	name: string
	runtime: string
	controllerRestrictions?: unknown
	exportPolicy?: unknown
	controllerPresentation?: unknown
	previewImage?: unknown
}

/** unknown 입력을 공통 Controller 계약과 Graphic runtime descriptor로 검증한다. */
export function parseGraphicRuntimeManifest(input: unknown): GraphicRuntimeManifest {
	const config = parseStudioControllerConfig(input)
	const value = asRecord(input)
	assertOnlyKeys(value, [
		'studio',
		'id',
		'version',
		'name',
		'artifacts',
		'controller',
		'controllerPresentation',
		'type',
	])
	if (!isCanvasStudioKind(config.studio)) {
		throw new Error('GraphicStudioConfig studio: graphic 또는 graph여야 합니다.')
	}
	if (typeof config.id !== 'string') {
		throw new Error('GraphicStudioConfig id: 문자열이어야 합니다.')
	}
	const type = (input as { type?: unknown }).type
	if (type !== 'p5' && type !== 'shader') {
		throw new Error('GraphicStudioConfig type: p5 또는 shader여야 합니다.')
	}
	return input as GraphicRuntimeManifest
}

/** unknown 입력을 Graphic Runtime Manifest와 Effective output까지 검증한다. */
export function parseGraphicStudioConfig(input: unknown): GraphicStudioConfig {
	const config = parseStudioControllerConfig(input)
	const value = asRecord(input)
	assertOnlyKeys(value, [
		'studio',
		'id',
		'version',
		'name',
		'artifacts',
		'output',
		'controller',
		'controllerPresentation',
		'previewImage',
		'type',
	])
	assertGraphicIdentity(config, input)
	const output = parseStudioOutputCapability(value.output)
	resolveStudioArtifactOutputFormats(config.artifacts, output.formats)
	if (output.formats.includes('mp4') && !output.video?.mp4) {
		throw new Error('GraphicStudioConfig MP4 capability가 필요합니다.')
	}
	return input as GraphicStudioConfig
}

function assertGraphicIdentity(
	config: StudioControllerConfig,
	input: unknown,
): asserts config is StudioControllerConfig<CanvasStudioKind, string> {
	if (!isCanvasStudioKind(config.studio)) {
		throw new Error('GraphicStudioConfig studio: graphic 또는 graph여야 합니다.')
	}
	if (typeof config.id !== 'string') {
		throw new Error('GraphicStudioConfig id: 문자열이어야 합니다.')
	}
	const type = (input as { type?: unknown }).type
	if (type !== 'p5' && type !== 'shader') {
		throw new Error('GraphicStudioConfig type: p5 또는 shader여야 합니다.')
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('GraphicStudioConfig가 객체가 아닙니다.')
	}
	return value as Record<string, unknown>
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
	const allowedKeys = new Set(allowed)
	for (const key of Object.keys(value)) {
		if (!allowedKeys.has(key)) {
			throw new Error(`GraphicStudioConfig에 알 수 없는 필드가 있습니다: ${key}`)
		}
	}
}
