import {
	type TemplateDraft,
	withoutTransientFields,
} from '@/features/template-customization/services/template-draft.client'
import { patchTemplate } from '@/features/template-customization/services/template-records.client'

/**
 * 스튜디오의 지금 화면을 템플릿 「기본 화면」(`defaultSession`)으로 저장한다 — 모든 사용자의 스튜디오가
 * 이 화면으로 시작한다. Payload REST로 쓰므로 권한(`managerManagedPublishedAccess`)과 검증은 서버가 집행한다.
 *
 * 🔑 화면 상태를 통째로 저장한다. 노드 설정(`overrides`)에 옮겨 담으면 배경·숨김·샘플 이미지처럼 담을
 *    자리가 없는 값이 조용히 빠진다(2026-10-07에 실제로 「저장했는데 안 남는」 것으로 드러났다).
 */
export function saveTemplateDefaults({
	templateId,
	session,
}: {
	templateId: number
	session: TemplateDraft
}): Promise<void> {
	return patchTemplate(
		templateId,
		{ defaultSession: withoutTransientFields(session) },
		'기본값을 저장하지 못했어요.',
	)
}
