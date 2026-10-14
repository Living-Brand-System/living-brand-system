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
}

/** 종류 → 폼. 등록되지 않은 종류의 표시는 무시한다(그 칸에는 테두리가 안 생긴다). */
export type ManagerFormRegistry = Readonly<Record<string, ManagerForm>>

/** 테두리를 두르는 요소 하나 — 표시가 달린 칸 자체(텍스트 칸 하나, 레이어 줄 하나). */
type ManagerTarget = { id: string; label: string | null; rect: Rect; radius: number }

/** 테두리 두께 · 새 패널 폭. 요소는 최대한 작은 단위라(사용자 2026-10-13) 테두리도 얇게 둔다. */
const FRAME = 6
const EXTENSION_WIDTH = 320

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
					<filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="8" />
					</filter>
				</defs>
				{panels.map((panel) => {
					const frame = grow(panel.rect, FRAME)
					const selected = manager.selected === panel.id
					const side = outwardSide(panel.rect)
					const height = heights[panel.id] ?? 0
					const outline = roundedPolygonPath(
						managerOutline(
							frame,
							selected && height > 0
								? { width: EXTENSION_WIDTH, height, side }
								: undefined,
						),
						panel.radius + FRAME,
					)
					const hovered = !selected && hoveredId === panel.id
					return (
						<g
							key={panel.id}
							className={styles.panel}
							data-state={selected ? 'selected' : hovered ? 'hover' : 'idle'}
						>
							<path
								d={outline}
								className={styles.glow}
								stroke={`url(#${gradientId})`}
								filter={`url(#${glowId})`}
							/>
							{/* 원본 패널 자리는 뚫는다(evenodd) — 원본이 그대로 보이고 그대로 만져진다. */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: 키보드는 테두리 윗변 버튼이 같은 일을 한다 */}
							<path
								d={`${outline}${roundedRectPath(panel.rect, panel.radius)}`}
								fillRule="evenodd"
								className={styles.fill}
								onClick={() => manager.select(panel.id)}
							/>
							<path
								d={outline}
								className={styles.edge}
								stroke={`url(#${gradientId})`}
							/>
						</g>
					)
				})}
			</svg>
			{panels.map((panel) => {
				const frame = grow(panel.rect, FRAME)
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
								top: frame.top,
								left: frame.left + panel.radius,
								width: Math.max(frame.width - panel.radius * 2, FRAME),
								height: FRAME,
							}}
						/>
						{selected && (
							<ManagerExtension
								title={title}
								style={{
									top: frame.top,
									left:
										side === 'left'
											? frame.left - EXTENSION_WIDTH
											: frame.left + frame.width,
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
	style,
	onHeight,
	onClose,
	children,
}: {
	title: string
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
			// 흰 테두리 위라 밝은 토큰으로 그린다(선택 카드와 같은 `light` 범위).
			className="light pointer-events-auto absolute flex flex-col gap-4 overflow-y-auto p-5 text-foreground"
			style={{ ...style, maxHeight: `max(12rem, calc(100dvh - ${style.top}px - 1rem))` }}
		>
			<header className="flex items-center justify-between gap-2">
				<span className="text-base font-semibold">{title}</span>
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

/** 요소의 모서리 반지름 — 칸을 감싼 래퍼면 반지름이 없으니 첫 자식까지 본다. 못 찾으면 8px. */
function radiusOf(element: Element): number {
	const known = radii.get(element)
	if (known !== undefined) return known
	let radius = 8
	for (const candidate of [element, element.firstElementChild]) {
		if (!candidate) continue
		const value = Number.parseFloat(getComputedStyle(candidate).borderTopLeftRadius)
		if (value > 0) {
			radius = value
			break
		}
	}
	radii.set(element, radius)
	return radius
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
				const hit = document.elementFromPoint(
					rect.left + rect.width / 2,
					rect.top + rect.height / 2,
				)
				if (!hit || !element.contains(hit)) continue
				next.set(id, {
					id,
					label: element.getAttribute(MANAGER_LABEL_ATTRIBUTE),
					rect: {
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height,
					},
					radius: radiusOf(element),
				})
			}
			const list = [...next.values()]
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
