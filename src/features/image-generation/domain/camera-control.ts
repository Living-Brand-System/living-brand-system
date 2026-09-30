import { z } from 'zod'

/** 시드 이미지에 적용할 절대 시점. 0°는 정면이고 양의 방위각은 피사체 우측으로 회전한다. */
export const cameraControlSchema = z
	.object({
		azimuthDeg: z.number().finite().min(-180).max(180),
		elevationDeg: z.number().finite().min(-30).max(90),
	})
	.strict()

export const imageEffectivePromptSchema = z
	.string()
	.trim()
	.min(2)
	.max(20_000)
	.refine(isFlatPromptJson, 'effectivePrompt must be a JSON object with string values.')

export type CameraControlInput = z.infer<typeof cameraControlSchema>

export type CameraAzimuth =
	| 'front'
	| 'front-right'
	| 'right'
	| 'rear-right'
	| 'rear'
	| 'rear-left'
	| 'left'
	| 'front-left'

export type CameraElevation = 'low' | 'eye-level' | 'elevated' | 'high' | 'top-down'

export interface ResolvedCameraControl {
	azimuth: CameraAzimuth
	elevation: CameraElevation
}

const AZIMUTH_PROMPTS: Record<CameraAzimuth, string> = {
	front: 'front view',
	'front-right': 'front-right three-quarter view',
	right: 'right side view',
	'rear-right': 'rear-right three-quarter view',
	rear: 'rear view',
	'rear-left': 'rear-left three-quarter view',
	left: 'left side view',
	'front-left': 'front-left three-quarter view',
}

const ELEVATION_PROMPTS: Record<CameraElevation, string> = {
	low: 'low-angle camera looking slightly upward',
	'eye-level': 'eye-level camera',
	elevated: 'slightly elevated camera angle',
	high: 'high-angle camera view',
	'top-down': 'top-down overhead view',
}

/** 런타임이 지원하는 전체 구간 — 프롬프트 표에서 파생해 목록이 표와 어긋나지 않게 한다. */
export const CAMERA_AZIMUTHS = Object.keys(AZIMUTH_PROMPTS) as readonly CameraAzimuth[]
export const CAMERA_ELEVATIONS = Object.keys(ELEVATION_PROMPTS) as readonly CameraElevation[]

export function isCameraAzimuth(value: unknown): value is CameraAzimuth {
	return typeof value === 'string' && value in AZIMUTH_PROMPTS
}

export function isCameraElevation(value: unknown): value is CameraElevation {
	return typeof value === 'string' && value in ELEVATION_PROMPTS
}

export function resolveCameraControl({
	azimuthDeg,
	elevationDeg,
}: CameraControlInput): ResolvedCameraControl {
	let azimuth: CameraAzimuth
	if (azimuthDeg >= 157.5 || azimuthDeg < -157.5) azimuth = 'rear'
	else if (azimuthDeg >= 112.5) azimuth = 'rear-right'
	else if (azimuthDeg >= 67.5) azimuth = 'right'
	else if (azimuthDeg >= 22.5) azimuth = 'front-right'
	else if (azimuthDeg >= -22.5) azimuth = 'front'
	else if (azimuthDeg >= -67.5) azimuth = 'front-left'
	else if (azimuthDeg >= -112.5) azimuth = 'left'
	else azimuth = 'rear-left'

	let elevation: CameraElevation
	if (elevationDeg >= 70) elevation = 'top-down'
	else if (elevationDeg >= 40) elevation = 'high'
	else if (elevationDeg >= 15) elevation = 'elevated'
	else if (elevationDeg >= -10) elevation = 'eye-level'
	else elevation = 'low'

	return { azimuth, elevation }
}

export function composeCameraAdjustmentPrompt(
	effectivePrompt: string,
	camera: ResolvedCameraControl,
): string {
	const prompt = JSON.parse(effectivePrompt) as Record<string, string>
	return JSON.stringify({
		...prompt,
		camera: `${AZIMUTH_PROMPTS[camera.azimuth]}, ${ELEVATION_PROMPTS[camera.elevation]}`,
		camera_rules:
			'The camera field overrides every previous camera angle or view instruction. Use the input image as the identity and style reference. Change only the viewpoint. Preserve the subject, proportions, colors, materials, illustration style, and background treatment. Do not add or remove objects, text, or logos.',
	})
}

function isFlatPromptJson(value: string): boolean {
	try {
		const parsed = JSON.parse(value)
		return (
			typeof parsed === 'object' &&
			parsed !== null &&
			!Array.isArray(parsed) &&
			Object.values(parsed).every((item) => typeof item === 'string')
		)
	} catch {
		return false
	}
}
