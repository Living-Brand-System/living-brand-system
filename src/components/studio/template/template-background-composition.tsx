'use client'

import type { ControlPanelComposition } from '@/components/studio/shared/control-panel'
import { TEMPLATE_LAYER_WIDGETS } from '@/components/studio/template/template-layer-composition'
import type { TemplateStudioValue } from '@/features/template-customization/contexts/template-studio-context'
import {
	deriveTemplateBackgroundComposition,
	TEMPLATE_BACKGROUND_IMAGE_MODE_ID,
} from '@/features/template-customization/domain/template-background-composition'
import {
	partitionTemplateSlots,
	type TemplateBackgroundType,
} from '@/features/template-customization/domain/template-studio-config'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlValue,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

/**
 * 템플릿 편집(배경) 패널의 배치 정책 — 역할을 자리에 놓는다(docs/10 §3.7). 매니페스트는 이것을 모른다.
 * 방식(source)은 왼쪽 설정 카드, 가독성 층(overlay)은 오른쪽 위 고정 카드, 색(palette)은 Basic.
 */
export const TEMPLATE_BACKGROUND_PANEL_POLICY: StudioPanelPolicy = {
	settings: ['source'],
	fixed: ['overlay'],
	basic: ['palette'],
}

/**
 * 배경 세션을 패널 컴포지션으로 잇는다 — 값은 세션이 갖고, 바꾸기는 세션 액션으로 보낸다(순수, 훅 없음).
 * 오른쪽 패널(Dimming·색)과 왼쪽 설정 카드(방식)가 같은 결과를 쓴다. 배경 슬롯이 없는 템플릿이면 `null`이다.
 */
export function buildTemplateBackgroundComposition({
	config,
	background,
	focus,
}: TemplateStudioValue): ControlPanelComposition | null {
	const manifest = deriveTemplateBackgroundComposition(config)
	const slot = partitionTemplateSlots(config.template.slots).background
	if (!manifest || !slot) return null
	const state = background.state
	const values: ControllerValues = {
		[slot.typeControlId]: state.type,
		[TEMPLATE_BACKGROUND_IMAGE_MODE_ID]: state.imageMode,
		[slot.colorControlId]: state.color,
		[slot.dimmerControlId]: state.dimmer,
		[slot.dimmerOpacityControlId]: state.dimmerOpacity,
	}
	const onChange = (id: string, next: ControllerControlValue) => {
		if (id === slot.typeControlId && typeof next === 'string')
			background.selectType(next as TemplateBackgroundType)
		else if (
			id === TEMPLATE_BACKGROUND_IMAGE_MODE_ID &&
			(next === 'preset' || next === 'generate')
		)
			background.update({ imageMode: next })
		else if (id === slot.colorControlId && (typeof next === 'string' || next === null))
			background.setColor(next)
		else if (id === slot.dimmerControlId && typeof next === 'boolean')
			background.update({ dimmer: next })
		else if (id === slot.dimmerOpacityControlId && typeof next === 'number')
			background.update({ dimmerOpacity: next })
	}
	return {
		slots: arrangeStudioPanel(manifest, TEMPLATE_BACKGROUND_PANEL_POLICY, values),
		values,
		onChange,
		// 배경색은 텍스트·심볼 색과 같은 스와치 위젯이 그린다.
		widgets: TEMPLATE_LAYER_WIDGETS,
		// 배경색을 만지면 캔버스가 도화지를 짚는다 — 지금 「Background」 그룹의 활성화 배선 그대로.
		groupSection: (group) =>
			group.id === 'background-color'
				? {
						active: focus.target?.kind === 'canvas',
						onActivate: () =>
							focus.set({ sectionId: 'section:background', kind: 'canvas' }),
					}
				: undefined,
	}
}
