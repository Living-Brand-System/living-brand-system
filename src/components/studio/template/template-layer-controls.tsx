'use client'

import { useEffect } from 'react'
import { Controller } from '@/components/shared/controller'
import {
	CONTROLLER_TOGGLE_OPTIONS,
	ControllerControlRenderer,
	ControllerGroupRenderer,
} from '@/components/shared/controller-renderer'
import { ImageSlotInput } from '@/components/studio/template/image-slot-input'
import {
	IMAGE_TRANSFORM_DEFAULT,
	ImageTransformControl,
} from '@/components/studio/template/image-transform-control'
import { TemplateBackgroundPanel } from '@/components/studio/template/template-background-panel'
import { TemplateColorSwatches } from '@/components/studio/template/template-color-swatches'
import {
	rowFocusProps,
	sectionProps,
	subsectionProps,
} from '@/components/studio/template/template-section-focus'
import { TextSlotInput } from '@/components/studio/template/text-slot-input'
import { Typography } from '@/components/ui/typography'
import { usePublishedBrandColorValues } from '@/features/template-core/hooks/use-published-brand-color-values'
import type { TemplateFocusTarget } from '@/features/template-customization/contexts/template-studio-context'
import {
	findTemplateControl,
	findTemplateControlGroup,
	partitionTemplateSlots,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

/**
 * 노드에서 오지 않는 섹션의 식별자. 🔴 Figma 노드 id는 `82:11` 꼴이라 이 값과 겹치지 않는다.
 * 배경은 노드가 아니라 도화지를 집으므로 `kind: 'canvas'`다.
 */
const TEXT_SECTION_ID = 'section:text'

export function TemplateLayerControls({
	grouped = false,
	separateSettings = false,
}: {
	grouped?: boolean
	separateSettings?: boolean
}) {
	const { config, text, images, vectors, layers, focus } = useTemplateStudio()
	const { values: brandColorValues } = usePublishedBrandColorValues()
	useTextCaretHandoff(focus.target)
	// 🔑 배경도 여기다 — 레이어 패널의 한 줄이므로 컨트롤도 다른 레이어와 같은 자리에 온다.
	const { text: textSlots, image: imageSlots } = partitionTemplateSlots(config.template.slots)
	/**
	 * 🔴 **평소에는 아무 컨트롤도 보여주지 않는다.** 레이어 패널에서 레이어를 고른 그 순간에만
	 *    그 레이어의 컨트롤이 나온다(사용자 지시, 2026-09-10) — 우측이 「너무 많다」는 것은
	 *    모든 슬롯의 컨트롤이 동시에 펼쳐져 있어서다.
	 * 🔑 운영 Studio의 기본 선택 단위는 레이어 하나다. Playground의 grouped 모드에서는
	 *    선택한 슬롯과 같은 종류의 컨트롤을 함께 열고 표시·숨김은 왼쪽 묶음 행이 담당한다.
	 * 🔴 `focus`를 보지 않는다. `focus`는 「지금 만지는 자리」라 입력칸에 커서가 들어가면
	 *    대상이 바뀌고, 그것을 선택으로 읽으면 **글자를 치는 순간 컨트롤이 통째로 사라진다.**
	 *    선택은 레이어 패널만 바꾸는 별개 상태다.
	 */
	const selectedKind = config.template.slots.find((slot) => slot.id === layers.selectedId)?.kind
	const showsLayer = (slotId: string) =>
		grouped
			? selectedKind !== undefined &&
				config.template.slots.some(
					(slot) => slot.id === slotId && slot.kind === selectedKind,
				)
			: layers.selectedId === slotId
	const textGroup = textSlots[0]
		? findTemplateControlGroup(config, textSlots[0].controlId)
		: undefined
	const textColorControl = config.template.textColorControlId
		? findTemplateControl(config, config.template.textColorControlId)
		: undefined

	return (
		<Controller.GroupList>
			{/* 🔴 텍스트 색은 그룹 공용이라 필터를 타지 않는다 — 행이 전부 걸러지면 그룹이 껍데기로
				    남아 `Color`만 뜬다. 보일 행이 하나도 없으면 그룹째 접는다. */}
			{textSlots.some((slot) => showsLayer(slot.id)) && textGroup && (
				<ControllerGroupRenderer
					definition={textGroup}
					section={sectionProps(focus, {
						sectionId: TEXT_SECTION_ID,
						kind: 'nodes',
						// 섹션 헤더를 누르면 이 섹션이 다루는 텍스트 상자를 **전부** 집는다.
						nodeIds: textSlots.map((slot) => slot.id),
					})}
					presentation={config.controllerPresentation?.groups.find(
						({ groupId }) => groupId === textGroup.id,
					)}
				>
					{textSlots.map((slot) => {
						const definition = findTemplateControl(config, slot.controlId)
						if (definition?.kind !== 'text') return null
						return (
							<div
								key={slot.id}
								data-text-slot={slot.id}
								className="flex flex-col gap-1"
								{...rowFocusProps(focus, {
									sectionId: TEXT_SECTION_ID,
									kind: 'nodes',
									nodeIds: [slot.id],
								})}
							>
								<LayerVisibilityControl
									label={slot.label}
									visible={layers.visibility[slot.id] ?? true}
									allowToggle={!grouped && slot.visibility.allowToggle}
									onChange={(visible) => layers.setVisible(slot.id, visible)}
								/>
								<TextSlotInput
									definition={definition}
									input={slot.input}
									value={text.values[slot.id] ?? definition.defaultValue ?? ''}
									onChange={(next) => text.setValue(slot.id, next)}
								/>
								{!separateSettings && text.clippedSlotIds.has(slot.id) && (
									<Typography role="status" size="xs" tone="muted">
										입력한 텍스트가 박스를 넘어 일부가 잘려 보여요.
									</Typography>
								)}
							</div>
						)
					})}
					{!separateSettings && textColorControl?.kind === 'color' && (
						<ControllerControlRenderer
							definition={textColorControl}
							value={text.color}
							onChange={(next) => {
								if (typeof next === 'string' || next === null) text.setColor(next)
							}}
						/>
					)}
				</ControllerGroupRenderer>
			)}
			{imageSlots.map((slot, index) => {
				const topicTitle = imageSlots.length > 1 ? `Image ${index + 1}` : 'Image'
				const state = images.states[slot.id]
				const contracts = images.contracts[slot.id] ?? []
				if (!state) return null
				if (!showsLayer(slot.id)) return null
				return (
					<Controller.Group
						key={slot.id}
						title={topicTitle}
						collapsible
						{...sectionProps(focus, slotTarget(slot.id))}
					>
						<LayerVisibilityControl
							label={slot.label}
							visible={layers.visibility[slot.id] ?? true}
							allowToggle={!grouped && slot.visibility.allowToggle}
							onChange={(visible) => layers.setVisible(slot.id, visible)}
						/>
						<ImageSlotInput
							showMode={!separateSettings}
							pinned={slot.imageConfig.mode === 'pinned'}
							readonly={slot.access === 'readonly'}
							contracts={contracts}
							value={state}
							onFeatureChange={(controlId, next) =>
								images.updateFeature(slot.id, controlId, next)
							}
							onProfileChange={(profileId) =>
								images.selectProfile(slot.id, profileId)
							}
							onPromptChange={(prompt) => images.update(slot.id, { prompt })}
							onImageModeChange={(imageMode) => images.update(slot.id, { imageMode })}
							onSelectSampleImage={(option) =>
								images.selectSampleImage(slot.id, option)
							}
							onGenerate={() => images.generate(slot.id)}
							section={subsectionProps(focus, slotTarget(slot.id))}
						/>
						{/* 디자인 SSOT(1:1838): Image Transform은 구분선 없는 섹션이다. 대상 슬롯에 종속되므로
						    슬롯 그룹 안에 두고 함께 접는다. 생성 전에는 닫힌 채 잠긴다 — compose가 배정된
						    이미지에만 transform을 적용해서다. */}
						{slot.transform.enabled && (
							<Controller.Group
								title={`${topicTitle} Transform`}
								collapsible
								attached
								{...subsectionProps(focus, slotTarget(slot.id))}
								disabled={slot.access === 'readonly' || !state?.image}
							>
								<ImageTransformControl
									value={state?.transform ?? IMAGE_TRANSFORM_DEFAULT}
									// compose는 배정된 이미지에만 transform을 적용한다 — 생성 전에는 비활성.
									disabled={slot.access === 'readonly' || !state?.image}
									limits={slot.transform.limits}
									// 패드는 대상 슬롯 박스와 같은 비율로 그려진다(디자인 Wide/Portrait/Square).
									aspectRatio={
										slot.box.width && slot.box.height
											? slot.box.width / slot.box.height
											: undefined
									}
									onChange={(transform) => images.update(slot.id, { transform })}
								/>
							</Controller.Group>
						)}
					</Controller.Group>
				)
			})}
			{vectors.slots.map((slot) => {
				const color = vectors.colors[slot.id]
				if (!showsLayer(slot.id)) return null
				return (
					<Controller.Group
						key={slot.id}
						title={slot.label}
						collapsible
						{...sectionProps(focus, slotTarget(slot.id))}
					>
						<LayerVisibilityControl
							label={slot.label}
							visible={layers.visibility[slot.id] ?? true}
							allowToggle={!grouped && slot.visibility.allowToggle}
							onChange={(visible) => layers.setVisible(slot.id, visible)}
						/>
						{/* 심볼은 브랜드 색만 허용한다 — 텍스트의 고정 팔레트처럼 Custom을 열지 않는다. */}
						<TemplateColorSwatches
							subject={slot.label}
							colors={brandColorValues}
							value={color}
							onChange={(next) => vectors.setColor(slot.id, next)}
							disabled={slot.access === 'readonly' || brandColorValues.length === 0}
						/>
					</Controller.Group>
				)
			})}
			{showsLayer('background') && (
				<TemplateBackgroundPanel content={separateSettings ? 'controls' : 'all'} />
			)}
		</Controller.GroupList>
	)
}

/**
 * 슬롯 하나를 「지금 만지는 것」으로 캔버스에 알리는 핸들러.
 *
 * 🔑 그룹 래퍼에 capture로 단다 — 안쪽 컨트롤이 몇 개든(Transform 하위 그룹까지) 한 자리에서
 *    잡히고, 컨트롤마다 배선을 더할 필요가 없다.
 * ponytail: 포커스만 본다. hover도 켜면 「마우스는 나갔지만 포커스는 남아 있다」를 가르는 조건이
 *   필요해지고(활성 요소 포함 검사) 얻는 것은 발견성뿐이다 — 필요해지면 `onPointerEnter`와
 *   `contains(document.activeElement)` 가드 두 줄이다.
 */
/**
 * 섹션 하나(또는 그 안의 한 행)를 「지금 만지는 것」으로 알리는 배선.
 *
 * 🔑 **네 섹션이 모두 같은 함수를 쓴다.** 전에는 슬롯 하나를 가리키는 배선이라 Text(슬롯 여럿)와
 *    Background(노드 없음)에서 성립하지 않았다 — 그래서 `TemplateFocusTarget`이 섹션 식별자와
 *    집을 대상을 따로 갖는다.
 * 🔑 `onActivate`를 주는 것 자체가 「chevron만 접기 트리거」 모드를 켠다(`Controller.Group`의 계약).
 * 🔑 그룹과 그 안의 행이 같은 배선을 겹쳐 달아도 된다 — capture는 조상→대상 순이라 행의 좁은
 *    대상이 그룹의 넓은 대상을 덮어쓴다(Text 섹션이 그 구조다).
 * 🔴 놓는 것은 **내 섹션일 때만** — 다른 섹션으로 곧장 옮겨 가면 새 focus가 먼저 들어온다.
 */
/** 슬롯 하나가 자기 노드를 집는 흔한 경우. */
const slotTarget = (slotId: string): TemplateFocusTarget => ({
	sectionId: slotId,
	kind: 'nodes',
	nodeIds: [slotId],
})

function LayerVisibilityControl({
	label,
	visible,
	allowToggle,
	onChange,
}: {
	label: string
	visible: boolean
	allowToggle: boolean
	onChange: (visible: boolean) => void
}) {
	if (!allowToggle) return null
	return (
		<Controller.Row label={`${label} 표시`}>
			<Controller.Segmented
				aria-label={`${label} 표시`}
				options={CONTROLLER_TOGGLE_OPTIONS}
				value={visible ? 'on' : 'off'}
				onChange={(next) => onChange(next === 'on')}
			/>
		</Controller.Row>
	)
}

function useTextCaretHandoff(target: TemplateFocusTarget | null) {
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
