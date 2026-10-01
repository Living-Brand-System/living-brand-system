'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	ImageStudioContext,
	type ImageStudioValue,
} from '@/features/image-generation/contexts/image-studio-context'
import {
	acceptsHistoryRestore,
	type GeneratedImageHistoryItem,
} from '@/features/image-generation/domain/generated-image-history'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import {
	acceptsImagePromptExecution,
	getImageColorAdjustmentControls,
	getImageStudioControls,
	getImageStudioFeature,
	type ImageStudioConfig,
} from '@/features/image-generation/domain/image-studio-config'
import {
	IMAGE_REFERENCE_UPLOAD_MAX_BYTES,
	IMAGE_REFERENCE_UPLOAD_MIME_TYPES,
} from '@/features/image-generation/domain/reference-image/contract'
import { useImageGeneration } from '@/features/image-generation/hooks/use-image-generation'
import type { ImageColorAdjustment } from '@/features/image-generation/runtime/image-colorize'
import { fetchImageStudioConfigs } from '@/features/image-generation/services/list-image-studio-configs.client'
import { useLazyResource } from '@/hooks/use-lazy-resource'
import { getStudioImageRoute } from '@/lib/routes'
import {
	acceptsControllerDraftValue,
	type ControllerControlValue,
	type ControllerValues,
	createControllerValues,
} from '@/modules/studio-controller/controller-definition'
import { prepareReferenceImage } from '../runtime/reference-image/prepare-reference-image.client'

/**
 * 이미지 스튜디오 편집 세션의 단일 소유자 — Controller와 Canvas는 이 컨텍스트만 알고 서로를
 * 모른다. Definition은 기본값·제약을, Provider는 현재 값·runtime binding·도메인 액션을 소유한다.
 */
export function ImageStudioProvider({
	config: initial,
	children,
}: {
	config: ImageStudioConfig
	children: ReactNode
}) {
	// 교체 후보 전체는 자산 브라우저가 열릴 때 가져온다 — 페이지는 시작 계약 하나만 싣는다.
	const browse = useLazyResource(fetchImageStudioConfigs)
	// 세션에서 한 번이라도 쓴 계약은 남긴다 — 결과 카드가 그 결과를 만든 프로파일의 출력 능력을 되찾는다.
	const [configs, setConfigs] = useState<ImageStudioConfig[]>([initial])
	const [profileId, setProfileId] = useState(initial.id)
	const [values, setValues] = useState(() => createControllerValues(initial.controller.groups))
	const [angles, setAngles] = useState({ azimuthDeg: 0, elevationDeg: 0 })
	// 첨부는 저장하지 않는다 — 이 상태가 사본의 전부이고, 새로고침하면 사라진다.
	const [attachment, setAttachment] = useState<{ dataUri: string; name: string } | null>(null)
	const [referenceEnabled, setReferenceEnabled] = useState(true)
	// 처음에는 꺼져 있고 결과가 생겨도 저절로 켜지지 않는다. 프로파일이 바뀌면 다시 끈다.
	const [cameraEnabled, setCameraEnabled] = useState(false)
	const [preparing, setPreparing] = useState(false)
	const conversion = useRef<AbortController | null>(null)
	useEffect(() => () => conversion.current?.abort(), [])
	const [attachmentError, setAttachmentError] = useState<string | null>(null)
	const { error, generate, loading, requested, selected, session, setSelected } =
		useImageGeneration()

	const config = configs.find((item) => item.id === profileId) ?? initial
	const definitions = useMemo(() => getImageStudioControls(config), [config])
	const colorDefinitions = useMemo(() => getImageColorAdjustmentControls(config), [config])
	const supportsCamera = Boolean(getImageStudioFeature(config, 'camera-control'))
	const supportsReference = Boolean(getImageStudioFeature(config, 'reference-image'))
	const options = configs

	const prompt = stringValue(values[definitions.prompt.id], definitions.prompt.defaultValue)
	const batchValue = stringValue(values[definitions.batch.id], definitions.batch.defaultValue)
	const ratioValue = stringValue(values[definitions.ratio.id], definitions.ratio.defaultValue)
	const resolutionValue = stringValue(
		values[definitions.resolution.id],
		definitions.resolution.defaultValue,
	)
	const promptError =
		definitions.prompt.maxLength && prompt.length > definitions.prompt.maxLength
			? `프롬프트가 최대 ${definitions.prompt.maxLength}자를 초과했습니다.`
			: undefined
	const bindings = useMemo(
		() => (promptError ? { [definitions.prompt.id]: { error: promptError } } : {}),
		[definitions.prompt.id, promptError],
	)
	const canRun =
		acceptsImagePromptExecution(definitions.prompt, prompt) &&
		!promptError &&
		(!referenceEnabled || (!preparing && !attachmentError))

	const lineColor = colorDefinitions ? values[colorDefinitions.line.id] : undefined
	const backgroundColor = colorDefinitions?.background
		? values[colorDefinitions.background.id]
		: undefined
	const colorValue = useMemo<ImageColorAdjustment | null>(
		() =>
			typeof lineColor === 'string'
				? {
						line: lineColor,
						...(typeof backgroundColor === 'string'
							? { background: backgroundColor }
							: {}),
					}
				: null,
		[backgroundColor, lineColor],
	)
	// 그리드가 그리는 목록 — 참조가 있으면 0번을 차지한다.
	const items = useMemo(
		() =>
			session ? [...(session.reference ? [session.reference] : []), ...session.images] : [],
		[session],
	)
	const referenceIndex = session?.reference ? 0 : null
	const resultColor = items[0]?.profileId === config.id ? colorValue : null

	const update = useCallback(
		(controlId: string, value: ControllerControlValue) => {
			const definition = findControl(config, controlId)
			if (!definition || !acceptsControllerDraftValue(definition, value)) return
			setValues((current) => ({ ...current, [controlId]: value }))
		},
		[config],
	)

	// 원본을 서버로 보내지 않고 변환된 사본만 세션에 보관한다.
	const attachReference = useCallback(async (file: File) => {
		conversion.current?.abort()
		setPreparing(false)
		setAttachment(null)
		if (!(IMAGE_REFERENCE_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
			setAttachmentError('JPG, PNG, WebP 이미지만 첨부할 수 있어요.')
			return
		}
		if (file.size > IMAGE_REFERENCE_UPLOAD_MAX_BYTES) {
			setAttachmentError(
				`첨부 이미지는 ${Math.floor(IMAGE_REFERENCE_UPLOAD_MAX_BYTES / 1_000_000)}MB까지 올릴 수 있어요.`,
			)
			return
		}
		const controller = new AbortController()
		conversion.current = controller
		setPreparing(true)
		setAttachmentError(null)
		try {
			const blob = await prepareReferenceImage(file, controller.signal)
			const dataUri = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(String(reader.result))
				reader.onerror = () => reject(new Error('이미지를 읽지 못했어요.'))
				reader.readAsDataURL(blob)
			})
			if (!controller.signal.aborted) {
				setAttachment({ dataUri, name: file.name })
			}
		} catch (error) {
			if (!controller.signal.aborted) {
				setAttachmentError(
					error instanceof Error ? error.message : '이미지를 변환하지 못했어요.',
				)
			}
		} finally {
			if (!controller.signal.aborted) setPreparing(false)
		}
	}, [])

	const clearReference = useCallback(() => {
		conversion.current?.abort()
		setPreparing(false)
		setAttachment(null)
		setAttachmentError(null)
	}, [])

	const selectProfile = useCallback(
		(nextProfileId: number) => {
			const next = (browse.data ?? configs).find((item) => item.id === nextProfileId)
			if (!next) return
			clearReference()
			setReferenceEnabled(true)
			setCameraEnabled(false)
			setConfigs((current) =>
				current.some((item) => item.id === next.id) ? current : [...current, next],
			)
			setValues(createControllerValues(next.controller.groups))
			setProfileId(nextProfileId)
			// 딥링크와 같은 주소로 맞춘다 — 근거는 Graphic Provider의 같은 자리에 적혀 있다.
			if (next.image.slug)
				window.history.replaceState(null, '', getStudioImageRoute(next.image.slug))
		},
		[browse.data, configs, clearReference],
	)

	// 캔버스가 보여주는 과거 묶음과, 그 안에서 크게 볼 장.
	const [historyStack, setHistoryStack] = useState<readonly GeneratedImageHistoryItem[]>([])
	const [historySelectedId, setHistorySelectedId] = useState<number | null>(null)
	// 프로파일이 아직 안 실린 항목은 목록을 불러 온 뒤 이어서 얹는다.
	// 🔴 ref로 들고 있는다 — state로 두면 이 값이 컨텍스트를 다시 만들어 캔버스가 remount된다.
	const pendingHistory = useRef<GeneratedImageHistoryItem | null>(null)

	/**
	 * 고른 장의 값으로 편집 세션을 덮는다 — 확인 없이 통째로(사용자 지시, 2026-09-21).
	 *
	 * 🔑 저장된 것은 프롬프트·비율·해상도·프로파일뿐이다. 나머지 축(색·카메라·참조)은 그 결과를
	 *    만든 값을 복원할 방법이 없으므로 **프로파일 기본값으로 되돌린다.** 직전 값을 남겨 두면
	 *    화면의 컨트롤러가 어느 결과에도 속하지 않는 뒤섞인 상태가 된다.
	 */
	const restoreFromHistory = useCallback(
		(item: GeneratedImageHistoryItem) => {
			if (!acceptsHistoryRestore(item)) return
			const next =
				configs.find((candidate) => candidate.id === item.profileId) ??
				browse.data?.find((candidate) => candidate.id === item.profileId)
			if (!next) {
				// 목록이 오면 effect가 이어서 처리한다. load는 1회 가드가 있어 반복 호출이 안전하다.
				pendingHistory.current = item
				browse.load()
				return
			}
			pendingHistory.current = null
			clearReference()
			setReferenceEnabled(true)
			setCameraEnabled(false)
			setAngles({ azimuthDeg: 0, elevationDeg: 0 })
			setConfigs((current) =>
				current.some((candidate) => candidate.id === next.id)
					? current
					: [...current, next],
			)
			setProfileId(next.id)
			setValues(restoreHistoryValues(next, item))
		},
		[browse, clearReference, configs],
	)

	/**
	 * 묶음을 고른다 — **첫 장이 자동으로 선택된다**(사용자 지시, 2026-09-21).
	 * 🔑 고르기와 덮기는 별개다. 복원 값이 없어도 캔버스에는 올라간다.
	 */
	const selectHistoryStack = useCallback(
		(
			items: readonly GeneratedImageHistoryItem[],
			itemId?: number,
			options?: { restore?: boolean },
		) => {
			const picked = items.find((item) => item.id === itemId) ?? items[0]
			if (!picked) return
			setHistoryStack(items)
			setHistorySelectedId(picked.id)
			if (options?.restore !== false) restoreFromHistory(picked)
		},
		[restoreFromHistory],
	)

	useEffect(() => {
		const pending = pendingHistory.current
		if (!pending || !browse.data) return
		pendingHistory.current = null
		restoreFromHistory(pending)
	}, [browse.data, restoreFromHistory])

	// 참조는 한 번 정해지면 고정된다 — 조정본을 다시 참조로 삼지 않아 세대 누적 열화가 없다.
	// 고정된 참조도 프로파일 일치는 지켜야 한다 — 서버가 시드를 scenario로 조회하므로
	// 프로파일을 바꾼 뒤의 재생성은 언제나 InvalidSeedImageError가 된다.
	// 🔑 저장된 생성 결과로 고정된 참조만 계속 붙든다. 첨부로 만든 세션은 id가 없어 서버가 다시
	//    조회할 수 없으므로, 그 세션에서는 사용자가 고른 결과 카드가 다음 참조가 된다.
	const referenceImage = useMemo(() => {
		const pinned = session?.reference
		if (pinned?.generatedImageId) return pinned.profileId === config.id ? pinned : null
		const picked = selected === null ? undefined : items[selected]
		return picked?.generatedImageId && picked.profileId === config.id ? picked : null
	}, [config.id, items, selected, session])
	const cameraSeed = supportsCamera ? referenceImage : null

	const value = useMemo<ImageStudioValue>(
		() => ({
			profiles: { options, browse, select: selectProfile },
			history: {
				selectedId: historySelectedId,
				selectItem: setHistorySelectedId,
				selectStack: selectHistoryStack,
				stack: historyStack,
			},
			config,
			controls: { values, bindings, update },
			prompt: {
				value: prompt,
				setValue: (text) => update(definitions.prompt.id, text),
			},
			generation: {
				batch: Number(batchValue),
				setBatch: (count) => update(definitions.batch.id, String(count)),
				ratio: ratioValue as ImageAspectRatio,
				setRatio: (ratio) => update(definitions.ratio.id, ratio),
				resolution: resolutionValue as ImageOutputSize,
				setResolution: (resolution) => update(definitions.resolution.id, resolution),
				run: () => {
					if (!canRun) return
					// 계약이 첨부를 열지 않은 프로파일에서는 들고 있던 첨부도 보내지 않는다.
					const upload = supportsReference && referenceEnabled ? attachment : null
					void generate(
						{
							aspectRatio: ratioValue as ImageAspectRatio,
							count: Number(batchValue),
							imageSize: resolutionValue as ImageOutputSize,
							profileId: config.id,
							prompt,
							...(upload ? { reference: { upload: upload.dataUri } } : {}),
						},
						// 첨부도 참조라서 그리드 0번을 차지한다 — 무엇을 보고 만들었는지가 결과 옆에 남는다.
						upload
							? { src: upload.dataUri, generatedImageId: null, profileId: config.id }
							: null,
					)
				},
				canRun,
				busy: loading,
				error,
			},
			color: {
				value: colorValue,
				update: (patch) => {
					if (patch.line !== undefined && colorDefinitions) {
						update(colorDefinitions.line.id, patch.line)
					}
					if (patch.background !== undefined && colorDefinitions?.background) {
						update(colorDefinitions.background.id, patch.background)
					}
				},
			},
			reference: {
				enabled: supportsReference && referenceEnabled,
				setEnabled: (enabled: boolean) => {
					setReferenceEnabled(enabled)
					if (enabled) setCameraEnabled(false)
				},
				value: supportsReference ? (attachment?.dataUri ?? null) : null,
				name: supportsReference ? (attachment?.name ?? null) : null,
				error: attachmentError,
				preparing,
				attach: attachReference,
				clear: clearReference,
			},
			camera: {
				enabled: supportsCamera && cameraEnabled,
				setEnabled: (enabled: boolean) => {
					setCameraEnabled(enabled)
					if (enabled) setReferenceEnabled(false)
				},
				...angles,
				setAngles,
				seedImage: cameraSeed?.src ?? null,
				regenerate: () => {
					if (!supportsCamera || !cameraSeed?.generatedImageId || !session) return
					void generate(
						{
							// 참조가 만들어진 비율로 다시 그린다 — 같은 피사체를 다른 각도에서
							// 볼 뿐이라, 비율이 갈리면 그리드에서 참조 카드가 잘린다.
							aspectRatio: session.output.aspectRatio,
							camera: angles,
							count: 1,
							imageSize: resolutionValue as ImageOutputSize,
							profileId: config.id,
							// 참조가 프롬프트를 물려주므로 비워 보낸다.
							prompt: '',
							reference: { generatedImageId: cameraSeed.generatedImageId },
						},
						cameraSeed,
					)
				},
			},
			results: {
				metadata: session?.metadata,
				items,
				referenceIndex,
				color: resultColor,
				requested,
				selected,
				select: setSelected,
				output: session?.output ?? null,
			},
		}),
		[
			angles,
			attachReference,
			attachment,
			attachmentError,
			batchValue,
			bindings,
			browse,
			cameraEnabled,
			cameraSeed,
			canRun,
			clearReference,
			colorDefinitions,
			colorValue,
			config,
			definitions,
			error,
			generate,
			historySelectedId,
			historyStack,
			items,
			loading,
			options,
			prompt,
			preparing,
			ratioValue,
			referenceEnabled,
			referenceIndex,
			requested,
			resolutionValue,
			resultColor,
			selected,
			selectHistoryStack,
			selectProfile,
			session,
			setSelected,
			supportsCamera,
			supportsReference,
			update,
			values,
		],
	)

	return <ImageStudioContext.Provider value={value}>{children}</ImageStudioContext.Provider>
}

/**
 * 복원값 — 프로파일 기본값에서 시작해 저장돼 있던 축만 덮는다.
 * 🔴 현재 값을 물려받지 않는다. 저장이 없는 축(색·카메라)까지 남기면 어느 결과에도 속하지 않는
 *    상태가 되므로, 저장된 것만 복원하고 나머지는 기본값으로 되돌리는 쪽이 읽을 수 있다.
 */
function restoreHistoryValues(
	config: ImageStudioConfig,
	item: GeneratedImageHistoryItem & { prompt: string },
): ControllerValues {
	const next = createControllerValues(config.controller.groups)
	const definitions = getImageStudioControls(config)
	next[definitions.prompt.id] = item.prompt
	if (definitions.ratio.options.some((option) => option.value === item.aspectRatio)) {
		next[definitions.ratio.id] = item.aspectRatio
	}
	if (definitions.resolution.options.some((option) => option.value === item.imageSize)) {
		next[definitions.resolution.id] = item.imageSize
	}
	return next
}

function findControl(config: ImageStudioConfig, id: string) {
	return config.controller.groups
		.flatMap((group) => group.controls)
		.find((control) => control.id === id)
}

function stringValue(value: ControllerControlValue | undefined, fallback: string | null) {
	return typeof value === 'string' ? value : (fallback ?? '')
}
