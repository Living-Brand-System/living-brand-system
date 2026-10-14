import type {
	TemplateBackgroundPolicy,
	TemplateBackgroundType,
} from '@/features/template-customization/domain/template-studio-config'
import { TEMPLATE_BACKGROUND_TYPES } from '@/features/template-customization/domain/template-studio-config'
import {
	patchTemplate,
	readTemplateFields,
} from '@/features/template-customization/services/template-records.client'

/** 배경 형식의 고정 순서 — 정본은 도메인의 TEMPLATE_BACKGROUND_TYPES다. */
export const BACKGROUND_TYPES: readonly TemplateBackgroundType[] = TEMPLATE_BACKGROUND_TYPES

/** 저장된 JSON을 정책으로 읽는다 — admin 배경 설정 칸의 `readPolicy`와 같다(배열이 아닌 types는 「전부 허용」). */
export function readBackgroundPolicy(value: unknown): TemplateBackgroundPolicy {
	const policy = value && typeof value === 'object' ? (value as TemplateBackgroundPolicy) : {}
	return Array.isArray(policy.types) ? policy : { ...policy, types: undefined }
}

/**
 * 허용 형식을 바꾼다 — 순서는 고정 순서로 맞추고, 끈 형식이 처음 형식이면 처음 형식을 지운다.
 * 하나도 안 남으면 `null`(거부) — 형식이 비면 `buildBackgroundGroup`이 던지고 저장이 400으로 막힌다.
 */
export function withBackgroundTypes(
	policy: TemplateBackgroundPolicy,
	types: readonly TemplateBackgroundType[],
): TemplateBackgroundPolicy | null {
	const ordered = BACKGROUND_TYPES.filter((type) => types.includes(type))
	if (ordered.length === 0) return null
	const keepDefault = policy.defaultType && ordered.includes(policy.defaultType)
	return { ...policy, types: ordered, defaultType: keepDefault ? policy.defaultType : undefined }
}

/**
 * 배경 정책을 최신 초안 기준으로 읽어 고친 뒤 되쓴다(Manager mode). 렌더 html과 무관해 재합성하지 않는다.
 * `_status` 보존은 `patchTemplate`이 한다.
 */
export async function updateTemplateBackgroundPolicy(
	templateId: number,
	update: (policy: TemplateBackgroundPolicy) => TemplateBackgroundPolicy,
): Promise<void> {
	const { backgroundPolicy } = await readTemplateFields<{ backgroundPolicy?: unknown }>(
		templateId,
		['backgroundPolicy'],
	)
	await patchTemplate(
		templateId,
		{ backgroundPolicy: update(readBackgroundPolicy(backgroundPolicy)) },
		'배경 설정을 저장하지 못했어요.',
	)
}
