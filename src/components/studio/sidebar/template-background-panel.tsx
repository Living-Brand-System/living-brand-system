'use client'

import { BackgroundSection } from '@/components/studio/template/background-section'
import {
	findTemplateControl,
	findTemplateControlGroup,
	partitionTemplateSlots,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/**
 * 배경 레이어의 컨트롤 — **레이어 패널에서 배경을 고르면 나온다**(사용자 지시, 2026-09-10).
 *
 * 🔴 배경도 레이어 한 줄이고, 그래서 컨트롤도 다른 레이어와 같은 자리(우측)에 온다. 앞 판에서는
 *    「판 전체에 걸리는 것」이라 좌측에 뒀는데 사용자가 바꿨다 — 고를 수 있는 레이어인데 컨트롤이
 *    딴 곳에 있으면 고른 결과가 어디 나오는지 알 수 없다.
 * 🔴 **자기 위치를 모른다.** 값을 prop으로 받지 않고 컨텍스트에서 직접 읽으므로 좌·우 어디에
 *    꽂아도 그대로 돈다 — 위치를 정하는 코드는 꽂는 자리 한 줄뿐이다.
 * 🔑 정책이 배경 컨트롤을 안 내주는 템플릿에서는 아무것도 그리지 않는다(`null`).
 */
export function TemplateBackgroundPanel() {
	const { config, background, focus } = useTemplateStudio()
	const { background: slot } = partitionTemplateSlots(config.template.slots)

	const typeControl = slot ? findTemplateControl(config, slot.typeControlId) : undefined
	const colorControl = slot ? findTemplateControl(config, slot.colorControlId) : undefined
	const dimmerControl = slot ? findTemplateControl(config, slot.dimmerControlId) : undefined
	const dimmerOpacityControl = slot
		? findTemplateControl(config, slot.dimmerOpacityControlId)
		: undefined
	const group = slot ? findTemplateControlGroup(config, slot.typeControlId) : undefined

	if (!(slot && group && typeControl?.kind === 'select' && colorControl?.kind === 'color'))
		return null

	return (
		<BackgroundSection
			section={sectionFocus(focus)}
			groupDefinition={group}
			groupPresentation={config.controllerPresentation?.groups.find(
				({ groupId }) => groupId === group.id,
			)}
			typeDefinition={typeControl}
			colorDefinition={colorControl}
			dimmerDefinition={dimmerControl?.kind === 'toggle' ? dimmerControl : undefined}
			dimmerOpacityDefinition={
				dimmerOpacityControl?.kind === 'range' ? dimmerOpacityControl : undefined
			}
			imageContracts={background.contracts}
			featureBindings={background.featureBindings}
			graphicConfigs={background.graphicConfigs}
			graphicBindings={background.graphicBindings}
			value={background.state}
			onChange={background.update}
			onColorChange={(next) => {
				if (typeof next === 'string' || next === null) background.setColor(next)
			}}
			onTypeChange={background.selectType}
			onFeatureChange={background.updateFeature}
			onImageProfileChange={background.selectImageProfile}
			onSelectSampleImage={background.selectSampleImage}
			onGraphicConfigChange={background.selectGraphicConfig}
			onGraphicChange={background.updateGraphic}
			onGenerate={background.generate}
		/>
	)
}

/**
 * 배경 섹션의 강조·포커스 배선 — 사이드바의 `sectionProps`와 **같은 형태여야 한다.**
 * 🔴 `onDeactivate` 같은 이름을 새로 만들면 킷이 안 읽고 조용히 아무 일도 안 한다.
 *    행 포커스는 `onFocusCapture`/`onBlurCapture`다(맨 `div`에 `active`를 주면 React가 경고한다).
 */
function sectionFocus(focus: ReturnType<typeof useTemplateStudio>['focus']) {
	const target = { sectionId: 'section:background', kind: 'canvas' } as const
	return {
		active: focus.target?.sectionId === target.sectionId,
		onActivate: () => focus.set(target),
		onFocusCapture: () => focus.set(target),
		onBlurCapture: () => {
			if (focus.target?.sectionId === target.sectionId) focus.set(null)
		},
	}
}
