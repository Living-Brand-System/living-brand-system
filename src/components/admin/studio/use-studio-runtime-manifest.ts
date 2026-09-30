'use client'

import { useFormFields } from '@payloadcms/ui'
import { getDataByPath } from 'payload/shared'
import {
	DEFAULT_IMAGE_MODEL_PRESET,
	type ImageModelPreset,
} from '@/features/image-generation/domain/image-model'
import { getImageRuntimeManifest } from '@/features/image-generation/domain/image-runtime-manifest'
import { deriveImageProfileController } from '@/features/image-generation/domain/image-studio-config'
import {
	getTemplateRuntimeManifest,
	type TemplateBackgroundPolicy,
} from '@/features/template-customization/domain/template-studio-config'
import type {
	StudioKind,
	StudioRuntimeManifest,
} from '@/modules/studio-controller/controller-definition'
import type { TemplateNodeConfigMap } from '@/types/template'

export type StudioAdminRuntimeSource = StudioKind

export type StudioAdminBaseConfig = StudioRuntimeManifest & { id: string }

/** 현재 Admin form 값에서 Controller와 output이 함께 소비할 Base Runtime Manifest를 만든다. */
export function useStudioRuntimeManifest(
	source: StudioAdminRuntimeSource,
	baseConfigs: readonly StudioAdminBaseConfig[],
): StudioRuntimeManifest | null {
	const runtime = useFormFields(([fields]) => fields.runtime?.value) as string | undefined
	const imageModelPreset =
		(useFormFields(([fields]) => fields.imageModelPreset?.value) as
			| ImageModelPreset
			| undefined) ?? DEFAULT_IMAGE_MODEL_PRESET
	const imageFeatures = useFormFields(([fields]) => getDataByPath(fields, 'features'))
	const html = (useFormFields(([fields]) => fields.html?.value) as string | undefined) ?? ''
	const nodeConfigs = (useFormFields(([fields]) => fields.overrides?.value) ??
		{}) as TemplateNodeConfigMap
	// 캔버스 크기가 MP4 상한이므로 Admin의 export policy UI도 같은 값을 읽어야 한다.
	const width = useFormFields(([fields]) => fields.width?.value) as number | undefined
	const height = useFormFields(([fields]) => fields.height?.value) as number | undefined
	const backgroundPolicy = useFormFields(([fields]) => fields.backgroundPolicy?.value) as
		| TemplateBackgroundPolicy
		| undefined

	if (source === 'graphic') {
		return baseConfigs.find((config) => config.id === runtime) ?? null
	}
	if (source === 'image') {
		return {
			...getImageRuntimeManifest(imageModelPreset),
			controller: deriveImageProfileController(imageModelPreset, imageFeatures, undefined),
		}
	}
	try {
		// 배경 정책이 형식을 전부 비우면 파생이 던진다(도메인 계약) — 어드민에서 손으로 심은
		// 값이 그 상태를 만들 수 있으므로, 던지는 대신 null을 돌려 폼이 흰 화면이 되지 않고
		// 소비 필드들의 기존 빈 상태 UI로 대체되게 한다. 조용한 실패를 막기 위해 콘솔에 남긴다.
		return getTemplateRuntimeManifest({ html, nodeConfigs, width, height, backgroundPolicy })
	} catch (error) {
		console.error(error)
		return null
	}
}
