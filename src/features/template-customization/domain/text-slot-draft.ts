import type { TemplateNodeConfig, TemplateSlotSpec } from '@/types/template'

/**
 * Manager mode 텍스트 칸 폼이 고치는 값 — 입력 중인 글자 그대로 들고, 저장할 때 노드 설정(`overrides[nodeId]`)으로 바꾼다.
 * admin 레이어 편집기(이름·내용·세부 설정)와 같은 자리를 같은 규칙으로 쓴다: 빈 칸은 「없음」이다.
 */
export type TextSlotDraft = {
	/** 레이어 이름(`label`) — 비우면 Figma 이름. */
	layerLabel: string
	label: string
	placeholder: string
	inputFormat: NonNullable<TemplateSlotSpec['inputFormat']>
	maxLength: string
	maxLines: string
	aiInstruction: string
	/** 기본 문구(`text`) — 비우면 Figma 문구. */
	text: string
}

export function toTextSlotDraft(config: TemplateNodeConfig): TextSlotDraft {
	const input = config.input ?? {}
	return {
		layerLabel: config.label ?? '',
		label: input.label ?? '',
		placeholder: input.placeholder ?? '',
		inputFormat: input.inputFormat ?? 'free',
		maxLength: input.maxLength?.toString() ?? '',
		maxLines: input.maxLines?.toString() ?? '',
		aiInstruction: input.aiInstruction ?? '',
		text: config.text ?? '',
	}
}

/** 최대 글자·줄 칸 — 비우면 제한 없음(`undefined`), 1 이상의 정수가 아니면 `null`(저장하지 않는다). */
export function parseSlotCount(raw: string): number | undefined | null {
	const value = raw.trim()
	if (!value) return undefined
	return /^[1-9]\d*$/.test(value) ? Number(value) : null
}

/**
 * 고친 값을 노드 설정에 얹는다. 숫자 칸이 틀리면 `null` — 조용히 「제한 없음」으로 바꾸지 않는다.
 * 이름·안내·지침은 앞뒤 공백을 걷는다(공백뿐이면 빈 칸 — Layers 폼의 이름 바꾸기와 같다). 기본 문구는 그대로 쓴다.
 * 🔴 서버 검증(parse-template-node-configs)이 strict라 `input`에는 계약에 있는 키만 담는다.
 */
export function applyTextSlotDraft(
	config: TemplateNodeConfig,
	draft: TextSlotDraft,
): TemplateNodeConfig | null {
	const maxLength = parseSlotCount(draft.maxLength)
	const maxLines = parseSlotCount(draft.maxLines)
	if (maxLength === null || maxLines === null) return null
	const input: TemplateSlotSpec = {
		label: draft.label.trim() || undefined,
		placeholder: draft.placeholder.trim() || undefined,
		inputFormat: draft.inputFormat === 'free' ? undefined : draft.inputFormat,
		maxLength,
		maxLines,
		aiInstruction: draft.aiInstruction.trim() || undefined,
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
