import {
	type TemplateDraft,
	withoutTransientFields,
} from '@/features/template-customization/services/template-draft.client'

async function readStatus(id: number, draft: boolean): Promise<string | null | undefined> {
	const response = await fetch(`/api/templates/${id}?depth=0${draft ? '&draft=true' : ''}`)
	if (!response.ok) throw new Error('템플릿을 읽지 못했어요.')
	return ((await response.json()) as { _status?: string | null })._status
}

/**
 * 스튜디오의 지금 화면을 템플릿 「기본 화면」(`defaultSession`)으로 저장한다 — 모든 사용자의 스튜디오가
 * 이 화면으로 시작한다. Payload REST로 쓰므로 권한(`managerManagedPublishedAccess`)과 검증은 서버가 집행한다.
 *
 * 🔑 화면 상태를 통째로 저장한다. 노드 설정(`overrides`)에 옮겨 담으면 배경·숨김·샘플 이미지처럼 담을
 *    자리가 없는 값이 조용히 빠진다(2026-10-07에 실제로 「저장했는데 안 남는」 것으로 드러났다).
 * 🔴 `_status`를 읽은 그대로 되쓴다. 빠뜨리면 최신(초안) 버전을 따라 써 게시 템플릿이 초안으로 떨어진다
 *    (`/api/studio/preview`와 같은 이유·같은 가드).
 */
export async function saveTemplateDefaults({
	templateId,
	session,
}: {
	templateId: number
	session: TemplateDraft
}): Promise<void> {
	const status = await readStatus(templateId, true)
	if (status === 'draft' && (await readStatus(templateId, false)) === 'published') {
		throw new Error(
			'admin에 발행하지 않은 초안이 있어요. 초안을 발행하거나 되돌린 뒤 다시 저장해 주세요.',
		)
	}

	const response = await fetch(`/api/templates/${templateId}?depth=0`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ defaultSession: withoutTransientFields(session), _status: status }),
	})
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			errors?: { message?: string }[]
		} | null
		throw new Error(body?.errors?.[0]?.message ?? '기본값을 저장하지 못했어요.')
	}
}
