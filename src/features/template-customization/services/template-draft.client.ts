import type {
	TemplateBackgroundState,
	TemplateImageSlotState,
} from '@/features/template-customization/contexts/template-studio-context'

/**
 * 편집 중인 화면의 **임시 저장** — 새로고침 정도는 버티게 하는 것이 전부다(사용자 지시, 2026-09-29).
 *
 * 🔑 서버에 두지 않는다. 「내 계정에 귀속되고 남에게 전달될 필요 없다」가 요구의 전부라서,
 *    컬렉션·권한·마이그레이션을 들이면 얻는 것 없이 비용만 는다.
 * 🔴 **자리는 하나뿐이다.** 다른 템플릿을 열면 그 위에 덮여 이전 초안이 사라진다 —
 *    「지금 작업하는 화면만」이 요구였고, 자리를 여럿 두면 「언제 지우나」가 새 규칙이 된다.
 * 🔴 키에 사용자 id를 섞는다. 공용 PC에서 남의 초안이 내 화면에 뜨면 안 된다.
 */

const STORAGE_KEY = 'lbs.templateDraft'

/** 이보다 오래된 초안은 없는 것으로 친다 — 「아예 시간이 오래 지난 건 사라짐」. */
export const TEMPLATE_DRAFT_TTL_MS = 24 * 60 * 60 * 1000

/**
 * 저장하는 것 = 창작자가 넣은 값. 🔴 `generating`·`error`는 **뺀다** —
 * 생성 중에 새로고침하면 영원히 「생성 중」에 갇힌 화면이 복원된다.
 */
export type TemplateDraft = {
	text: Record<string, string>
	textColor: string | null
	vectorColors: Record<string, string | undefined>
	visibility: Record<string, boolean>
	images: Record<string, TemplateImageSlotState>
	background: TemplateBackgroundState
}

type StoredDraft = {
	userId: string
	templateId: string
	savedAt: number
	draft: TemplateDraft
}

/**
 * 휘발 상태를 벗겨 저장 가능한 모양으로. 복원할 때 이 자리들은 초기값으로 되살아난다.
 * 템플릿 「기본 화면」(`defaultSession`)도 같은 모양으로 저장한다.
 */
export function withoutTransientFields(draft: TemplateDraft): TemplateDraft {
	return {
		...draft,
		images: Object.fromEntries(
			Object.entries(draft.images).map(([slotId, state]) => [
				slotId,
				{ ...state, generating: false, error: null },
			]),
		),
		background: { ...draft.background, generating: false, error: null },
	}
}

export function writeTemplateDraft(userId: string, templateId: string, draft: TemplateDraft): void {
	const stored: StoredDraft = {
		userId,
		templateId,
		savedAt: Date.now(),
		draft: withoutTransientFields(draft),
	}
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
	} catch {
		// 사파리 프라이빗·용량 초과에서 던진다. 임시 저장이 안 되는 것이 편집을 막을 이유는 아니다.
	}
}

/**
 * 같은 사용자·같은 템플릿의 초안만 돌려준다. 하나라도 어긋나거나 너무 오래됐으면 null이다.
 * 🔴 모양만 본다 — 값이 지금 계약에 맞는지는 세션이 판단한다(슬롯이 사라진 템플릿 등).
 */
export function readTemplateDraft(userId: string, templateId: string): TemplateDraft | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		const stored = JSON.parse(raw) as Partial<StoredDraft>
		if (stored.userId !== userId || stored.templateId !== templateId) return null
		if (typeof stored.savedAt !== 'number') return null
		if (Date.now() - stored.savedAt > TEMPLATE_DRAFT_TTL_MS) return null
		return toTemplateDraft(stored.draft)
	} catch {
		// 손상된 JSON은 없는 것과 같다.
		return null
	}
}

/**
 * 저장된 값이 초안 모양인지만 본다(임시 초안과 템플릿 기본 화면 공용).
 * 🔴 값이 지금 계약에 맞는지는 세션이 판단한다 — 슬롯이 사라졌으면 `pickKnownSlots`가 거른다.
 */
export function toTemplateDraft(value: unknown): TemplateDraft | null {
	if (!value || typeof value !== 'object') return null
	const draft = value as Partial<TemplateDraft>
	return draft.background ? (draft as TemplateDraft) : null
}

/**
 * 지금 템플릿에 실제로 있는 슬롯의 값만 남긴다 — 템플릿이 바뀐 뒤 돌아오면 사라진 슬롯의 값이
 * 화면 어디에도 나타나지 않으면서 상태에만 남는다.
 */
export function pickKnownSlots<T>(
	saved: Record<string, T> | undefined,
	slotIds: readonly string[],
): Record<string, T> {
	if (!saved) return {}
	return Object.fromEntries(
		slotIds.flatMap((id) => (id in saved ? [[id, saved[id]] as const] : [])),
	)
}
