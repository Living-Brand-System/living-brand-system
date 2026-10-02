'use client'

import {
	type ReactNode,
	type RefObject,
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { graphicRendererLabel } from '@/features/graphic-generation/domain/graphic-studio-config'
import {
	createGraphicPresetValues,
	getGraphicStudioRuntimeBindings,
	getGraphicStudioRuntimeGroups,
} from '@/features/graphic-generation/runtime/graphic-studio-runtime'
import {
	acceptsImagePromptExecution,
	getImageColorAdjustmentControls,
	getImageStudioFeatureControlIds,
	resolveImagePromptExecution,
} from '@/features/image-generation/domain/image-studio-config'
import { requestImageGeneration } from '@/features/image-generation/services/generate-image.client'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import {
	type TemplateAssignedImage,
	type TemplateBackgroundPatch,
	type TemplateBackgroundState,
	type TemplateFocusTarget,
	type TemplateImageSlotPatch,
	type TemplateImageSlotState,
	TemplateStudioContext,
	type TemplateStudioValue,
} from '@/features/template-customization/contexts/template-studio-context'
import {
	findTemplateControl,
	listCompatibleTemplateImageConfigs,
	listTemplateLayerGroups,
	mapTemplateNodeLayers,
	type PublishedTemplateView,
	partitionTemplateSlots,
	type ResolvedTemplateImageConfig,
	type TemplateBackgroundSlot,
	type TemplateBackgroundType,
	type TemplateImageConfigSlot,
	type TemplateStudioConfig,
	type TemplateStudioConfigSlot,
	type TemplateTextSlot,
	type TemplateVectorSlot,
} from '@/features/template-customization/domain/template-studio-config'
import {
	composeTemplateStudioHtml,
	createTemplateRasterArtifact,
	createTemplateVectorArtifact,
	createTemplateVideoArtifact,
	type TemplateRasterArtifact,
	type TemplateVideoArtifact,
} from '@/features/template-customization/runtime/template-runtime.client'
import { fetchCreateNavigation } from '@/features/template-customization/services/get-create-navigation.client'
import {
	fetchSampleImages,
	type SampleImageOption,
} from '@/features/template-customization/services/list-sample-images.client'
import {
	pickKnownSlots,
	readTemplateDraft,
	type TemplateDraft,
	writeTemplateDraft,
} from '@/features/template-customization/services/template-draft.client'
import { useLazyResource } from '@/hooks/use-lazy-resource'
import type { CanvasVideoSource } from '@/modules/studio-artifact/studio-artifact'
import {
	acceptsControllerDraftValue,
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerRuntimeBindings,
	type ControllerValues,
	createControllerValues,
	followsChangedDefault,
} from '@/modules/studio-controller/controller-definition'

const GENERATION_ERROR_MESSAGE = '이미지 생성에 실패했어요. 잠시 후 다시 시도해 주세요.'
const PINNED_CONFIG_ERROR_MESSAGE = '고정된 이미지 프로파일을 사용할 수 없습니다.'
const SELECTABLE_CONFIG_ERROR_MESSAGE = '사용 가능한 이미지 프로파일이 없습니다.'

function useTemplateTextSession(
	config: TemplateStudioConfig,
	textSlots: readonly TemplateTextSlot[],
	html: string,
	previewRef: RefObject<HTMLDivElement | null>,
	draft: TemplateDraft | null,
): TemplateStudioValue['text'] {
	const colorDefinition = config.template.textColorControlId
		? findTemplateControl(config, config.template.textColorControlId)
		: undefined
	const [values, setValues] = useState<Record<string, string>>(() => ({
		...initialTemplateTextValues(config, textSlots),
		...pickKnownSlots(
			draft?.text,
			textSlots.map((slot) => slot.id),
		),
	}))
	const [color, setColor] = useState<string | null>(() =>
		draft
			? draft.textColor
			: colorDefinition?.kind === 'color'
				? colorDefinition.defaultValue
				: null,
	)
	const [clippedSlotIds, setClippedSlotIds] = useState<ReadonlySet<string>>(new Set())
	const setValue = useCallback(
		(slotId: string, next: string) =>
			setValues((current) => updateTemplateText(current, config, textSlots, slotId, next)),
		[config, textSlots],
	)
	const updateColor = useCallback(
		(next: string | null) =>
			setColor((current) => updateTemplateColor(current, colorDefinition, next)),
		[colorDefinition],
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: 측정 대상 DOM이 html·values로 합성된 결과다.
	useEffect(() => {
		const container = previewRef.current
		if (!container) return
		const clipped = new Set<string>()
		for (const slot of textSlots) {
			const element = container.querySelector(`[data-node-id="${slot.id}"]`)
			if (element && element.scrollHeight > element.clientHeight + 1) clipped.add(slot.id)
		}
		setClippedSlotIds(clipped)
	}, [html, previewRef, textSlots, values])

	return useMemo(
		() => ({ values, setValue, color, setColor: updateColor, clippedSlotIds }),
		[clippedSlotIds, color, setValue, updateColor, values],
	)
}

function useTemplateImageSession(
	config: TemplateStudioConfig,
	imageSlots: readonly TemplateImageConfigSlot[],
	draft: TemplateDraft | null,
): TemplateStudioValue['images'] & {
	restore: (states: Record<string, TemplateImageSlotState>) => void
	reset: (slotId: string) => void
} {
	const requests = useRef(new Map<string, symbol>())
	const contracts = useMemo(
		() =>
			Object.fromEntries(
				imageSlots.map((slot) => [
					slot.id,
					listCompatibleTemplateImageConfigs(slot, config.template.imageConfigs),
				]),
			),
		[config.template.imageConfigs, imageSlots],
	)
	const [states, setStates] = useState<Record<string, TemplateImageSlotState>>(() => ({
		...Object.fromEntries(
			imageSlots.map((slot) => [slot.id, initialImageState(slot, contracts[slot.id] ?? [])]),
		),
		...pickKnownSlots(
			draft?.images,
			imageSlots.map((slot) => slot.id),
		),
	}))
	const restore = useCallback((snapshot: Record<string, TemplateImageSlotState>) => {
		requests.current.clear()
		setStates(snapshot)
	}, [])
	const reset = useCallback(
		(slotId: string) => {
			const slot = imageSlots.find((item) => item.id === slotId)
			if (!slot) return
			requests.current.delete(slotId)
			setStates((current) => ({
				...current,
				[slotId]: {
					...current[slotId],
					...initialImageState(
						slot,
						(contracts[slotId] ?? []).filter(
							(item) => item.config.id === current[slotId]?.profileId,
						),
					),
					imageMode: current[slotId]?.imageMode ?? 'preset',
					image: current[slotId]?.image,
					transform: undefined,
					dimmer: undefined,
					dimmerOpacity: undefined,
				},
			}))
		},
		[contracts, imageSlots],
	)
	const updateState = useCallback(
		(slotId: string, patch: Partial<TemplateImageSlotState>) => {
			setStates((current) => {
				const slot = imageSlots.find((candidate) => candidate.id === slotId)
				if (!slot) return current
				const previous = current[slotId] ?? initialImageState(slot, contracts[slotId] ?? [])
				return {
					...current,
					[slotId]: {
						...previous,
						...patch,
						...(patch.image ? { transform: undefined } : {}),
					},
				}
			})
		},
		[contracts, imageSlots],
	)
	const update = useCallback(
		(slotId: string, patch: TemplateImageSlotPatch) =>
			setStates((current) =>
				// 🔴 잠긴 슬롯을 여기서 막는다. 지금까지 이미지 슬롯의 readonly를 집행하는 코드는
				//    사이드바 컴포넌트의 prop뿐이었다 — 챗 저작은 사이드바를 우회하므로(그게 목적이다)
				//    모든 호출자가 지나는 이 자리에 둔다. 대조: vectors.setColor·layers.setVisible은
				//    이미 슬롯 정책을 본다.
				imageSlots.find((slot) => slot.id === slotId)?.access === 'editable'
					? updateTemplateImageSlot(current, slotId, patch, contracts[slotId] ?? [])
					: current,
			),
		[contracts, imageSlots],
	)
	const updateFeature = useCallback(
		(slotId: string, controlId: string, next: ControllerControlValue) => {
			setStates((current) => {
				const previous = current[slotId]
				if (!previous) return current
				const contract = contracts[slotId]?.find(
					(candidate) => candidate.config.id === previous.profileId,
				)
				const color = contract ? getImageColorAdjustmentControls(contract.config) : null
				const definition = [color?.line, color?.background].find(
					(control) => control?.id === controlId,
				)
				if (!definition || !acceptsControllerDraftValue(definition, next)) return current
				return {
					...current,
					[slotId]: {
						...previous,
						featureValues: { ...previous.featureValues, [controlId]: next },
					},
				}
			})
		},
		[contracts],
	)
	const selectProfile = useCallback(
		(slotId: string, profileId: number) =>
			setStates((current) =>
				selectImageProfile(
					current,
					slotId,
					profileId,
					contracts[slotId] ?? [],
					imageSlots.find((slot) => slot.id === slotId)?.featureOverrides,
				),
			),
		[contracts, imageSlots],
	)
	const selectSampleImage = useCallback((slotId: string, option: SampleImageOption) => {
		requests.current.delete(slotId)
		// 생성 중이던 요청 결과가 뒤늦게 덮지 않도록 error·generating도 함께 정리한다.
		setStates((current) => ({
			...current,
			[slotId]: {
				...current[slotId],
				imageMode: current[slotId]?.imageMode ?? 'preset',
				prompt: current[slotId]?.prompt ?? '',
				generating: false,
				error: null,
				featureValues: current[slotId]?.featureValues ?? {},
				image: toAssignedSampleImage(option),
				transform: undefined,
			},
		}))
	}, [])
	const generate = useCallback(
		/**
		 * 🔑 `promptOverride`가 있는 이유: 챗이 얹은 패치를 **같은 tick에** 생성까지 태우려면
		 *    `states` 클로저가 아직 옛 프롬프트를 보고 있다. 렌더 타이밍에 기대는 대신 값을 인자로
		 *    받아 그 문제를 없앤다. 사이드바 호출부는 인자를 주지 않아 영향이 없다.
		 */
		async (slotId: string, promptOverride?: string) => {
			const state = states[slotId]
			const contract = contracts[slotId]?.find(
				(candidate) => candidate.config.id === state?.profileId,
			)
			const prompt = promptOverride ?? state?.prompt ?? ''
			if (
				!state ||
				requests.current.has(slotId) ||
				state.generating ||
				!contract ||
				!validPrompt(prompt, contract)
			)
				return
			const request = Symbol()
			requests.current.set(slotId, request)
			const requestProfileId = contract.config.id
			updateState(slotId, { generating: true, error: null })
			const generated = await requestTemplateImageGeneration(prompt, contract)
			if (requests.current.get(slotId) !== request) return
			requests.current.delete(slotId)
			setStates((current) =>
				applyImageRequestResult(
					current,
					slotId,
					requestProfileId,
					generated
						? {
								image: {
									kind: 'generated',
									url: generated.url,
									generatedImageId: generated.id,
									profileId: requestProfileId,
								},
							}
						: { error: GENERATION_ERROR_MESSAGE },
				),
			)
			updateState(slotId, { generating: false })
		},
		[contracts, states, updateState],
	)

	return useMemo(
		() => ({
			states,
			restore,
			reset,
			contracts,
			update,
			updateFeature,
			selectProfile,
			selectSampleImage,
			generate,
		}),
		[
			contracts,
			generate,
			selectProfile,
			selectSampleImage,
			states,
			update,
			updateFeature,
			restore,
			reset,
		],
	)
}

function useTemplateVectorSession(
	vectorSlots: readonly TemplateVectorSlot[],
	draft: TemplateDraft | null,
): TemplateStudioValue['vectors'] {
	const [colors, setColors] = useState<Record<string, string | undefined>>(() => ({
		...Object.fromEntries(vectorSlots.map((slot) => [slot.id, slot.color])),
		...pickKnownSlots(
			draft?.vectorColors,
			vectorSlots.map((slot) => slot.id),
		),
	}))
	const setColor = useCallback(
		(slotId: string, color: string) =>
			setColors((current) => {
				const slot = vectorSlots.find((candidate) => candidate.id === slotId)
				return slot?.access === 'editable' ? { ...current, [slotId]: color } : current
			}),
		[vectorSlots],
	)
	return useMemo(
		() => ({ slots: vectorSlots, colors, setColor }),
		[colors, setColor, vectorSlots],
	)
}

/**
 * 🔴 목록이 둘인 이유: 표시/숨김은 **편집 가능한 레이어 하나하나**를 갖고(배경은 정책이 없다),
 *    선택은 배경까지 포함한 **종류**를 대상으로 한다 — 배경도 레이어 패널의 한 줄이다.
 */
function useTemplateLayerSession(
	editable: readonly (TemplateTextSlot | TemplateImageConfigSlot | TemplateVectorSlot)[],
	all: readonly TemplateStudioConfigSlot[],
	draft: TemplateDraft | null,
): TemplateStudioValue['layers'] {
	const [visibility, setVisibility] = useState<Record<string, boolean>>(() => ({
		...Object.fromEntries(editable.map((slot) => [slot.id, slot.visibility.defaultVisible])),
		...pickKnownSlots(
			draft?.visibility,
			editable.map((slot) => slot.id),
		),
	}))
	const setVisible = useCallback(
		(slotId: string, visible: boolean) =>
			setVisibility((current) => {
				const slot = editable.find((candidate) => candidate.id === slotId)
				return slot?.access === 'editable' && slot.visibility.allowToggle
					? { ...current, [slotId]: visible }
					: current
			}),
		[editable],
	)
	/**
	 * 🔴 `undefined`(아직 고른 적 없음)와 `null`(일부러 풀었음)은 다른 상태다. 둘을 합치면
	 *    고른 묶음을 다시 눌러 푸는 순간 첫 묶음으로 되튄다.
	 */
	const [selected, setSelected] = useState<string | null | undefined>()
	const initial =
		all.find((slot) => slot.kind === listTemplateLayerGroups(all)[0]?.kind)?.id ?? null
	const selectedId =
		selected === undefined
			? initial
			: all.some((slot) => slot.id === selected)
				? (selected ?? null)
				: null
	const selectedKind = all.find((slot) => slot.id === selectedId)?.kind ?? null
	const select = useCallback(
		(id: string | null) =>
			setSelected(
				all.find((slot) => slot.id === id)?.id ??
					all.find((slot) => slot.kind === id)?.id ??
					null,
			),
		[all],
	)
	return useMemo(
		() => ({ visibility, setVisible, selectedId, selectedKind, select }),
		[visibility, setVisible, selectedId, selectedKind, select],
	)
}

function useTemplateBackgroundSession(
	config: TemplateStudioConfig,
	slot: TemplateBackgroundSlot | undefined,
	draft: TemplateDraft | null,
): TemplateStudioValue['background'] & {
	restore: (state: TemplateBackgroundState) => void
	reset: () => void
} {
	const requestId = useRef<symbol | null>(null)
	const contracts = useMemo(
		() =>
			slot
				? listCompatibleTemplateImageConfigs(
						slot,
						config.template.imageConfigs,
						config.template.exportOption.canvas,
					)
				: [],
		[config.template.exportOption.canvas, config.template.imageConfigs, slot],
	)
	const [state, setState] = useState<TemplateBackgroundState>(
		() => draft?.background ?? initialBackgroundState(config, slot, contracts),
	)
	const restore = useCallback((snapshot: TemplateBackgroundState) => {
		requestId.current = null
		setState(snapshot)
	}, [])
	const reset = useCallback(() => {
		requestId.current = null
		setState((current) => {
			const initial = initialBackgroundState(
				config,
				slot,
				contracts.filter((item) => item.config.id === current.profileId),
			)
			const graphic = config.template.graphicConfigs.find(
				(item) => item.id === current.graphicConfigId,
			)
			return {
				...initial,
				type: current.type,
				image: current.image,
				imageMode: current.imageMode,
				graphicConfigId: current.graphicConfigId,
				graphicValues: graphic
					? createControllerValues(graphic.controller.groups)
					: initial.graphicValues,
			}
		})
	}, [config, slot, contracts])
	const typeDefinition = slot ? findTemplateControl(config, slot.typeControlId) : undefined
	const colorDefinition = slot ? findTemplateControl(config, slot.colorControlId) : undefined
	const selectedContract = contracts.find((candidate) => candidate.config.id === state.profileId)
	const featureBindings = useMemo(
		() => getBackgroundFeatureBindings(selectedContract),
		[selectedContract],
	)
	const selectedGraphicConfig = config.template.graphicConfigs.find(
		(candidate) => candidate.id === state.graphicConfigId,
	)
	const graphicBindings = useMemo(
		() =>
			selectedGraphicConfig
				? getGraphicStudioRuntimeBindings(
						selectedGraphicConfig,
						config.template.exportOption.canvas,
					)
				: {},
		[config.template.exportOption.canvas, selectedGraphicConfig],
	)
	const update = useCallback(
		(patch: TemplateBackgroundPatch) =>
			setState((current) => updateTemplateBackground(current, patch, contracts)),
		[contracts],
	)
	const setColor = useCallback(
		(next: string | null) =>
			setState((current) => updateTemplateBackgroundColor(current, colorDefinition, next)),
		[colorDefinition],
	)
	const selectType = useCallback(
		(next: ControllerControlValue) =>
			setState((current) => selectBackgroundType(current, typeDefinition, next)),
		[typeDefinition],
	)
	const updateFeature = useCallback(
		(controlId: string, next: ControllerControlValue) =>
			setState((current) => updateBackgroundFeature(current, controlId, next, contracts)),
		[contracts],
	)
	const selectImageProfile = useCallback(
		(profileId: number) =>
			setState((current) => selectBackgroundImageProfile(current, profileId, contracts)),
		[contracts],
	)
	const selectSampleImage = useCallback((option: SampleImageOption) => {
		requestId.current = null
		setState((current) => ({
			...current,
			generating: false,
			error: null,
			image: toAssignedSampleImage(option),
		}))
	}, [])
	const selectGraphicConfig = useCallback(
		(configId: string) =>
			setState((current) =>
				selectBackgroundGraphicConfig(current, configId, config.template.graphicConfigs),
			),
		[config.template.graphicConfigs],
	)
	const updateGraphic = useCallback(
		(controlId: string, next: ControllerControlValue) =>
			setState((current) =>
				updateBackgroundGraphic(
					current,
					controlId,
					next,
					config.template.graphicConfigs,
					config.template.exportOption.canvas,
				),
			),
		[config.template.exportOption.canvas, config.template.graphicConfigs],
	)
	const generate = useCallback(async () => {
		const contract = contracts.find((candidate) => candidate.config.id === state.profileId)
		const prompt = state.prompt
		if (requestId.current || state.generating || !contract || !validPrompt(prompt, contract))
			return
		const request = Symbol()
		requestId.current = request
		setState((current) => ({ ...current, generating: true, error: null }))
		const generated = await requestTemplateImageGeneration(prompt, contract)
		if (requestId.current !== request) return
		requestId.current = null
		setState((current) => ({
			...current,
			generating: false,
			...(generated
				? {
						image: {
							kind: 'generated' as const,
							url: generated.url,
							generatedImageId: generated.id,
							profileId: contract.config.id,
						},
					}
				: { error: GENERATION_ERROR_MESSAGE }),
		}))
	}, [contracts, state])

	return useMemo(
		() => ({
			state,
			restore,
			reset,
			contracts,
			featureBindings,
			graphicConfigs: config.template.graphicConfigs,
			graphicBindings,
			update,
			setColor,
			selectType,
			updateFeature,
			selectImageProfile,
			selectSampleImage,
			selectGraphicConfig,
			updateGraphic,
			generate,
		}),
		[
			config.template.graphicConfigs,
			restore,
			reset,
			contracts,
			featureBindings,
			generate,
			graphicBindings,
			selectGraphicConfig,
			selectImageProfile,
			selectSampleImage,
			selectType,
			setColor,
			state,
			update,
			updateFeature,
			updateGraphic,
		],
	)
}

/** 값이 멈춘 뒤에 한 번만 쓴다 — 타이핑마다 직렬화하면 키 입력에 비용이 붙는다. */
const DRAFT_WRITE_DELAY_MS = 600

/**
 * 편집 중인 화면을 임시 저장한다 — 자동이고, 새로고침 정도를 버티는 것이 목적이다
 * (사용자 지시, 2026-09-29).
 *
 * 🔴 첫 렌더에서는 쓰지 않는다. 초안을 되살린 직후 그대로 다시 쓰면 저장 시각만 갱신돼
 *    「오래되면 사라진다」가 영영 오지 않는다.
 */
function useTemplateDraftAutosave(
	userId: string | null | undefined,
	templateId: string,
	draft: TemplateDraft,
	restoreDraft: boolean,
): void {
	const restored = useRef(restoreDraft)
	// biome-ignore lint/correctness/useExhaustiveDependencies: draft는 매 렌더 새 객체라 의존성에 둘 수 없다 — 값이 바뀌었는지는 아래 필드들이 말한다
	useEffect(() => {
		if (!userId) return
		if (restored.current) {
			restored.current = false
			return
		}
		const timer = setTimeout(
			() => writeTemplateDraft(userId, templateId, draft),
			DRAFT_WRITE_DELAY_MS,
		)
		return () => clearTimeout(timer)
	}, [
		userId,
		templateId,
		draft.text,
		draft.textColor,
		draft.vectorColors,
		draft.visibility,
		draft.images,
		draft.background,
	])
}

/**
 * Template 편집 세션의 단일 소유자. Sidebar와 Canvas는 서로를 모르고 이 Context만 소비한다.
 * Image Config는 서버 계약을 슬롯 범위에서 좁혀 쓰고 Graphic Config는 순수 runtime adapter로 투영한다.
 * 생성 HTTP와 모든 배경·슬롯 세션 상태도 여기서 소유한다.
 * compose는 항상 불변 published template.html에서 다시 실행하므로 같은 세션 값을 반복 적용해도 누적되지 않는다.
 */
export function TemplateStudioProvider({
	config,
	template,
	categoryTitle,
	highlightColor = null,
	userId,
	restoreDraft = true,
	children,
}: {
	config: TemplateStudioConfig
	template: PublishedTemplateView
	categoryTitle: string | null
	/** 강조 색 — 서버가 `brand-colors`에서 찾아 내린다. 없으면 캔버스가 토큰으로 폴백한다. */
	highlightColor?: string | null
	/**
	 * 임시 저장의 주인. 🔴 공용 PC에서 남의 초안이 내 화면에 뜨지 않게 저장 키에 섞는다.
	 * 없으면 임시 저장을 아예 하지 않는다 — 주인을 모르는 초안은 남기지 않는다.
	 */
	userId?: string | null
	restoreDraft?: boolean
	children: ReactNode
}) {
	/**
	 * 임시 저장된 화면 — **첫 렌더 전에 한 번만** 읽는다. 값이 자리를 잡은 뒤 되돌리면 기본값이
	 * 한 프레임 보였다가 바뀌고, 그 사이 도는 effect들이 기본값을 기준으로 측정한다.
	 */
	const [draft] = useState<TemplateDraft | null>(() =>
		restoreDraft && userId ? readTemplateDraft(userId, String(template.id)) : null,
	)
	// 교체 후보 목록은 자산 브라우저가 열릴 때 가져온다 — 페이지는 현재 카테고리 이름 하나만 싣는다.
	const templateBrowse = useLazyResource(fetchCreateNavigation)
	// Preset 목록도 같은 규칙이다 — 배경이든 슬롯이든 처음 여는 브라우저가 한 번만 가져온다.
	const sampleImages = useLazyResource(fetchSampleImages)
	const navigation = useMemo<TemplateStudioValue['navigation']>(
		() => ({ categoryTitle, browse: templateBrowse }),
		[categoryTitle, templateBrowse],
	)
	// 사이드바가 만지는 섹션. 편집 값이 아니라 표현 상태이므로 compose에도 export에도 안 들어간다.
	const [focusTarget, setFocusTarget] = useState<TemplateFocusTarget | null>(null)
	const focus = useMemo<TemplateStudioValue['focus']>(
		() => ({ target: focusTarget, set: setFocusTarget, color: highlightColor }),
		[focusTarget, highlightColor],
	)
	const previewRef = useRef<HTMLDivElement>(null)
	const graphicFrameRef = useRef<(() => string) | null>(null)
	const registerGraphicFrame = useCallback((capture: (() => string) | null) => {
		graphicFrameRef.current = capture
	}, [])
	const graphicVideoRef = useRef<CanvasVideoSource | null>(null)
	const registerGraphicVideo = useCallback((source: CanvasVideoSource | null) => {
		graphicVideoRef.current = source
	}, [])
	const { html, width, height } = template
	const slots = config.template.slots
	const partitionedSlots = useMemo(() => partitionTemplateSlots(slots), [slots])
	const textSlots = partitionedSlots.text
	const imageSlots = partitionedSlots.image
	const vectorSlots = partitionedSlots.vector
	const backgroundSlot = partitionedSlots.background
	const editableSlots = useMemo(
		() => [...textSlots, ...imageSlots, ...vectorSlots],
		[imageSlots, textSlots, vectorSlots],
	)
	const text = useTemplateTextSession(config, textSlots, html, previewRef, draft)
	const images = useTemplateImageSession(config, imageSlots, draft)
	const vectors = useTemplateVectorSession(vectorSlots, draft)
	const layerSession = useTemplateLayerSession(editableSlots, slots, draft)
	const background = useTemplateBackgroundSession(config, backgroundSlot, draft)
	const [targetId, setTargetId] = useState<string | null>(null)
	const snapshot = useRef<{
		id: string
		images: typeof images.states
		background: TemplateBackgroundState
	} | null>(null)
	const begin = useCallback(
		(id: string) => {
			if (
				snapshot.current ||
				background.state.generating ||
				Object.values(images.states).some((state) => state.generating)
			)
				return
			const slot = slots.find((item) => item.id === id)
			if (
				!slot ||
				(slot.kind !== 'background' &&
					(slot.kind !== 'image' || slot.access !== 'editable'))
			)
				return
			snapshot.current = { id, images: images.states, background: background.state }
			layerSession.select(id)
			setTargetId(id)
		},
		[slots, images.states, background.state, layerSession.select],
	)
	const selectLayer = useCallback(
		(id: string | null) => {
			if (!snapshot.current) layerSession.select(id)
		},
		[layerSession.select],
	)
	const layers = useMemo(
		() => ({ ...layerSession, select: selectLayer }),
		[layerSession, selectLayer],
	)
	const busy =
		background.state.generating ||
		Object.values(images.states).some((state) => state.generating)
	const target = useMemo<TemplateStudioValue['editing']['target']>(() => {
		if (!targetId) return null
		const isBackground = targetId === backgroundSlot?.id
		const state = isBackground ? background.state : images.states[targetId]
		const mode = !isBackground
			? 'image'
			: background.state.type === 'graphic'
				? 'graphic'
				: background.state.type === 'image'
					? 'image'
					: 'color'
		const graphicConfig =
			mode === 'graphic'
				? background.graphicConfigs.find(
						(item) => item.id === background.state.graphicConfigId,
					)
				: undefined
		const profile =
			mode === 'graphic'
				? graphicConfig
				: mode === 'image'
					? (isBackground ? background.contracts : images.contracts[targetId])?.find(
							(item) => item.config.id === state?.profileId,
						)?.config
					: undefined
		return {
			mode,
			// Figma 525:8777 — Preset은 방식 이름, Generate는 프로파일 이름, 단색 배경은 Solid Color.
			name:
				mode === 'color'
					? 'Solid Color'
					: mode === 'image' && state?.imageMode === 'preset'
						? 'Image Preset'
						: (profile?.name ?? null),
			subtitle: graphicConfig ? graphicRendererLabel(graphicConfig.type) : undefined,
			preview:
				mode === 'image' && state?.image
					? { url: state.image.url, alt: profile?.name ?? 'Image' }
					: profile?.previewImage,
		}
	}, [
		targetId,
		backgroundSlot?.id,
		background.state,
		background.contracts,
		background.graphicConfigs,
		images.states,
		images.contracts,
	])
	const editing = useMemo<TemplateStudioValue['editing']>(
		() => ({
			targetId,
			target,
			busy,
			begin,
			complete: () => {
				if (busy) return
				snapshot.current = null
				// 편집을 마치면 처음 들어왔을 때의 마스터 레이어(보통 Text)로 돌아간다 — 빈 선택을 두지 않는다.
				layerSession.select(listTemplateLayerGroups(slots)[0]?.kind ?? null)
				setTargetId(null)
			},
			cancel: () => {
				const saved = snapshot.current
				if (!saved) return
				images.restore(saved.images)
				background.restore(saved.background)
				snapshot.current = null
				// 편집을 마치면 처음 들어왔을 때의 마스터 레이어(보통 Text)로 돌아간다 — 빈 선택을 두지 않는다.
				layerSession.select(listTemplateLayerGroups(slots)[0]?.kind ?? null)
				setTargetId(null)
			},
			reset: () => {
				if (!targetId || busy) return
				if (targetId === backgroundSlot?.id) background.reset()
				else images.reset(targetId)
			},
		}),
		[
			targetId,
			target,
			busy,
			begin,
			layerSession.select,
			images.restore,
			images.reset,
			background.restore,
			background.reset,
			backgroundSlot?.id,
			slots,
		],
	)

	useTemplateDraftAutosave(
		userId,
		String(template.id),
		{
			text: text.values,
			textColor: text.color,
			vectorColors: vectors.colors,
			visibility: layers.visibility,
			images: images.states,
			background: background.state,
		},
		restoreDraft,
	)
	const deferredTextColor = useDeferredValue(text.color)
	const deferredImageStates = useDeferredValue(images.states)
	const deferredVectorColors = useDeferredValue(vectors.colors)
	const deferredLayerVisibility = useDeferredValue(layers.visibility)
	const deferredBackground = useDeferredValue(background.state)

	const composedHtml = useMemo(
		() =>
			composeTemplateStudioHtml({
				html,
				textSlots,
				textValues: text.values,
				textColor: deferredTextColor,
				imageStates: deferredImageStates,
				imageSlots,
				imageContracts: images.contracts,
				vectorSlots,
				vectorColors: deferredVectorColors,
				layerVisibility: deferredLayerVisibility,
				background: deferredBackground,
				width,
				height,
			}),
		[
			html,
			textSlots,
			text.values,
			deferredTextColor,
			deferredImageStates,
			deferredBackground,
			imageSlots,
			images.contracts,
			vectorSlots,
			deferredVectorColors,
			deferredLayerVisibility,
			width,
			height,
		],
	)

	const controllerValues = useMemo(
		() =>
			templateControllerValues(config, textSlots, text.values, text.color, background.state),
		[background.state, config, text.color, text.values, textSlots],
	)
	/**
	 * 내보내기용 합성 HTML. 배경이 graphic이면 셰이더 캔버스를 그 시점의 한 장으로 굳혀 판의 배경
	 * 이미지로 얹는다 — `composedHtml`은 미리보기용이라 캔버스 자리를 transparent로 비워 둔다.
	 *
	 * 🔴 **래스터와 벡터가 같은 HTML을 쓴다.** 예전에는 벡터만 이걸 건너뛰었고(「래스터 프레임이 판
	 *    전체를 이미지로 덮어 인쇄용 벡터의 목적을 없앤다」), 그 결과 PDF·SVG에서 배경이 통째로
	 *    사라졌다. 거짓 이항대립이었다 — 셰이더 그라디언트는 원리적으로 벡터가 될 수 없고, 벡터의
	 *    목적(글자·로고가 선명한 것)은 전경이 지킨다. 조용히 없어지는 쪽이 훨씬 나쁘다.
	 * 🔑 정지 이미지 계열(png·jpeg·tiff·pdf·svg)이 이걸 공유한다. MP4만 프레임마다 셰이더를 다시
	 *    그려야 하므로 `videoArtifact`가 따로 합성한다.
	 */
	const exportHtml = useCallback((): string => {
		if (background.state.type !== 'graphic') return composedHtml
		// 🔴 **내보내기는 미리보기와 같은 조건으로 판단한다.** 캔버스는 고른 그래픽 설정이 있을 때만
		//    셰이더를 그리므로(`template-canvas`의 `graphicConfig &&`), 목록이 비었거나 id가 안 맞으면
		//    화면에도 그래픽이 없다. 그때 아래 가드가 걸리면 **모든 형식의 내보내기가 영구 차단된다** —
		//    창작자가 고칠 방법이 없는 「막힌 실패」다. 그릴 것이 없으면 화면처럼 그래픽 없이 낸다.
		const selected = background.graphicConfigs.some(
			(candidate) => candidate.id === background.state.graphicConfigId,
		)
		if (!selected) return composedHtml
		// 🔴 캡처가 등록되기 전에 내보내면 배경이 **조용히 빠진 판**이 나간다 — `composedHtml`은
		//    캔버스 자리를 transparent로 비워 두기 때문이다. 창작자가 스스로 고칠 수 있는 사유이므로
		//    거부하고 알린다(`useExport`가 이 message를 화면에 그대로 띄운다).
		const graphicFrame = graphicFrameRef.current?.()
		if (!graphicFrame) {
			throw new Error('그래픽 배경 미리보기가 준비된 뒤 다시 시도해 주세요.')
		}
		return composeTemplateHtml(
			composedHtml,
			{},
			{ canvasBackground: { imageUrl: graphicFrame } },
		)
	}, [background.graphicConfigs, background.state, composedHtml])
	const artifact = useCallback(
		(): TemplateRasterArtifact =>
			createTemplateRasterArtifact({ height, html: exportHtml(), width }),
		[exportHtml, height, width],
	)
	const vectorArtifact = useCallback(
		() =>
			createTemplateVectorArtifact({
				height,
				html: exportHtml(),
				// 레이어 패널과 같은 정본을 읽는다 — 화면의 묶음과 PDF의 그룹이 갈라지지 않는다.
				nodeLayers: mapTemplateNodeLayers(config.template.slots),
				width,
			}),
		[config.template.slots, exportHtml, height, width],
	)
	// 배경이 graphic이어도 video artifact를 내지 않는 runtime이 있다(forward-straight는 vector·raster뿐).
	// 타입만 보고 MP4를 Video 경로로 돌리면 producer가 던진다 — 선언을 보고 정적 MP4로 떨어뜨린다.
	const supportsBackgroundVideo =
		background.state.type === 'graphic' &&
		Boolean(
			background.graphicConfigs.find(
				(candidate) => candidate.id === background.state.graphicConfigId,
			)?.artifacts.video,
		)
	const videoArtifact = useCallback(
		(size: { width: number; height: number }): Promise<TemplateVideoArtifact> => {
			const graphicVideo = graphicVideoRef.current
			if (!graphicVideo) throw new Error('그래픽 배경 미리보기가 준비되지 않았습니다.')
			// composedHtml은 배경이 graphic일 때 캔버스 배경을 transparent로 비운다 — 그 위에 겹친다.
			// 캔버스 크기가 아니라 요청된 프레임 크기로 굽는다 — 배율을 올려도 전경이 흐려지지 않는다.
			return createTemplateVideoArtifact({
				background: graphicVideo,
				height: size.height,
				html: composedHtml,
				width: size.width,
			})
		},
		[composedHtml],
	)

	const value = useMemo<TemplateStudioValue>(
		() => ({
			navigation,
			editing,
			sampleImages,
			config,
			text,
			images,
			vectors,
			layers,
			background,
			focus,
			canvas: {
				html: composedHtml,
				artifact,
				vectorArtifact,
				videoArtifact: supportsBackgroundVideo ? videoArtifact : null,
				previewRef,
				registerGraphicFrame,
				registerGraphicVideo,
			},
			execution: { controllerValues },
		}),
		[
			artifact,
			editing,
			background,
			supportsBackgroundVideo,
			composedHtml,
			sampleImages,
			config,
			controllerValues,
			focus,
			images,
			layers,
			navigation,
			registerGraphicFrame,
			registerGraphicVideo,
			text,
			vectorArtifact,
			vectors,
			videoArtifact,
		],
	)

	return <TemplateStudioContext.Provider value={value}>{children}</TemplateStudioContext.Provider>
}

async function requestTemplateImageGeneration(
	prompt: string,
	contract: ResolvedTemplateImageConfig,
) {
	try {
		const result = await requestImageGeneration({
			prompt: resolvedPrompt(prompt, contract),
			count: 1,
			profileId: contract.config.id,
			aspectRatio: contract.ratio.defaultValue,
			imageSize: contract.imageSize,
		})
		return result.generatedImages?.[0]
	} catch (requestError) {
		console.error(requestError)
		return undefined
	}
}

function selectImageProfile(
	current: Record<string, TemplateImageSlotState>,
	slotId: string,
	profileId: number,
	contracts: readonly ResolvedTemplateImageConfig[],
	overrides: TemplateImageConfigSlot['featureOverrides'] | undefined,
) {
	const previous = current[slotId]
	const contract = contracts.find((candidate) => candidate.config.id === profileId)
	if (!previous || previous.generating || !contract) return current
	return {
		...current,
		[slotId]: {
			...previous,
			profileId,
			prompt: contract.prompt.defaultValue ?? '',
			featureValues: initialFeatureValues(contract, overrides),
			error: null,
		},
	}
}

function initialTemplateTextValues(
	config: TemplateStudioConfig,
	slots: readonly TemplateTextSlot[],
): Record<string, string> {
	return Object.fromEntries(
		slots.map((slot) => {
			const definition = findTemplateControl(config, slot.controlId)
			return [slot.id, definition?.kind === 'text' ? (definition.defaultValue ?? '') : '']
		}),
	)
}

function updateTemplateText(
	current: Record<string, string>,
	config: TemplateStudioConfig,
	slots: readonly TemplateTextSlot[],
	slotId: string,
	next: string,
): Record<string, string> {
	const slot = slots.find((candidate) => candidate.id === slotId)
	const definition = slot ? findTemplateControl(config, slot.controlId) : undefined
	return definition?.kind === 'text' && acceptsControllerDraftValue(definition, next)
		? { ...current, [slotId]: next }
		: current
}

function updateTemplateColor(
	current: string | null,
	definition: ControllerControlDefinition | undefined,
	next: string | null,
): string | null {
	return definition?.kind === 'color' && acceptsControllerDraftValue(definition, next)
		? next
		: current
}

function updateTemplateBackgroundColor(
	current: TemplateBackgroundState,
	definition: ControllerControlDefinition | undefined,
	next: string | null,
): TemplateBackgroundState {
	const color = updateTemplateColor(current.color, definition, next)
	return color === current.color ? current : { ...current, color }
}

function updateTemplateImageSlot(
	current: Record<string, TemplateImageSlotState>,
	slotId: string,
	patch: TemplateImageSlotPatch,
	contracts: readonly ResolvedTemplateImageConfig[],
) {
	const previous = current[slotId]
	if (!previous) return current
	const contract = contracts.find((candidate) => candidate.config.id === previous.profileId)
	const prompt =
		typeof patch.prompt === 'string' &&
		contract &&
		acceptsControllerDraftValue(contract.prompt, patch.prompt)
			? patch.prompt
			: undefined
	return {
		...current,
		[slotId]: {
			...previous,
			...(patch.imageMode === undefined ? {} : { imageMode: patch.imageMode }),
			...(prompt === undefined ? {} : { prompt }),
			...(patch.transform === undefined ? {} : { transform: patch.transform }),
			...(patch.dimmer === undefined ? {} : { dimmer: patch.dimmer }),
			...(patch.dimmerOpacity === undefined ? {} : { dimmerOpacity: patch.dimmerOpacity }),
		},
	}
}

function applyImageRequestResult(
	current: Record<string, TemplateImageSlotState>,
	slotId: string,
	requestProfileId: number,
	patch: Partial<Pick<TemplateImageSlotState, 'image' | 'error'>>,
) {
	const previous = current[slotId]
	if (!previous || previous.profileId !== requestProfileId) return current
	return {
		...current,
		[slotId]: { ...previous, ...patch, ...(patch.image ? { transform: undefined } : {}) },
	}
}

/** patch의 모든 키를 반영해야 한다 — 키를 빠뜨리면 컨트롤이 눌려도 상태가 안 바뀐다(2026-08-20 디머 실사고). export는 그 회귀 테스트용. */
export function updateTemplateBackground(
	current: TemplateBackgroundState,
	patch: TemplateBackgroundPatch,
	contracts: readonly ResolvedTemplateImageConfig[],
): TemplateBackgroundState {
	const contract = contracts.find((candidate) => candidate.config.id === current.profileId)
	const prompt =
		typeof patch.prompt === 'string' &&
		contract &&
		acceptsControllerDraftValue(contract.prompt, patch.prompt)
			? patch.prompt
			: undefined
	return {
		...current,
		...(patch.imageMode === undefined ? {} : { imageMode: patch.imageMode }),
		...(prompt === undefined ? {} : { prompt }),
		...(patch.dimmer === undefined ? {} : { dimmer: patch.dimmer }),
		...(patch.dimmerOpacity === undefined ? {} : { dimmerOpacity: patch.dimmerOpacity }),
	}
}

function selectBackgroundType(
	current: TemplateBackgroundState,
	definition: ControllerControlDefinition | undefined,
	next: ControllerControlValue,
): TemplateBackgroundState {
	if (
		definition?.kind !== 'select' ||
		typeof next !== 'string' ||
		!isBackgroundType(next) ||
		!acceptsControllerDraftValue(definition, next)
	) {
		return current
	}
	return { ...current, type: next }
}

function selectBackgroundImageProfile(
	current: TemplateBackgroundState,
	profileId: number,
	contracts: readonly ResolvedTemplateImageConfig[],
): TemplateBackgroundState {
	const contract = contracts.find((candidate) => candidate.config.id === profileId)
	if (!contract || current.generating) return current
	return {
		...current,
		profileId,
		prompt: contract.prompt.defaultValue ?? '',
		featureValues: initialFeatureValues(contract),
		error: null,
	}
}

function selectBackgroundGraphicConfig(
	current: TemplateBackgroundState,
	configId: string,
	configs: readonly GraphicStudioConfig[],
): TemplateBackgroundState {
	const config = configs.find((candidate) => candidate.id === configId)
	if (!config) return current
	return {
		...current,
		graphicConfigId: config.id,
		graphicValues: createControllerValues(config.controller.groups),
	}
}

export function updateBackgroundGraphic(
	current: TemplateBackgroundState,
	controlId: string,
	next: ControllerControlValue,
	configs: readonly GraphicStudioConfig[],
	viewport: { width: number; height: number },
): TemplateBackgroundState {
	const config = configs.find((candidate) => candidate.id === current.graphicConfigId)
	if (!config) return current
	const groups = getGraphicStudioRuntimeGroups(config, current.graphicValues)
	const definition = groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === controlId)
	const binding = getGraphicStudioRuntimeBindings(config, viewport)[controlId]
	if (!definition || !acceptsControllerDraftValue(definition, next, binding)) {
		return current
	}
	if (controlId === 'preset')
		return { ...current, graphicValues: createGraphicPresetValues(config, next) }
	const graphicValues: ControllerValues = { ...current.graphicValues, [controlId]: next }
	const previous = new Map(
		groups.flatMap((group) =>
			group.controls.map((control) => [control.id, control.defaultValue] as const),
		),
	)
	for (const group of getGraphicStudioRuntimeGroups(config, graphicValues)) {
		for (const control of group.controls) {
			if (control.id === controlId) continue
			if (
				followsChangedDefault(
					graphicValues[control.id],
					previous.get(control.id),
					control.defaultValue,
				)
			)
				graphicValues[control.id] = control.defaultValue
		}
	}
	return {
		...current,
		graphicValues,
	}
}

function updateBackgroundFeature(
	current: TemplateBackgroundState,
	controlId: string,
	next: ControllerControlValue,
	contracts: readonly ResolvedTemplateImageConfig[],
): TemplateBackgroundState {
	const contract = contracts.find((candidate) => candidate.config.id === current.profileId)
	if (!contract) return current
	const binding = getBackgroundFeatureBindings(contract)[controlId]
	const definition = contract.config.controller.groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === controlId)
	if (!binding || !definition || !acceptsControllerDraftValue(definition, next, binding)) {
		return current
	}
	return {
		...current,
		featureValues: { ...current.featureValues, [controlId]: next },
	}
}

function getBackgroundFeatureBindings(
	contract: ResolvedTemplateImageConfig | undefined,
): ControllerRuntimeBindings {
	return contract
		? Object.fromEntries(
				getImageStudioFeatureControlIds(contract.config).map((id) => [
					id,
					{ availability: 'disabled' as const },
				]),
			)
		: {}
}

function templateControllerValues(
	config: TemplateStudioConfig,
	textSlots: readonly TemplateTextSlot[],
	textValues: Readonly<Record<string, string>>,
	textColor: string | null,
	background: TemplateBackgroundState,
): ControllerValues {
	const values = createControllerValues(config.controller.groups)
	for (const slot of textSlots) {
		if (textValues[slot.id] !== undefined) values[slot.controlId] = textValues[slot.id]
	}
	if (config.template.textColorControlId) {
		values[config.template.textColorControlId] = textColor
	}
	const backgroundSlot = partitionTemplateSlots(config.template.slots).background
	if (backgroundSlot) {
		values[backgroundSlot.typeControlId] = background.type
		values[backgroundSlot.colorControlId] = background.color
		values[backgroundSlot.dimmerControlId] = background.dimmer
		values[backgroundSlot.dimmerOpacityControlId] = background.dimmerOpacity
	}
	return values
}

function initialImageState(
	slot: TemplateImageConfigSlot,
	contracts: readonly ResolvedTemplateImageConfig[],
): TemplateImageSlotState {
	const profileId =
		slot.imageConfig.mode === 'pinned' ? slot.imageConfig.configId : contracts[0]?.config.id
	return {
		profileId,
		// 슬롯은 생성이 먼저 있던 자리라 기존 흐름을 첫 화면으로 둔다 — Preset은 한 번 눌러 연다.
		imageMode: 'generate',
		prompt:
			contracts.find((contract) => contract.config.id === profileId)?.prompt.defaultValue ??
			'',
		generating: false,
		featureValues: initialFeatureValues(
			contracts.find((contract) => contract.config.id === profileId),
			slot.featureOverrides,
		),
		error:
			contracts.length > 0
				? null
				: slot.imageConfig.mode === 'pinned'
					? PINNED_CONFIG_ERROR_MESSAGE
					: SELECTABLE_CONFIG_ERROR_MESSAGE,
	}
}

function initialBackgroundState(
	config: TemplateStudioConfig,
	slot: TemplateBackgroundSlot | undefined,
	contracts: readonly ResolvedTemplateImageConfig[],
): TemplateBackgroundState {
	const typeControl = slot ? findTemplateControl(config, slot.typeControlId) : undefined
	const colorControl = slot ? findTemplateControl(config, slot.colorControlId) : undefined
	const dimmerControl = slot ? findTemplateControl(config, slot.dimmerControlId) : undefined
	const dimmerOpacityControl = slot
		? findTemplateControl(config, slot.dimmerOpacityControlId)
		: undefined
	const type =
		typeControl?.kind === 'select' && isBackgroundType(typeControl.defaultValue)
			? typeControl.defaultValue
			: 'color'
	return {
		type,
		imageMode: 'preset',
		color: colorControl?.kind === 'color' ? colorControl.defaultValue : null,
		profileId: contracts[0]?.config.id,
		prompt: contracts[0]?.prompt.defaultValue ?? '',
		generating: false,
		featureValues: initialFeatureValues(contracts[0]),
		graphicConfigId: config.template.graphicConfigs[0]?.id,
		graphicValues: config.template.graphicConfigs[0]
			? createControllerValues(config.template.graphicConfigs[0].controller.groups)
			: {},
		error: contracts.length > 0 ? null : SELECTABLE_CONFIG_ERROR_MESSAGE,
		dimmer: dimmerControl?.kind === 'toggle' ? dimmerControl.defaultValue : false,
		dimmerOpacity:
			dimmerOpacityControl?.kind === 'range' ? dimmerOpacityControl.defaultValue : 0,
	}
}

function initialFeatureValues(
	contract: ResolvedTemplateImageConfig | undefined,
	overrides?: TemplateImageConfigSlot['featureOverrides'],
): ControllerValues {
	if (!contract) return {}
	const values = createControllerValues(contract.config.controller.groups)
	const color = getImageColorAdjustmentControls(contract.config)
	const override = overrides?.colorAdjustment
	if (!color || !override) return values
	return {
		...values,
		...(acceptsControllerDraftValue(color.line, override.line)
			? { [color.line.id]: override.line }
			: {}),
		...(color.background &&
		override.background &&
		acceptsControllerDraftValue(color.background, override.background)
			? { [color.background.id]: override.background }
			: {}),
	}
}

function validPrompt(prompt: string, contract: ResolvedTemplateImageConfig) {
	return acceptsImagePromptExecution(contract.prompt, prompt)
}

function resolvedPrompt(prompt: string, contract: ResolvedTemplateImageConfig) {
	return resolveImagePromptExecution(contract.prompt, prompt)
}

function isBackgroundType(value: string | null): value is TemplateBackgroundType {
	return value === 'color' || value === 'image' || value === 'graphic'
}

/** 고른 순간의 표시 정보까지 세션에 담는다 — 목록을 다시 열지 않아도 카드가 그려진다. */
function toAssignedSampleImage(option: SampleImageOption): TemplateAssignedImage {
	return {
		kind: 'sample',
		url: option.url,
		sampleImageId: option.id,
		name: option.name,
		alt: option.alt,
		thumbnailUrl: option.thumbnailUrl,
		lineArt: option.lineArt,
	}
}
