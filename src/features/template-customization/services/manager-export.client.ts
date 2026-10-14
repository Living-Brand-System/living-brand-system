import {
	patchTemplate,
	readTemplateFields,
} from '@/features/template-customization/services/template-records.client'
import type { Template } from '@/payload-types'

export type TemplateExportPolicyDoc = NonNullable<Template['exportPolicy']>

/**
 * 출력 설정(`exportPolicy`) 한 칸을 고친다(Manager mode) — 그룹을 통째로 새로 읽어 고친 뒤 통째로 써서 다른 칸을
 * 잃지 않는다. 「제한 없음」은 값 없음이다: 형식은 `[]`, 해상도·프레임·상한은 `null`.
 * 🔴 Runtime보다 넓은 값은 서버(`deriveTemplateStudioConfig`)가 400으로 거부한다.
 */
export async function updateTemplateExportPolicy(
	templateId: number,
	update: (current: TemplateExportPolicyDoc) => TemplateExportPolicyDoc,
): Promise<void> {
	const { exportPolicy } = await readTemplateFields<{ exportPolicy?: Template['exportPolicy'] }>(
		templateId,
		['exportPolicy'],
	)
	await patchTemplate(
		templateId,
		{ exportPolicy: update(exportPolicy ?? {}) },
		'출력 설정을 저장하지 못했어요.',
	)
}
