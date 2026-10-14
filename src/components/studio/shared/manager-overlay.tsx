'use client'

import { Close } from '@carbon/icons-react'
import { useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
	managerOutline,
	type Rect,
	roundedPolygonPath,
	roundedRectPath,
} from '@/components/studio/shared/manager-shape'
import { useManagerMode } from '@/components/studio/shared/use-manager-mode'
import styles from './manager-overlay.module.css'

/**
 * 원본 화면이 칸에 다는 표시 — `<종류>:<열쇠>`(예: `text:161:86`, `layers:text`). 모드와 상관없이 늘 같은 값이라
 * 모드가 원본 DOM을 바꿀 길이 없다. 이름표가 필요하면 `data-manager-label`도 함께 단다.
 */
export const MANAGER_TARGET_ATTRIBUTE = 'data-manager-target'
const MANAGER_LABEL_ATTRIBUTE = 'data-manager-label'
/**
 * 표시 요소 안에서 Manager mode 중에도 평소 동작을 할 버튼 — 그 요소를 누르면 층이 패널을 열면서 이 버튼도 누른다
 * (Layers 묶음 줄: 평소처럼 고르고 관리 패널도 연다, 사용자 2026-10-14). 원본은 표시만 달고 모드를 모른다.
 */
const MANAGER_PASSTHROUGH_ATTRIBUTE = 'data-manager-passthrough'

/**
 * 종류 하나의 관리 폼 — 컨트롤러마다 자기 폼을 갖고 Manager mode가 켜지기를 기다린다(사용자 2026-10-13).
 * 폼은 원본 컨트롤러 밖에 놓이고 종류(`<종류>:`)로만 짝지어진다. 폼이 CMS(Payload)를 고친다.
 */
export type ManagerForm = {
	/** 제목 — 「편집 권한」. 한 종류에 여러 폼이 섞이면(`control:`) 열쇠로 고른다. */
	title: string | ((key: string) => string)
	render: (key: string) => ReactNode
	/**
	 * 이 종류의 표시 중 받아들일 열쇠만 고른다 — 공용 컨트롤 행(`control:<id>`)처럼 한 종류에 관리할 것과 안 할 것이
	 * 섞여 있을 때. 없으면 전부 받는다.
	 */
	accepts?: (key: string) => boolean
	/** `false`면 패널 머리에 제목을 그리지 않는다(닫기만) — 요소 자체가 무엇인지 말해 주는 작은 패널. 접근 이름에는 남는다. */
	heading?: boolean
}

/** 종류 → 폼. 등록되지 않은 종류의 표시는 무시한다(그 칸에는 테두리가 안 생긴다). */
export type ManagerFormRegistry = Readonly<Record<string, ManagerForm>>

/**
 * 테두리를 두르는 요소 하나 — 표시가 달린 칸 자체(텍스트 칸 하나, 레이어 줄 하나).
 * `reach`: 새 패널이 요소가 든 패널(좌·우 사이드바) 밖에서 열리도록 테두리 바깥에서 띄울 거리 — 그 사이를 다리가 잇는다.
 */
type ManagerTarget = {
	id: string
	label: string | null
	rect: Rect
	radius: number
	reach: number
	/** 바로 아래 요소(같은 줄 맞춤)의 모서리 반지름 — 다리 아래 오목한 이음매를 그 모서리와 동심원으로 둥글린다. */
	belowRadius?: number
}

/**
 * 요소 둘레의 마우스·키보드 여유 · 새 패널 폭. 바깥 흰 테두리는 없앴다 — 기본 모드 화면을 가리지 않고 요소 안쪽만 밝힌다
 * (사용자 2026-10-14). 흰 면은 고른 요소의 다리·새 패널에만 남는다.
 */
const FRAME = 6
/** 원본 자리 안쪽 가장자리의 흰 테두리 두께(사용자 2026-10-14). */
const RIM = 2
const EXTENSION_WIDTH = 320
/**
 * 테두리 바깥에서 새 패널까지의 거리 — 요소를 담은 패널 padding의 절반(사용자 2026-10-14). 바깥 방향에 padding이 있는
 * 첫 조상이 그 패널이다. 요소마다 한 번만 잰다(매 프레임 getComputedStyle을 부르지 않게). 못 찾으면 0이라 바로 붙는다.
 */
const reaches = new WeakMap<Element, number>()

function reachOf(element: Element, rect: Rect): number {
	const known = reaches.get(element)
	if (known !== undefined) return known
	const property = outwardSide(rect) === 'left' ? 'paddingLeft' : 'paddingRight'
	let reach = 0
	for (let parent = element.parentElement; parent; parent = parent.parentElement) {
		const padding = Number.parseFloat(getComputedStyle(parent)[property])
		if (padding > 0) {
			reach = padding / 2
			break
		}
	}
	reaches.set(element, reach)
	return reach
}

function splitTarget(id: string): [kind: string, key: string] {
	const at = id.indexOf(':')
	return at < 0 ? [id, ''] : [id.slice(0, at), id.slice(at + 1)]
}

const grow = ({ left, top, width, height }: Rect, by: number): Rect => ({
	left: left - by,
	top: top - by,
	width: width + by * 2,
	height: height + by * 2,
})

/**
 * Manager mode 층(사용자 2026-10-13) — 원본 트리 밖(body 포털)에 떠서 원본 UI를 구조적으로 건드리지 못한다.
 * 관리할 요소마다(텍스트 칸 하나·레이어 줄 하나처럼 최대한 작은 단위) 두꺼운 흰 테두리(흐르는 그라디언트·광선)를 두르고, 테두리를 누르면 캔버스 쪽으로
 * 새 패널이 자란다. 새 패널 높이는 내용(데이터)이 정하고, 테두리와 새 패널은 한 path로 이어 같은 반지름으로
 * 둥글린다 — 볼록한 꼭짓점은 깎이고 오목한 꼭짓점은 메워진다(`manager-shape.ts`).
 *
 * ponytail: 위치는 켜져 있는 동안 매 프레임 다시 읽는다(칸 몇 개라 싸다). 칸이 수십 개가 되면
 * ResizeObserver·스크롤 이벤트로 바꾼다.
 */
export function ManagerOverlay({ forms }: { forms: ManagerFormRegistry }) {
	const manager = useManagerMode()
	// 등록표 객체는 렌더마다 새로 만들어진다 — 읽기 루프는 ref로 최신 것을 읽고, 켜고 끌 때만 다시 선다.
	const formsRef = useRef(forms)
	formsRef.current = forms
	const panels = useManagerTargets(manager.on, formsRef)
	// 마우스가 움직일 때마다 층을 다시 그리지 않는다 — 올라간 칸이 바뀔 때만 상태가 바뀐다.
	const hoveredId = useHoveredTarget(manager.on, panels)
	const [heights, setHeights] = useState<Record<string, number>>({})
	const gradientId = useId()
	const glowId = useId()
	const clipId = useId()
	const reduceMotion = useReducedMotion()
	if (!manager.on || typeof document === 'undefined') return null

	return createPortal(
		<div data-slot="manager-overlay" className="pointer-events-none fixed inset-0 z-40">
			<svg aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
				<defs>
					<linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" className={styles.stopA} />
						<stop offset="50%" className={styles.stopB} />
						<stop offset="100%" className={styles.stopA} />
						{!reduceMotion && (
							<animateTransform
								attributeName="gradientTransform"
								type="rotate"
								from="0 0.5 0.5"
								to="360 0.5 0.5"
								dur="6s"
								repeatCount="indefinite"
							/>
						)}
					</linearGradient>
					<filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation="8" />
					</filter>
				</defs>
				{panels.map((panel, index) => {
					const selected = manager.selected === panel.id
					const height = heights[panel.id] ?? 0
					const hovered = !selected && hoveredId === panel.id
					// 원본 자리. 그라디언트는 여기 가장자리에서 안쪽으로만 번진다 — 기기 화면 테두리를 밝히는 Siri처럼(사용자 2026-10-14).
					const hole = roundedRectPath(panel.rect, panel.radius)
					const clip = `${clipId}-${index}`
					// 고른 요소만 흰 다리·새 패널을 그린다 — 원본 자리는 뚫는다(evenodd).
					const extension =
						selected && height > 0
							? roundedPolygonPath(
									managerOutline(panel.rect, {
										width: EXTENSION_WIDTH,
										height,
										side: outwardSide(panel.rect),
										reach: panel.reach,
									}),
									panel.radius,
									// 오목한 이음매 — 바로 아래 요소 모서리와 동심원(사용자 2026-10-14). 다리 길이가 두 요소 사이 간격과
									// 같아서(`reach`) 원호 중심이 가로·세로 모두 아래 요소 모서리 원의 중심에 온다.
									(panel.belowRadius ?? panel.radius) + panel.reach,
								)
							: null
					return (
						<g
							key={panel.id}
							className={styles.panel}
							data-state={selected ? 'selected' : hovered ? 'hover' : 'idle'}
						>
							<clipPath id={clip}>
								<path d={hole} />
							</clipPath>
							{extension && (
								<path
									d={`${extension}${hole}`}
									fillRule="evenodd"
									className={styles.fill}
								/>
							)}
							{/* 원본 자리 위 투명 누름 판 — Manager mode에서는 요소 안쪽을 눌러도 그 요소를 고른다(사용자 2026-10-14).
							    원본은 그대로 보이지만 만져지지 않는다. 모드를 끄면 층이 없으니 원본이 그대로 동작한다. */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: 키보드는 테두리 윗변 버튼이 같은 일을 한다 */}
							<path
								d={hole}
								className={styles.hit}
								onClick={() => {
									if (manager.selected !== panel.id) pressOriginal(panel.id)
									manager.select(panel.id)
								}}
							/>
							<g clipPath={`url(#${clip})`}>
								{/* 흰 테두리 — 원본 자리 안쪽 가장자리에 깔아 광선을 받친다. 🔴 요소 바깥으로는 절대 나가지 않는다(사용자 2026-10-14).
								    잘린 안쪽 절반만 보이므로 굵기는 두 배. */}
								<path d={hole} className={styles.rim} strokeWidth={RIM * 2} />
								{/* 그라디언트 하나로 — 늘 얇은 안쪽 광선, hover·선택이면 요소 전체에 얕은 채움이 더해진다(투명도만 바뀐다). */}
								<path
									d={hole}
									className={styles.glow}
									stroke={`url(#${gradientId})`}
									fill={`url(#${gradientId})`}
									filter={`url(#${glowId})`}
								/>
								<path
									d={hole}
									className={styles.edge}
									stroke={`url(#${gradientId})`}
								/>
							</g>
						</g>
					)
				})}
			</svg>
			{panels.map((panel) => {
				const { rect } = panel
				const selected = manager.selected === panel.id
				const side = outwardSide(panel.rect)
				const [kind, key] = splitTarget(panel.id)
				const form = forms[kind]
				if (!form) return null
				const formTitle = typeof form.title === 'function' ? form.title(key) : form.title
				const title = panel.label ? `${panel.label} · ${formTitle}` : formTitle
				return (
					<div key={panel.id}>
						{/* 키보드로도 고를 수 있게 테두리 윗변에 버튼을 둔다(마우스는 테두리 어디를 눌러도 된다). */}
						<button
							type="button"
							aria-label={`${title} 관리`}
							aria-pressed={selected}
							onClick={() => manager.select(panel.id)}
							className="pointer-events-auto absolute rounded-full opacity-0 outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/30"
							style={{
								top: rect.top,
								left: rect.left + panel.radius,
								width: Math.max(rect.width - panel.radius * 2, FRAME),
								height: FRAME,
							}}
						/>
						{selected && (
							<ManagerExtension
								title={title}
								heading={form.heading !== false}
								style={{
									top: rect.top,
									left:
										side === 'left'
											? rect.left - panel.reach - EXTENSION_WIDTH
											: rect.left + rect.width + panel.reach,
									width: EXTENSION_WIDTH,
								}}
								onHeight={(next) =>
									setHeights((prev) =>
										prev[panel.id] === next
											? prev
											: { ...prev, [panel.id]: next },
									)
								}
								onClose={() => manager.select(panel.id)}
							>
								{form.render(key)}
							</ManagerExtension>
						)}
					</div>
				)
			})}
		</div>,
		document.body,
	)
}

/**
 * 캔버스 쪽으로 자라는 새 패널의 내용 — 높이를 재서 테두리 path에 넘긴다(높이는 데이터가 정한다).
 * 층이 화면에 고정돼 문서 스크롤로는 넘친 곳에 못 닿으므로, 화면 아래끝에서 멈추고 패널 안에서 스크롤한다.
 */
function ManagerExtension({
	title,
	heading,
	style,
	onHeight,
	onClose,
	children,
}: {
	title: string
	heading: boolean
	style: { top: number; left: number; width: number }
	onHeight: (height: number) => void
	onClose: () => void
	children: ReactNode
}) {
	const [element, setElement] = useState<HTMLElement | null>(null)
	// 부모가 마우스 움직임마다 다시 그리므로 콜백은 ref로 들고, 관찰은 요소가 바뀔 때만 다시 건다.
	const report = useRef(onHeight)
	report.current = onHeight
	useEffect(() => {
		if (!element) return
		const observer = new ResizeObserver(() => report.current(element.offsetHeight))
		observer.observe(element)
		report.current(element.offsetHeight)
		return () => observer.disconnect()
	}, [element])
	return (
		<section
			ref={setElement}
			aria-label={`${title} 관리`}
			onKeyDown={(event) => {
				// 포털로 뜬 목록(Select 등)의 Esc는 React 트리로만 올라온다 — DOM 안에서 온 키만 받는다.
				if (event.key !== 'Escape' || !element?.contains(event.target as Node)) return
				// 입력 중인 칸을 먼저 벗어나게 해 그 값을 쓴다(칸을 벗어날 때 쓰는 폼들).
				if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
				onClose()
			}}
			// 흰 테두리 위라 밝은 토큰으로 그린다(선택 카드와 같은 `light` 범위).
			className="light pointer-events-auto absolute flex flex-col gap-4 overflow-y-auto p-5 text-foreground"
			style={{ ...style, maxHeight: `max(12rem, calc(100dvh - ${style.top}px - 1rem))` }}
		>
			<header className="flex items-center justify-between gap-2">
				{heading ? <span className="text-base font-semibold">{title}</span> : <span />}
				<button
					type="button"
					aria-label="닫기"
					onClick={onClose}
					className="rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
				>
					<Close aria-hidden className="size-4" />
				</button>
			</header>
			{children}
		</section>
	)
}

/** 화면 오른쪽 절반의 패널은 왼쪽(캔버스 쪽)으로, 왼쪽 절반은 오른쪽으로 자란다. */
function outwardSide(rect: Rect): 'left' | 'right' {
	return rect.left + rect.width / 2 > window.innerWidth / 2 ? 'left' : 'right'
}

/** 요소마다 한 번만 잰다 — 매 프레임 getComputedStyle을 부르지 않게. */
const radii = new WeakMap<Element, number>()

/** 요소를 감싸 잘라 내는 조상(크기가 테두리만큼만 다르다)의 안쪽 반지름. 그런 조상이 없으면 0. */
function clippingRadiusOf(element: Element): number {
	const box = element.getBoundingClientRect()
	for (let parent = element.parentElement; parent; parent = parent.parentElement) {
		const rect = parent.getBoundingClientRect()
		const style = getComputedStyle(parent)
		const border = Number.parseFloat(style.borderTopWidth) || 0
		// 테두리 바깥까지 요소와 같은 크기인 조상만 — 그보다 크면 요소를 감싼 패널이 아니라 그냥 바깥 칸이다.
		if (
			Math.abs(rect.width - box.width) > border * 2 + 1 ||
			Math.abs(rect.height - box.height) > border * 2 + 1
		) {
			return 0
		}
		const value = Number.parseFloat(style.borderTopLeftRadius)
		if (value > 0 && style.overflow !== 'visible') return Math.max(0, value - border)
	}
	return 0
}

/**
 * 요소의 모서리 반지름 — 화면에 실제로 보이는 모양에서 읽는다(값을 박아 두지 않는다, 사용자 2026-10-14).
 * ① 요소 자신 ② 첫 자식(칸을 감싼 래퍼) ③ 요소를 잘라 내는 조상(선택 카드처럼 패널이 `overflow-hidden`으로 둥글리는 경우)
 * 순으로 찾는다. ③은 그 조상의 반지름에서 테두리 두께를 뺀 안쪽 반지름이라 패널 테두리와 동심이다. 못 찾으면 직각(0).
 */
function radiusOf(element: Element): number {
	const known = radii.get(element)
	if (known !== undefined) return known
	let radius = 0
	for (const candidate of [element, element.firstElementChild]) {
		if (!candidate) continue
		const value = Number.parseFloat(getComputedStyle(candidate).borderTopLeftRadius)
		if (value > 0) {
			radius = value
			break
		}
	}
	if (radius === 0) radius = clippingRadiusOf(element)
	radii.set(element, radius)
	return radius
}

/**
 * 같은 열(왼쪽 맞춤)에 이웃 요소가 있으면 다리 길이를 그 사이 간격과 같게 맞춘다 — 가로(다리)·세로(간격)가 같아야
 * 오목한 이음매가 아래 요소 모서리와 동심원이 된다(사용자 2026-10-14). 아래가 없으면 위 간격을 써 한 열의 거리가 같다.
 * 이웃이 없으면 패널 padding의 절반(`reachOf`) 그대로다.
 */
function withNeighbors(targets: ManagerTarget[]): ManagerTarget[] {
	return targets.map((target) => {
		const top = target.rect.top
		const bottom = top + target.rect.height
		const column = targets.filter(
			(other) => other.id !== target.id && Math.abs(other.rect.left - target.rect.left) < 1,
		)
		const below = column
			.filter((other) => other.rect.top >= bottom - 0.5)
			.sort((a, b) => a.rect.top - b.rect.top)[0]
		const above = column
			.filter((other) => other.rect.top + other.rect.height <= top + 0.5)
			.sort((a, b) => b.rect.top - a.rect.top)[0]
		if (below) return { ...target, reach: below.rect.top - bottom, belowRadius: below.radius }
		if (above) return { ...target, reach: top - (above.rect.top + above.rect.height) }
		return target
	})
}

/** 표시 요소 안의 평소 동작 버튼을 누른다(`data-manager-passthrough`) — 없으면 아무것도 안 한다. */
function pressOriginal(id: string) {
	document
		.querySelector<HTMLElement>(
			`[${MANAGER_TARGET_ATTRIBUTE}="${CSS.escape(id)}"] [${MANAGER_PASSTHROUGH_ATTRIBUTE}]`,
		)
		?.click()
}

const contains = (rect: Rect, x: number, y: number) =>
	x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height

/**
 * 마우스가 올라간 칸(테두리 포함) — 문서 전체에서 위치를 읽기만 하고(원본 칸에 이벤트를 걸지 않는다),
 * 올라간 칸이 바뀔 때만 상태를 바꾼다.
 */
function useHoveredTarget(on: boolean, targets: readonly ManagerTarget[]): string | null {
	const [hovered, setHovered] = useState<string | null>(null)
	const targetsRef = useRef(targets)
	targetsRef.current = targets
	useEffect(() => {
		if (!on) return
		const move = (event: PointerEvent) => {
			const hit = targetsRef.current.find((target) =>
				contains(grow(target.rect, FRAME), event.clientX, event.clientY),
			)
			setHovered(hit?.id ?? null)
		}
		const leave = () => setHovered(null)
		document.addEventListener('pointermove', move, { passive: true })
		document.documentElement.addEventListener('pointerleave', leave)
		return () => {
			document.removeEventListener('pointermove', move)
			document.documentElement.removeEventListener('pointerleave', leave)
		}
	}, [on])
	return hovered
}

/**
 * 표시가 달린 칸 중 지금 실제로 보이는 것(가려지거나 스크롤 밖이면 빠진다) — 등록된 폼이 없는 칸은 뺀다.
 * 같은 표시가 둘이면 먼저 찾은 것만 쓴다(주소에 남는 선택이 하나로 정해지게).
 */
function useManagerTargets(
	on: boolean,
	formsRef: { readonly current: ManagerFormRegistry },
): ManagerTarget[] {
	const [targets, setTargets] = useState<ManagerTarget[]>([])
	useEffect(() => {
		if (!on) {
			setTargets([])
			return
		}
		let frame = 0
		let last = ''
		const read = () => {
			// 패널 안 Select 같은 모달 층이 열리면 body가 `pointer-events: none`이 되어 `elementsFromPoint`가 원본을 못 찾는다
			// — 그대로 읽으면 칸이 전부 가려진 것으로 나와 열린 패널이 사라진다. 닫힐 때까지 지난 위치를 쓴다.
			if (document.body.style.pointerEvents === 'none') {
				frame = requestAnimationFrame(read)
				return
			}
			const next = new Map<string, ManagerTarget>()
			for (const element of document.querySelectorAll<HTMLElement>(
				`[${MANAGER_TARGET_ATTRIBUTE}]`,
			)) {
				const id = element.getAttribute(MANAGER_TARGET_ATTRIBUTE)
				if (!id || next.has(id)) continue
				const [kind, key] = splitTarget(id)
				const form = formsRef.current[kind]
				if (!form || (form.accepts && !form.accepts(key))) continue
				const rect = element.getBoundingClientRect()
				if (rect.width === 0 || rect.height === 0) continue
				// 칸 가운데가 실제로 이 칸에 닿아야 보이는 것이다 — 접힌 탭·스크롤 밖·다른 층에 가린 칸은 뺀다.
				// 이 층 자신(누름 판·패널)은 건너뛰고 그 아래 원본을 본다.
				const hit = document
					.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
					.find((candidate) => !candidate.closest('[data-slot="manager-overlay"]'))
				if (!hit || !element.contains(hit)) continue
				const box = {
					left: rect.left,
					top: rect.top,
					width: rect.width,
					height: rect.height,
				}
				next.set(id, {
					id,
					label: element.getAttribute(MANAGER_LABEL_ATTRIBUTE),
					rect: box,
					radius: radiusOf(element),
					reach: Math.max(0, reachOf(element, box)),
				})
			}
			const list = withNeighbors([...next.values()])
			const key = JSON.stringify(list)
			if (key !== last) {
				last = key
				setTargets(list)
			}
			frame = requestAnimationFrame(read)
		}
		read()
		return () => cancelAnimationFrame(frame)
	}, [on, formsRef])
	return targets
}
