import type { TemplateNodeConfig, TemplateSlotSpec } from '@/types/template'

/**
 * Manager mode 텍스트 칸 폼이 고치는 값 — 입력 중인 글자 그대로 들고, 저장할 때 노드 설정(`overrides[nodeId]`)으로 바꾼다.
 * admin 레이어 편집기(이름·내용·세부 설정)와 같은 자리를 같은 규칙으로 쓴다: 빈 칸은 「없음」이다.
 * 🔑 이름은 하나다 — 레이어 이름(`label`)이 칸 이름까지 맡는다(사용자 2026-10-14). 그래서 칸 이름(`input.label`)은 늘 걷는다.
 * AI 지침·최대 글자·최대 줄은 폼에서 뺐다 — 있던 값은 건드리지 않고 그대로 둔다.
 */
export type TextSlotDraft = {
	/** 레이어 이름(`label`) — 기능 역할(`TEXT_LAYER_ROLES`)이나 직접 적은 이름. 비우면 Figma 이름. */
	layerLabel: string
	placeholder: string
	inputFormat: NonNullable<TemplateSlotSpec['inputFormat']>
	/** 기본 문구(`text`) — 비우면 Figma 문구. */
	text: string
}

/** 텍스트 레이어 이름으로 고를 기능 역할 — 목록에 없으면 「기타」로 직접 적는다(사용자 2026-10-14). */
export const TEXT_LAYER_ROLES = [
	'Title',
	'Subtitle',
	'Body',
	'Caption',
	'Label',
	'Date',
	'Address',
] as const

export const TEXT_INPUT_FORMATS = [
	{ value: 'free', label: '자유' },
	{ value: 'number', label: '숫자' },
	{ value: 'email', label: '이메일' },
	{ value: 'date', label: '날짜' },
] as const satisfies readonly { value: TextSlotDraft['inputFormat']; label: string }[]

export function toTextSlotDraft(config: TemplateNodeConfig): TextSlotDraft {
	const input = config.input ?? {}
	return {
		layerLabel: config.label ?? '',
		placeholder: input.placeholder ?? '',
		inputFormat: input.inputFormat ?? 'free',
		text: config.text ?? '',
	}
}

/**
 * 고친 값을 노드 설정에 얹는다. 이름·안내는 앞뒤 공백을 걷는다(공백뿐이면 빈 칸). 기본 문구는 그대로 쓴다.
 * 🔴 서버 검증(parse-template-node-configs)이 strict라 `input`에는 계약에 있는 키만 담는다.
 */
export function applyTextSlotDraft(
	config: TemplateNodeConfig,
	draft: TextSlotDraft,
): TemplateNodeConfig {
	const { label: _fieldName, ...kept } = config.input ?? {}
	const input: TemplateSlotSpec = {
		...kept,
		placeholder: draft.placeholder.trim() || undefined,
		inputFormat: draft.inputFormat === 'free' ? undefined : draft.inputFormat,
	}
	return {
		...config,
		label: draft.layerLabel.trim() || undefined,
		text: draft.text || undefined,
		input: Object.fromEntries(
			Object.entries(input).filter(([, value]) => value !== undefined),
		) as TemplateSlotSpec,
	}
}
