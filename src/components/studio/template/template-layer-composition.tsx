'use client'

import { useEffect } from 'react'
import type { TemplateTargetPanel } from '@/components/studio/template/template-panel'
import { sectionProps } from '@/components/studio/template/template-section-focus'
import { TEMPLATE_LAYER_WIDGETS } from '@/components/studio/template/widgets/registry'
import { Typography } from '@/components/ui/typography'
import {
	TEMPLATE_TEXT_SECTION_ID,
	type TemplateFocusTarget,
	type TemplateStudioValue,
} from '@/features/template-customization/contexts/template-studio-context'
import {
	deriveTemplateSymbolComposition,
	deriveTemplateTextComposition,
	templateSymbolColorId,
} from '@/features/template-customization/domain/template-layer-composition'
import { partitionTemplateSlots } from '@/features/template-customization/domain/template-studio-config'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlValue,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

/**
 * 텍스트·심볼 레이어 패널의 배치 정책(docs/10 §3.7) — 색은 위 고정 카드, 입력은 Basic(Figma 529:19461·529:25611).
 */
export const TEMPLATE_LAYER_PANEL_POLICY: StudioPanelPolicy = {
	fixed: ['palette'],
	basic: ['content'],
}

/**
 * 노드에서 오지 않는 섹션의 식별자. 🔴 Figma 노드 id는 `82:11` 꼴이라 이 값과 겹치지 않는다.
 */
/** 텍스트·심볼 레이어의 패널 — 값은 레이어 세션이 갖고, 바꾸기는 세션 액션으로 보낸다(순수, 훅 없음). */
export function buildTemplateLayerPanel(
	kind: 'text' | 'vector',
	{ config, text, vectors, focus }: TemplateStudioValue,
): TemplateTargetPanel {
	const manifest =
		kind === 'text'
			? deriveTemplateTextComposition(config)
			: deriveTemplateSymbolComposition(config)
	const { text: textSlots, vector: vectorSlots } = partitionTemplateSlots(config.template.slots)
	const textColorId = config.template.textColorControlId
	const values: ControllerValues =
		kind === 'text'
			? {
					...Object.fromEntries(
						textSlots.map(
							(slot) => [slot.controlId, text.values[slot.id] ?? null] as const,
						),
					),
					...(textColorId ? { [textColorId]: text.color ?? null } : {}),
				}
			: Object.fromEntries(
					vectorSlots.map(
						(slot) =>
							[
								templateSymbolColorId(slot.id),
								vectors.colors[slot.id] ?? null,
							] as const,
					),
				)
	const onChange = (id: string, next: ControllerControlValue) => {
		if (id === textColorId && (typeof next === 'string' || next === null))
			return text.setColor(next)
		const textSlot = textSlots.find((slot) => slot.controlId === id)
		if (textSlot && typeof next === 'string') return text.setValue(textSlot.id, next)
		const symbol = vectorSlots.find((slot) => templateSymbolColorId(slot.id) === id)
		if (symbol && typeof next === 'string') vectors.setColor(symbol.id, next)
	}
	const textSection: TemplateFocusTarget = {
		sectionId: TEMPLATE_TEXT_SECTION_ID,
		kind: 'nodes',
		// 섹션 헤더를 누르면 이 섹션이 다루는 텍스트 상자를 **전부** 집는다.
		nodeIds: textSlots.map((slot) => slot.id),
	}
	return {
		composition: manifest
			? {
					slots: arrangeStudioPanel(manifest, TEMPLATE_LAYER_PANEL_POLICY, values),
					values,
					onChange,
					presentation: config.controllerPresentation,
					widgets: TEMPLATE_LAYER_WIDGETS,
					groupSection: (group) =>
						group.role === 'content' && kind === 'text'
							? sectionProps(focus, textSection)
							: undefined,
				}
			: null,
		extras:
			kind === 'text' && !textColorId
				? {
						fixed: (
							<Typography size="sm" tone="muted">
								이 템플릿은 원본 텍스트 색상을 사용합니다.
							</Typography>
						),
					}
				: undefined,
	}
}

/** 캔버스에서 글자를 누르면 그 슬롯 입력칸으로 커서를 넘긴다 — 패널 훅(`useTemplatePanel`)이 늘 부른다. */
export function useTextCaretHandoff(target: TemplateFocusTarget | null) {
	useEffect(() => {
		if (target?.kind !== 'nodes' || !target.caret) return
		const [nodeId] = target.nodeIds
		if (!nodeId) return
		const row = Array.from(document.querySelectorAll('[data-text-slot]')).find(
			(candidate) => candidate.getAttribute('data-text-slot') === nodeId,
		)
		const field = row?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')
		if (!field) return
		field.focus()
		/*
		 * 🔴 커서를 글자 **끝**으로 옮긴다. `focus()`만 하면 브라우저는 맨 **앞**에 놓고, 그러면
		 *    누르자마자 친 글자가 기존 글자 앞에 끼어든다 — 「클릭하고 바로 타이핑」이 깨진다.
		 * 🔴 `setSelectionRange`는 `number`·`email`·`date` 입력에서 **예외를 던진다.** 던지는 것을
		 *    try/catch로 삼키면 다음 사람이 왜 감쌌는지 모르므로, 되는 것만 골라서 부른다.
		 */
		if (field instanceof HTMLTextAreaElement || field.type === 'text') {
			field.setSelectionRange(field.value.length, field.value.length)
		}
	}, [target])
}
