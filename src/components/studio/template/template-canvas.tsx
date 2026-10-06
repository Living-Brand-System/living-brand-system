'use client'

import {
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { ControllerBar } from '@/components/shared/controller'
import { fitPreviewSize } from '@/components/studio/shared/fit-preview-size'
import {
	DEFAULT_PREVIEW_SIZE,
	PreviewSizeControl,
} from '@/components/studio/shared/preview-size-control'
import {
	clampSlotBox,
	outsetSlotBox,
	type SlotHighlightBox,
	slotHighlightStyle,
	slotHoverStyle,
} from '@/components/studio/template/slot-highlight'
import { Typography } from '@/components/ui/typography'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import {
	type GraphicRuntime,
	loadGraphicRuntimeAdapter,
} from '@/features/graphic-generation/runtime/client/graphic-runtime.client'
import {
	TEMPLATE_BACKGROUND_SECTION_ID,
	templateSlotFocusTarget,
} from '@/features/template-customization/contexts/template-studio-context'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import {
	type ControllerValues,
	controllerRemountKey,
} from '@/modules/studio-controller/controller-definition'

/** 클릭으로 볼 만큼의 움직임 — 이보다 많이 끌었으면 그래픽 조작이지 선택이 아니다. */
const CLICK_SLOP_PX = 4

/**
 * 템플릿 스튜디오의 작업 공간(미리보기 캔버스) — 사이드바를 모른다.
 * 합성 결과와 미리보기 ref는 TemplateStudioProvider 컨텍스트로만 주고받는다.
 * 미리보기는 동일-문서 렌더(어드민 캔버스는 same-origin iframe) — opaque origin iframe은 벡터 mask의
 * CORS 로드를 깨뜨린다. 임포트 HTML은 스크립트 없는 inline-style이다.
 *
 * 🔑 **판을 클릭하면 거기 있는 것이 선택된다** — 레이어 패널과 같은 `select()`를 부르므로 우측
 *    컨트롤과 판 하이라이트가 한 번에 따라온다. 입구가 둘이 됐을 뿐 상태는 그대로다.
 */
export function TemplateCanvas() {
	const { config, canvas, background, focus, layers, editing } = useTemplateStudio()
	const { width, height } = config.template.exportOption.canvas
	const stageRef = useRef<HTMLDivElement>(null)
	const [preview, setPreview] = useState({ width, height })
	const [previewSize, setPreviewSize] = useState(DEFAULT_PREVIEW_SIZE)
	const scale = preview.width / width
	const graphicConfig = config.template.graphicConfigs.find(
		(candidate) => candidate.id === background.state.graphicConfigId,
	)

	/**
	 * 판에서 클릭한 노드 → 그 노드가 속한 슬롯의 종류. 배경은 노드가 아니라 도화지라 여기 없다.
	 */
	const slotKindByNodeId = useMemo(
		() =>
			new Map(
				config.template.slots.flatMap((slot) =>
					slot.kind === 'background' ? [] : [[slot.id, slot.kind] as const],
				),
			),
		[config.template.slots],
	)
	/**
	 * 🔴 배경이 graphic이면 주입 HTML 전체가 `pointer-events:none`이다(그 밑의 셰이더를 끌 수 있게).
	 *    그대로 두면 슬롯을 눌러도 이벤트가 셰이더로 새어 **무엇을 눌렀는지 알 수 없다.**
	 *    슬롯 노드에만 되돌린다 — 빈 자리는 계속 셰이더가 받으므로 드래그가 산다.
	 * 🔑 미리보기 DOM만 만진다. 내보내기는 `exportHtml()`이 문자열을 다시 합성하므로 산출물에
	 *    흔적이 남지 않는다(focus가 「내보내는 HTML에 흔적을 남기지 않는다」는 계약 그대로).
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: canvas.html은 읽는 값이 아니라 **다시 칠할 방아쇠**다 — 합성 결과가 갈리면 노드가 통째로 새로 생긴다
	useLayoutEffect(() => {
		const root = canvas.previewRef.current
		if (!root) return
		for (const node of root.querySelectorAll<HTMLElement>('[data-node-id]')) {
			if (slotKindByNodeId.has(node.getAttribute('data-node-id') ?? '')) {
				node.style.pointerEvents = 'auto'
				// 🔑 커서는 상속되지만 슬롯에는 직접 준다 — 배경이 없어 판 전체가 기본 커서인
				//    템플릿에서도 슬롯 위에서는 「누를 수 있다」가 보여야 한다.
				node.style.cursor = 'pointer'
			}
		}
	}, [canvas.html, canvas.previewRef, slotKindByNodeId])

	/**
	 * 판을 눌렀을 때 **거기 있는 것**을 고른다 — 배경을 따로 가르지 않는다(사용자 지시, 2026-09-29).
	 * 슬롯을 만나면 그 종류, 아무것도 안 만나고 루트까지 올라가면 그것이 곧 배경(도화지)이다.
	 *
	 * 🔴 캔버스에서는 **풀리지 않는다.** 레이어 패널은 재클릭이 해제지만, 판에서 글자를 두 번 눌렀는데
	 *    컨트롤이 사라지면 조작이 죽은 것처럼 보인다.
	 * 🔑 하이라이트는 **누른 것 하나만** 밝힌다(사용자 지시) — 선택은 종류 전체이되, 「내가 이걸
	 *    눌렀다」가 판에서 보여야 하기 때문이다. 사이드바에서 한 행에 포커스를 줄 때와 같은 모양이다.
	 */
	const clickAreaRef = useRef<HTMLDivElement>(null)
	/**
	 * 포인터 아래의 슬롯을 찾는다 — hover 미리보기와 클릭이 **같은 규칙**을 쓴다.
	 * 🔴 판 상자에서 멈춘다 — 그래픽 셰이더는 주입 HTML의 **형제**라, 주입 루트를 끝으로 삼으면
	 *    그 위의 포인터가 조상을 끝까지 거슬러 올라간다.
	 */
	const slotAt = useCallback(
		(from: Element | null) => {
			const stop = clickAreaRef.current
			for (let node = from; node && node !== stop; node = node.parentElement) {
				const nodeId = node.getAttribute('data-node-id')
				const kind = nodeId ? slotKindByNodeId.get(nodeId) : undefined
				if (nodeId && kind) return { node, nodeId, kind }
			}
			return null
		},
		[slotKindByNodeId],
	)

	const selectAt = useCallback(
		(from: Element | null) => {
			if (editing.targetId) return
			const found = slotAt(from)
			if (found) {
				layers.select(found.kind)
				// 🔑 글자를 누른 사람은 곧바로 칠 참이다 — 커서까지 그 입력칸으로 옮긴다.
				//    커서가 판이 아니라 **우측 컨트롤러**에 생기는 것이 이 스튜디오의 규칙이다.
				focus.set(
					templateSlotFocusTarget(found.kind, found.nodeId, {
						caret: found.kind === 'text',
					}),
				)
				return
			}
			layers.select('background')
			focus.set({ sectionId: TEMPLATE_BACKGROUND_SECTION_ID, kind: 'canvas' })
		},
		[focus.set, layers.select, slotAt, editing.targetId],
	)

	/**
	 * 지나가는 자리를 옅게 비춘다 — **지금 누르면 무엇이 잡히는지**를 먼저 보여 준다
	 * (사용자 지시, 2026-09-29).
	 *
	 * 🔴 배경은 뺀다. 도화지를 덮는 면은 판 어디에 있든 늘 켜져 있어 아무것도 알려 주지 않는다.
	 * 🔑 지날 때 바로 재고 끝낸다 — 상시 측정을 두면 이미지·폰트가 늦게 도착할 때마다 다시 재야 한다.
	 * 🔑 겹친 슬롯은 고려하지 않는다(사용자 지시) — 맨 위에 그려진 것을 브라우저가 이미 골라 준다.
	 */
	const [hoverBox, setHoverBox] = useState<SlotHighlightBox | null>(null)
	const previewHover = (from: Element | null) => {
		const root = canvas.previewRef.current
		const found = slotAt(from)
		if (!found || !root) {
			setHoverBox(null)
			return
		}
		setHoverBox(
			clampSlotBox(found.node.getBoundingClientRect(), root.getBoundingClientRect(), {
				width,
				height,
			}),
		)
	}

	// 끌기와 클릭을 가른다 — 그래픽 핸들을 끌고 놓는 것이 선택으로 읽히면 안 된다.
	const pressRef = useRef<{ x: number; y: number } | null>(null)
	const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
		pressRef.current = { x: event.clientX, y: event.clientY }
	}
	const onPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
		const press = pressRef.current
		pressRef.current = null
		if (!press) return
		const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y)
		if (moved <= CLICK_SLOP_PX) selectAt(event.target as Element | null)
	}

	const target = focus.target
	const [highlights, setHighlights] = useState<readonly SlotHighlightBox[]>([])
	// biome-ignore lint/correctness/useExhaustiveDependencies: canvas.html은 본문이 읽는 값이 아니라 **재측정 방아쇠**다 — 그 문자열이 바뀌면 subtree가 통째로 갈려 슬롯의 사각형이 달라진다(정적 분석이 볼 수 없는 의존이다)
	useLayoutEffect(() => {
		const root = canvas.previewRef.current
		if (!root || !target) {
			setHighlights([])
			return
		}
		// 🔴 배경은 노드가 아니라 도화지를 집는다 — 잴 것이 없고 캔버스 상자가 곧 답이다.
		if (target.kind === 'canvas') {
			setHighlights([{ left: 0, top: 0, width, height }])
			return
		}
		const rootRect = root.getBoundingClientRect()
		// 🔑 nodeId에 콜론이 섞여 선택자를 조립하지 않는다 — compose와 같은 규칙(순회 후 정확 일치).
		const nodes = Array.from(root.querySelectorAll('[data-node-id]'))
		setHighlights(
			target.nodeIds.flatMap((nodeId) => {
				const node = nodes.find(
					(candidate) => candidate.getAttribute('data-node-id') === nodeId,
				)
				const box = node
					? clampSlotBox(node.getBoundingClientRect(), rootRect, { width, height })
					: null
				return box ? [box] : []
			}),
		)
	}, [canvas.html, canvas.previewRef, height, target, width])

	useEffect(() => {
		const stage = stageRef.current
		if (!stage) return
		/*
		 * 🔴 **`contentRect`(안쪽 상자)로만 잰다.** 무대는 테두리가 나갈 자리를 padding으로 두는데
		 *    `clientHeight`는 그 padding을 포함해서 돌려준다 — 그 값으로 맞추면 판이 여백만큼
		 *    커져 강조선이 갈 자리가 도로 없어진다(하단 예약 `pb-28`도 같은 이유로 새어 들어왔다).
		 * 🔑 `observe()`가 첫 콜백을 그리기 전에 한 번 주므로 처음 값도 여기서 온다.
		 */
		const observer = new ResizeObserver(([entry]) => {
			const bounds = entry?.contentRect
			if (bounds && bounds.width > 0 && bounds.height > 0) {
				setPreview(fitPreviewSize(bounds, { width, height }))
			}
		})
		observer.observe(stage)
		return () => observer.disconnect()
	}, [height, width])

	return (
		/*
		 * 🔴 하단 예약(`pb-28`)의 근거는 graphic-canvas.tsx와 같다 — 떠 있는 바가 프리뷰를 덮지 않게.
		 * 🔴 사방의 `p-1`은 **강조선이 나갈 자리**다. `overflow:hidden`은 padding 상자에서 자르므로
		 *    판을 안쪽 상자에 맞추면 그 여백이 고스란히 선의 몫으로 남는다. 판을 줄여서 여백을
		 *    만들면 안 된다 — 가운데 정렬이 남는 자리를 반씩 나눠 주다 보니 아래는 `pb-28` 덕에
		 *    남아돌고 **위만 1px로 빠듯해져 도화지를 고를 때 윗변이 잘렸다**(2026-09-30 실측).
		 */
		<div
			ref={stageRef}
			className="relative grid h-full min-h-0 min-w-0 overflow-hidden p-1 lg:pb-28"
		>
			{/* 🔴 여기서 자르지 않는다 — 강조선이 판 **밖**에 그려지므로, 자르는 일은 안쪽
			    클릭 상자가 맡는다(주입 HTML과 그래픽 배경만 가둔다). */}
			<div
				data-slot="template-preview"
				className="relative m-auto shrink-0 shadow-lg transition-transform duration-(--motion-layout) ease-out motion-reduce:transition-none lg:[transform:scale(var(--preview-scale))]"
				style={
					{
						...preview,
						'--preview-scale': previewSize / 100,
						/*
						 * 투명 픽셀 바탕 — **조건을 따지지 않고 항상 맨 뒤에 깐다.** 판이 불투명하면
						 * 저절로 가려지고, 비치는 곳에서만 보인다. 「배경이 없다」가 한 가지가 아니라
						 * (그래픽 미선택 · Figma 원본이 투명 · 색 미지정) 추론하면 반드시 틀린다.
						 * 🔑 미리보기 전용이다 — 내보내기는 HTML을 다시 합성하므로 PNG의 투명이 살아 있다.
						 */
						backgroundImage:
							'conic-gradient(var(--muted) 25%, var(--background) 0 50%, var(--muted) 0 75%, var(--background) 0)',
						backgroundSize: '16px 16px',
					} as CSSProperties
				}
			>
				{/* 🔑 클릭은 **여기서** 받는다 — 주입 HTML과 그래픽 배경을 함께 담은 유일한 상자라,
				    둘 중 무엇을 눌렀든 같은 자리로 올라온다. */}
				<div
					ref={clickAreaRef}
					data-slot="template-click-area"
					className="relative overflow-hidden"
					onPointerDown={onPointerDown}
					onPointerUp={onPointerUp}
					onPointerOver={(event) => previewHover(event.target as Element | null)}
					onPointerLeave={() => setHoverBox(null)}
					style={{
						width,
						height,
						transform: `scale(${scale})`,
						transformOrigin: 'top left',
						/*
						 * 누를 수 있으면 누를 수 있는 커서(사용자 지시, 2026-09-29). 판 **안**은 어디를
						 * 눌러도 무언가 고르므로 배경 위에서도 손가락이다 — 배경 슬롯은 정책과 무관하게
						 * 항상 만들어져(`template-studio-config`) 「고를 것이 없는 자리」가 판 안에 없다.
						 * 🔑 판 **밖**(회색 무대)은 이 상자 밖이라 저절로 기본 커서다.
						 */
						cursor: 'pointer',
					}}
				>
					{background.state.type === 'graphic' && graphicConfig && (
						<TemplateGraphicBackground
							config={graphicConfig}
							values={background.state.graphicValues}
							width={width}
							height={height}
						/>
					)}
					<div
						ref={canvas.previewRef}
						data-background-type={background.state.type}
						className="relative h-full w-full data-[background-type=graphic]:pointer-events-none"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: 서버 컨버터가 만든 inline-style HTML(스크립트 없음) — 어드민 캔버스와 동일 렌더
						dangerouslySetInnerHTML={{ __html: canvas.html }}
					/>
				</div>
				{/* 🔴 자르는 상자 **밖**이다 — 강조선이 판 밖에 그려지므로 안에 두면 도화지와 변에
				    달라붙은 슬롯에서 선이 통째로 사라진다. 판과 같은 좌표계·같은 배율을 쓴다.
				    🔑 여러 개인 이유: Text 섹션은 텍스트 상자를 전부 집는다. */}
				<div
					data-slot="template-overlays"
					className="pointer-events-none absolute top-0 left-0"
					style={{
						width,
						height,
						transform: `scale(${scale})`,
						transformOrigin: 'top left',
					}}
				>
					{/* hover가 먼저 깔린다 — 고른 것의 테두리를 가리지 않는다. */}
					{hoverBox && (
						<div
							data-slot="template-slot-hover"
							style={{
								...slotHoverStyle(scale, focus.color),
								...outsetSlotBox(hoverBox, scale),
							}}
						/>
					)}
					{highlights.map((box) => (
						<div
							key={`${box.left}:${box.top}:${box.width}:${box.height}`}
							data-slot="template-slot-highlight"
							style={{
								// 도화지 전체를 집을 때는 면을 깔지 않는다 — 가릴 것과 구별할 것이 없다.
								...slotHighlightStyle(
									scale,
									focus.color,
									target?.kind !== 'canvas',
								),
								...outsetSlotBox(box, scale),
							}}
						/>
					))}
				</div>
			</div>
			<ControllerBar placement="canvas">
				<PreviewSizeControl value={previewSize} onChange={setPreviewSize} />
			</ControllerBar>
		</div>
	)
}

type TemplateGraphicBackgroundProps = {
	config: GraphicStudioConfig
	values: ControllerValues
	width: number
	height: number
}

function TemplateGraphicBackground({
	config,
	values,
	width,
	height,
}: TemplateGraphicBackgroundProps) {
	const { background, canvas } = useTemplateStudio()
	const containerRef = useRef<HTMLDivElement>(null)
	const runtimeRef = useRef<GraphicRuntime>(null)
	const valuesRef = useRef(values)
	const updateRef = useRef(background.updateGraphic)
	const [error, setError] = useState<string | null>(null)
	// 🔴 「모양」처럼 셰이더 프로그램을 갈아끼우는 축은 update로 반영되지 않는다 — 이 지문이
	//    바뀌면 런타임을 다시 세운다. Graphic 캔버스와 같은 함수를 쓴다(한쪽만 갖고 있으면
	//    Template 배경에서만 모양이 안 갈린다).
	const remountKey = controllerRemountKey(config.controller.remountOn, values)
	useEffect(() => {
		valuesRef.current = values
		runtimeRef.current?.update(values)
	}, [values])

	useEffect(() => {
		updateRef.current = background.updateGraphic
	}, [background.updateGraphic])

	// biome-ignore lint/correctness/useExhaustiveDependencies(remountKey): 위 주석 — 재마운트 트리거다
	useEffect(() => {
		const container = containerRef.current
		if (!container) return

		let runtime: GraphicRuntime | undefined
		let disposed = false
		setError(null)
		void loadGraphicRuntimeAdapter(config)
			.then((adapter) => {
				if (disposed) return null
				if (!adapter) throw new Error('Unsupported graphic runtime.')
				return adapter.mount({
					container,
					values: valuesRef.current,
					onChange: (controlId, value) => {
						updateRef.current(controlId, value)
						return true
					},
				})
			})
			.then((mounted) => {
				if (!mounted) return
				if (disposed) {
					mounted.destroy()
					return
				}
				runtime = mounted
				runtimeRef.current = mounted
				mounted.resize(width, height)
				canvas.registerGraphicFrame(() => {
					const frame = mounted.artifacts.raster.source.withSurface(
						{ width, height },
						(surface) => {
							if (surface.kind !== 'canvas') {
								throw new Error('Graphic runtime did not provide a canvas surface.')
							}
							return surface.element.toDataURL()
						},
					)
					if (typeof frame !== 'string') {
						throw new Error('Graphic frame capture must be synchronous.')
					}
					return frame
				})
				canvas.registerGraphicVideo(mounted.artifacts.video?.source ?? null)
			})
			.catch((mountError) => {
				console.error(mountError)
				if (!disposed) setError('그래픽 미리보기를 불러오지 못했습니다.')
			})

		return () => {
			disposed = true
			canvas.registerGraphicFrame(null)
			canvas.registerGraphicVideo(null)
			runtime?.destroy()
			runtimeRef.current = null
		}
	}, [
		canvas.registerGraphicFrame,
		canvas.registerGraphicVideo,
		config,
		height,
		remountKey,
		width,
	])

	return (
		<div
			ref={containerRef}
			data-slot="template-graphic-background"
			className="absolute inset-0 overflow-hidden [&>canvas]:block"
		>
			{error && (
				<Typography role="alert" size="sm" className="p-4 text-destructive">
					{error}
				</Typography>
			)}
		</div>
	)
}
