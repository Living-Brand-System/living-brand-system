import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import { mergeTemplateDefaultOverrides } from '@/features/template-customization/domain/template-default-overrides'
import type { TemplateNodeConfigMap } from '@/types/template'

type StoredTemplate = {
	_status?: 'draft' | 'published' | null
	baseHtml?: string | null
	html?: string | null
	overrides?: TemplateNodeConfigMap | null
}

async function readTemplate(id: number, draft: boolean): Promise<StoredTemplate> {
	const response = await fetch(`/api/templates/${id}?depth=0${draft ? '&draft=true' : ''}`)
	if (!response.ok) throw new Error('템플릿을 읽지 못했어요.')
	return (await response.json()) as StoredTemplate
}

/**
 * 스튜디오의 지금 상태를 템플릿 기본값으로 저장한다. Payload REST로 쓰므로 권한(`managerManagedPublishedAccess`)과
 * 저장 검증(`prepareTemplateSave`)은 admin 저장과 같은 자리가 집행한다.
 *
 * 🔑 저장 형태는 admin 레이어 설정과 같다 — `overrides`가 정본이고 `html`은 그것을 base에 다시 합성한 결과다.
 * 🔴 `_status`를 읽은 그대로 되쓴다. 빠뜨리면 최신(초안) 버전을 따라 써 게시 템플릿이 초안으로 떨어진다
 *    (`/api/studio/preview`와 같은 이유·같은 가드).
 */
export async function saveTemplateDefaults({
	templateId,
	sessionOverrides,
	initialText,
}: {
	templateId: number
	sessionOverrides: TemplateNodeConfigMap
	initialText: Readonly<Record<string, string>>
}): Promise<void> {
	const current = await readTemplate(templateId, true)
	if (
		current._status === 'draft' &&
		(await readTemplate(templateId, false))._status === 'published'
	) {
		throw new Error(
			'admin에 발행하지 않은 초안이 있어요. 초안을 발행하거나 되돌린 뒤 다시 저장해 주세요.',
		)
	}
	const base = current.baseHtml || current.html
	if (!base) throw new Error('템플릿 HTML이 없어 저장할 수 없어요.')

	const merged = mergeTemplateDefaultOverrides(
		current.overrides ?? {},
		sessionOverrides,
		initialText,
	)
	if ('blocker' in merged) throw new Error(merged.blocker)

	const response = await fetch(`/api/templates/${templateId}?depth=0`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			overrides: merged.overrides,
			html: composeTemplateHtml(base, merged.overrides),
			_status: current._status,
		}),
	})
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			errors?: { message?: string }[]
		} | null
		throw new Error(body?.errors?.[0]?.message ?? '기본값을 저장하지 못했어요.')
	}
}
