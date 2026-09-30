import {
	CAMERA_AZIMUTHS,
	CAMERA_ELEVATIONS,
	type CameraAzimuth,
	type CameraElevation,
} from '@/features/image-generation/domain/camera-control'
import {
	IMAGE_BATCH_DEFAULT,
	IMAGE_BATCH_SIZES,
	IMAGE_PROMPT_MAX_LENGTH,
} from '@/features/image-generation/domain/image-generation-limits'
import type { ImageModelPreset } from '@/features/image-generation/domain/image-model'
import {
	IMAGE_ASPECT_RATIOS,
	IMAGE_OUTPUT_SIZES,
	supportsImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import type {
	ControllerControlDefinition,
	StudioRuntimeManifest,
} from '@/modules/studio-controller/controller-definition'

export const IMAGE_STUDIO_CONTROL_IDS = {
	prompt: 'prompt',
	batch: 'batch',
	ratio: 'ratio',
	resolution: 'resolution',
	lineColor: 'lineColor',
	backgroundColor: 'backgroundColor',
} as const

export const IMAGE_STUDIO_GROUP_IDS = {
	image: 'image',
	profileSettings: 'profile-settings',
	generationSettings: 'generation-settings',
} as const

export type ImageRuntimeFeature =
	| {
			type: 'color-adjustment'
			controls: { line: string; background?: string }
	  }
	| {
			type: 'camera-control'
			/** 런타임이 지원하는 전체 구간 — Admin은 이 안에서만 좁힐 수 있다. */
			azimuths: readonly CameraAzimuth[]
			elevations: readonly CameraElevation[]
	  }
	/** 사용자가 첨부한 이미지 한 장을 시드로 쓴다. 첨부는 저장하지 않으므로 세부 설정이 없다. */
	| { type: 'reference-image' }

export type ImageRuntimeManifest = StudioRuntimeManifest & {
	supportedFeatures: readonly ImageRuntimeFeature[]
}

/** Generation Model Capability를 Admin 적용 전 Image 원본 계약으로 투영한다. */
export function getImageRuntimeManifest(modelPreset: ImageModelPreset): ImageRuntimeManifest {
	const resolutions = IMAGE_OUTPUT_SIZES.filter((size) =>
		supportsImageOutputSize(modelPreset, size),
	)
	return {
		artifacts: { raster: {}, original: {} },
		controller: {
			groups: [
				{
					id: IMAGE_STUDIO_GROUP_IDS.image,
					title: 'Image',
					controls: [
						{
							id: IMAGE_STUDIO_CONTROL_IDS.prompt,
							kind: 'text',
							label: 'Prompt',
							defaultValue: '',
							multiline: true,
							maxLength: IMAGE_PROMPT_MAX_LENGTH,
							placeholder: '이미지를 설명하세요',
						},
					],
				},
				{
					id: IMAGE_STUDIO_GROUP_IDS.profileSettings,
					title: 'Profile Settings',
					controls: [
						{
							id: IMAGE_STUDIO_CONTROL_IDS.lineColor,
							kind: 'color',
							label: 'Line Color',
							defaultValue: null,
						},
						{
							id: IMAGE_STUDIO_CONTROL_IDS.backgroundColor,
							kind: 'color',
							label: 'Background Color',
							defaultValue: null,
						},
					],
				},
				{
					id: IMAGE_STUDIO_GROUP_IDS.generationSettings,
					title: 'Setting',
					controls: [
						selectControl(
							IMAGE_STUDIO_CONTROL_IDS.batch,
							'장수',
							IMAGE_BATCH_SIZES.map(String),
							String(IMAGE_BATCH_DEFAULT),
						),
						selectControl(
							IMAGE_STUDIO_CONTROL_IDS.ratio,
							'비율',
							IMAGE_ASPECT_RATIOS,
							'2:3',
						),
						selectControl(
							IMAGE_STUDIO_CONTROL_IDS.resolution,
							'해상도',
							resolutions,
							resolutions[0],
						),
					],
				},
			],
		},
		supportedFeatures: [
			{
				type: 'color-adjustment',
				controls: {
					line: IMAGE_STUDIO_CONTROL_IDS.lineColor,
					background: IMAGE_STUDIO_CONTROL_IDS.backgroundColor,
				},
			},
			{ type: 'camera-control', azimuths: CAMERA_AZIMUTHS, elevations: CAMERA_ELEVATIONS },
			{ type: 'reference-image' },
		],
	}
}

function selectControl(
	id: string,
	label: string,
	values: readonly string[],
	defaultValue: string,
): Extract<ControllerControlDefinition, { kind: 'select' }> {
	return {
		id,
		kind: 'select',
		label,
		defaultValue,
		options: values.map((value) => ({ label: value, value })),
	}
}
