'use client'

import { useEffect } from 'react'
import { Controller } from '@/components/shared/controller'
import {
	CONTROLLER_TOGGLE_OPTIONS,
	ControllerControlRenderer,
	ControllerGroupRenderer,
} from '@/components/shared/controller-renderer'
import {
	ExportAction,
	PrintControls,
	ScaleControls,
	VideoControls,
} from '@/components/studio/shared/output-controls'
import {
	StudioPanel,
	StudioPanelFixed,
	StudioPanelScroll,
} from '@/components/studio/sidebar/studio-panel'
import { TemplateBackgroundPanel } from '@/components/studio/sidebar/template-background-panel'
import { ImageSlotInput } from '@/components/studio/template/image-slot-input'
import {
	IMAGE_TRANSFORM_DEFAULT,
	ImageTransformControl,
} from '@/components/studio/template/image-transform-control'
import { TextSlotInput } from '@/components/studio/template/text-slot-input'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Typography } from '@/components/ui/typography'
import {
	STUDIO_OUTPUT_FORMAT_OPTIONS,
	type StudioOutputFormat,
} from '@/features/studio-export/export-contract'
import type { TemplateExportView } from '@/features/studio-export/hooks/use-template-export'
import { formatMillimeters } from '@/features/studio-export/print-policy'
import { usePublishedBrandColorValues } from '@/features/template-core/hooks/use-published-brand-color-values'
import {
	TEMPLATE_TEXT_SECTION_ID,
	type TemplateFocusTarget,
} from '@/features/template-customization/contexts/template-studio-context'
import {
	findTemplateControl,
	findTemplateControlGroup,
	partitionTemplateSlots,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

const FORMAT_LABELS = new Map(
	STUDIO_OUTPUT_FORMAT_OPTIONS.map(({ label, value }) => [value, label]),
)

/**
 * 템플릿 스튜디오의 사이드바(컨트롤러 패널) — 캔버스를 모른다.
 * 무엇을 그릴지는 편집 계약(config)만 보고 결정하고(원시 nodeConfigs 참조 금지),
 * 세션 값은 컨텍스트의 text/images 그룹으로만 읽고 쓴다.
 */
export function TemplateSidebar({ exporting }: { exporting: TemplateExportView }) {
	const { config, text, images, vectors, layers, focus } = useTemplateStudio()
	/**
	 * 벡터 색은 창작자가 정하는 값이 아니라 **브랜드가 선언한 팔레트에서 고르는 값**이다
	 * (사용자 지시, 2026-09-29). admin 편집기와 같은 목록을 본다.
	 */
	const { values: brandColorValues } = usePublishedBrandColorValues()
	useTextCaretHandoff(focus.target)
	// 🔑 배경도 여기다 — 레이어 패널의 한 줄이므로 컨트롤도 다른 레이어와 같은 자리에 온다.
	const { text: textSlots, image: imageSlots } = partitionTemplateSlots(config.template.slots)
	/**
	 * 🔴 **평소에는 아무 컨트롤도 보여주지 않는다.** 레이어 패널에서 레이어를 고른 그 순간에만
	 *    그 레이어의 컨트롤이 나온다(사용자 지시, 2026-09-10) — 우측이 「너무 많다」는 것은
	 *    모든 슬롯의 컨트롤이 동시에 펼쳐져 있어서다.
	 * 🔑 고르는 단위는 **종류**다(사용자 지시, 2026-09-29) — Text를 고르면 텍스트 상자가 전부,
	 *    Image를 고르면 이미지 슬롯이 전부 한 번에 나온다.
	 * 🔴 `focus`를 보지 않는다. `focus`는 「지금 만지는 자리」라 입력칸에 커서가 들어가면
	 *    대상이 바뀌고, 그것을 선택으로 읽으면 **글자를 치는 순간 컨트롤이 통째로 사라진다.**
	 *    선택은 레이어 패널만 바꾸는 별개 상태다.
	 */
	const showsKind = (kind: 'text' | 'image' | 'vector' | 'background') =>
		layers.selectedKind === kind
	// 배경은 노드가 아니라 도화지라 항상 있다 — 「고를 것이 있나」는 나머지로 판단한다.
	const hasSlots = config.template.slots.some((slot) => slot.kind !== 'background')
	const { canvas } = config.template.exportOption
	const video = exporting.format === 'mp4' ? config.output.video?.mp4 : undefined
	const textGroup = textSlots[0]
		? findTemplateControlGroup(config, textSlots[0].controlId)
		: undefined
	const textColorControl = config.template.textColorControlId
		? findTemplateControl(config, config.template.textColorControlId)
		: undefined

	return (
		// 자산 브라우저의 열림은 편집 세션이 아니라 이 화면의 표현 상태다 — 킷이 소유한다(Provider에 넣지 않는다).
		<Controller.Browser.Root>
			<StudioPanel
				slot="studio-sidebar"
				// 🔑 위 상자 = **메인 필드**다(사용자 지시, 2026-09-10). 고른 묶음의 컨트롤이 이
				//    큰 공간을 쓰고, 아무것도 고르지 않았으면 고르라고 말한다. 레이어 패널은
				//    좌측 아래로 갔다 — 무엇을 고르는 자리와 만지는 자리를 좌우로 갈랐다.
				top={
					<StudioPanelScroll>
						{/* 🔴 텍스트 색은 그룹 공용이라 필터를 타지 않는다 — 행이 전부 걸러지면 그룹이 껍데기로
				    남아 `Color`만 뜬다. 보일 행이 하나도 없으면 그룹째 접는다. */}
						{showsKind('text') && textGroup && (
							<ControllerGroupRenderer
								definition={textGroup}
								section={sectionProps(focus, {
									sectionId: TEMPLATE_TEXT_SECTION_ID,
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
												sectionId: TEMPLATE_TEXT_SECTION_ID,
												kind: 'nodes',
												nodeIds: [slot.id],
											})}
										>
											<LayerVisibilityControl
												label={slot.label}
												visible={layers.visibility[slot.id] ?? true}
												allowToggle={slot.visibility.allowToggle}
												onChange={(visible) =>
													layers.setVisible(slot.id, visible)
												}
											/>
											<TextSlotInput
												definition={definition}
												input={slot.input}
												value={
													text.values[slot.id] ??
													definition.defaultValue ??
													''
												}
												onChange={(next) => text.setValue(slot.id, next)}
											/>
											{text.clippedSlotIds.has(slot.id) && (
												<Typography role="status" size="xs" tone="muted">
													입력한 텍스트가 박스를 넘어 일부가 잘려 보여요.
												</Typography>
											)}
										</div>
									)
								})}
								{textColorControl?.kind === 'color' && (
									<ControllerControlRenderer
										definition={textColorControl}
										value={text.color}
										onChange={(next) => {
											if (typeof next === 'string' || next === null)
												text.setColor(next)
										}}
									/>
								)}
							</ControllerGroupRenderer>
						)}
						{showsKind('image') &&
							imageSlots.map((slot, index) => {
								const topicTitle =
									imageSlots.length > 1 ? `Image ${index + 1}` : 'Image'
								const state = images.states[slot.id]
								const contracts = images.contracts[slot.id] ?? []
								if (!state) return null
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
											allowToggle={slot.visibility.allowToggle}
											onChange={(visible) =>
												layers.setVisible(slot.id, visible)
											}
										/>
										<ImageSlotInput
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
											onPromptChange={(prompt) =>
												images.update(slot.id, { prompt })
											}
											onImageModeChange={(imageMode) =>
												images.update(slot.id, { imageMode })
											}
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
												disabled={
													slot.access === 'readonly' || !state?.image
												}
											>
												<ImageTransformControl
													value={
														state?.transform ?? IMAGE_TRANSFORM_DEFAULT
													}
													// compose는 배정된 이미지에만 transform을 적용한다 — 생성 전에는 비활성.
													disabled={
														slot.access === 'readonly' || !state?.image
													}
													limits={slot.transform.limits}
													// 패드는 대상 슬롯 박스와 같은 비율로 그려진다(디자인 Wide/Portrait/Square).
													aspectRatio={
														slot.box.width && slot.box.height
															? slot.box.width / slot.box.height
															: undefined
													}
													onChange={(transform) =>
														images.update(slot.id, { transform })
													}
												/>
											</Controller.Group>
										)}
									</Controller.Group>
								)
							})}
						{showsKind('vector') &&
							vectors.slots.map((slot) => {
								const color = vectors.colors[slot.id]
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
											allowToggle={slot.visibility.allowToggle}
											onChange={(visible) =>
												layers.setVisible(slot.id, visible)
											}
										/>
										{/* 🔴 팔레트가 아직·끝내 비어 있으면 잠근다. 빈 목록은 「제한 없음」이
									    아니라 「도메인을 모른다」이고, 열어 두면 네이티브 피커가 정본 밖
									    색을 통과시킨다. */}
										<Controller.ColorRow
											label="Color"
											value={color ?? '#000000'}
											isEmpty={!color}
											values={brandColorValues}
											disabled={
												slot.access === 'readonly' ||
												brandColorValues.length === 0
											}
											onChange={(next) => vectors.setColor(slot.id, next)}
										/>
									</Controller.Group>
								)
							})}
						{showsKind('background') && <TemplateBackgroundPanel />}
						{/* 🔴 메인 필드가 비어 있는 상태는 **말을 한다.** 이 큰 공간이 아무
							    설명 없이 비어 있으면 처음 온 사람이 어디서 시작하는지 알 수 없다. */}
						{!layers.selectedKind && (
							<Empty className="my-auto border-0">
								<EmptyHeader>
									<EmptyTitle>
										{hasSlots
											? '왼쪽에서 레이어를 선택해 주세요'
											: '이 템플릿에는 편집할 레이어가 없습니다'}
									</EmptyTitle>
									{hasSlots && (
										<EmptyDescription>
											고른 묶음의 컨트롤이 이 자리에 나옵니다.
										</EmptyDescription>
									)}
								</EmptyHeader>
							</Empty>
						)}
					</StudioPanelScroll>
				}
				// 🔑 아래 상자 = settings + 내보내기. 사용자 지시: 이 둘은 무조건 하나다.
				bottom={
					<StudioPanelFixed className="gap-4">
						<div className="flex flex-col gap-1">
							<div className="flex h-9 items-center pt-1">
								<span className="text-sm font-semibold text-muted-foreground">
									Setting
								</span>
							</div>
							{/* 🔑 px면 mm를, mm면 px를 보여주지 않는다 — 두 축은 대등하고 섞지 않는다. */}
							<Controller.Row label="Size" readonly>
								<span className="text-sm text-muted-foreground">
									{exporting.sizeMm
										? `${formatMillimeters(exporting.sizeMm.width)} × ${formatMillimeters(exporting.sizeMm.height)}mm`
										: `${exporting.outputSize?.width ?? canvas.width} × ${exporting.outputSize?.height ?? canvas.height}px`}
								</span>
							</Controller.Row>
							{/* 🔑 판형은 Figma가 정한 값으로 고정이다 — 사용자가 정하는 것은 「얼마나 촘촘히 굽나」다. */}
							{exporting.scaleApplies && (
								<ScaleControls
									scale={exporting.scale}
									options={exporting.scaleOptions}
									onChange={exporting.setScale}
								/>
							)}
							<Controller.Row label="Format">
								<Controller.Select
									options={exporting.formats.map((candidate) => ({
										value: candidate,
										label: FORMAT_LABELS.get(candidate) ?? candidate,
									}))}
									value={exporting.format ?? ''}
									onChange={(value) =>
										exporting.setFormat(value as StudioOutputFormat)
									}
								/>
							</Controller.Row>
							{/* 🔴 svg도 포함한다 — SVG의 물리 크기(mm)도 ppi가 정한다. 빼 두면 SVG에는
							    행이 안 뜨는데 값은 살아 있어, 직전에 PDF를 만졌는지에 따라 같은 SVG가
							    53mm 또는 222mm로 나간다. */}
							{(exporting.format === 'tiff' ||
								exporting.format === 'pdf' ||
								exporting.format === 'svg') &&
								exporting.ppiApplies &&
								config.output.print && (
									<PrintControls
										ppi={exporting.ppi}
										options={config.output.print.ppi}
										onChange={exporting.setPpi}
									/>
								)}
							{video && exporting.fps && (
								<VideoControls
									fps={exporting.fps}
									fpsOptions={video.fps}
									durationSeconds={exporting.durationSeconds}
									maxDurationSeconds={video.maxDurationSeconds}
									onFpsChange={exporting.setFps}
									onDurationChange={exporting.setDuration}
								/>
							)}
						</div>
						<ExportAction
							busy={exporting.busy}
							disabled={!exporting.canExport}
							error={exporting.error}
							warnings={exporting.vectorWarnings}
							onExport={exporting.run}
						/>
					</StudioPanelFixed>
				}
			/>
		</Controller.Browser.Root>
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
function sectionProps(
	focus: ReturnType<typeof useTemplateStudio>['focus'],
	target: TemplateFocusTarget,
) {
	return {
		active: focus.target?.sectionId === target.sectionId,
		onActivate: () => focus.set(target),
		...rowFocusProps(focus, target),
	}
}

/**
 * 섹션 **안의 한 행**용 배선. 🔴 행은 `Controller.Group`이 아니라 맨 `div`이므로 `active`·
 * `onActivate`를 주면 그대로 DOM 속성이 되어 React가 경고한다(2026-08-24 실측). 포커스만 준다.
 */
function rowFocusProps(
	focus: ReturnType<typeof useTemplateStudio>['focus'],
	target: TemplateFocusTarget,
) {
	return {
		onFocusCapture: () => focus.set(target),
		onBlurCapture: () => {
			if (focus.target?.sectionId === target.sectionId) focus.set(null)
		},
	}
}

/** 하위 섹션(Profile Settings·Transform)은 면을 두 겹 칠하지 않는다 — 규칙만 물려받는다. */
function subsectionProps(
	focus: ReturnType<typeof useTemplateStudio>['focus'],
	target: TemplateFocusTarget,
) {
	return { onActivate: () => focus.set(target) }
}

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

/**
 * 판에서 글자를 누르면 **그 슬롯의 입력칸으로 커서를 옮긴다**(사용자 지시, 2026-09-29) —
 * 캔버스는 고르기만 하고 타이핑은 우측에서 하므로, 이 한 걸음이 없으면 누른 뒤 손이 한 번 더 간다.
 *
 * 🔴 입력칸을 찾을 때 선택자를 조립하지 않는다 — nodeId에 콜론이 섞여 있다(compose·캔버스와 같은 규칙).
 * 🔑 끄는 코드가 없다. 포커스를 받은 입력칸이 `caret` 없는 같은 대상으로 focus를 다시 세우므로
 *    다음 렌더에는 요청이 사라져 있다.
 */
function useTextCaretHandoff(target: TemplateFocusTarget | null) {
	useEffect(() => {
		if (target?.kind !== 'nodes' || !target.caret) return
		const [nodeId] = target.nodeIds
		if (!nodeId) return
		const row = Array.from(document.querySelectorAll('[data-text-slot]')).find(
			(candidate) => candidate.getAttribute('data-text-slot') === nodeId,
		)
		row?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus()
	}, [target])
}
