'use client'

import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MORPH, morph, reducedMotion } from '../../../../displays/dynamics/ci-lockup/motion'
import {
	type DiagramSpec,
	type DiagramTrack,
	diagramSpec,
	type Lockup,
} from '../../../../displays/dynamics/ci-lockup/rules'
import { GUIDE_LINE_WIDTH, guideColorOf } from '../../../../displays/guide-style'
import { CapLine, SymbolMark } from './view'

/*
 * 치수 도판. 🔑 **락업을 CSS grid 한 판의 트랙 시퀀스로 그린다** — 요소 트랙은 `max-content`라
 * 글자 폭을 폰트가 정하고(이 리포의 결정: "폭은 계산하지 않는다"), 간격 트랙은 H 배수로 고정된다.
 * 그래서 계열사·지역명·언어가 바뀌어도 **JS 측정 없이** 치수선이 따라온다.
 *
 * 🔑 꼴이 바뀌어도 노드가 다시 만들어지지 않는다. 정체 id를 key로 쓰고(그 id는 **축을 담지 않는다**,
 *    `rules.ts` 참조) 바뀌는 것은 grid 배치뿐이며, 그 이동을 FLIP이 이어 준다.
 *    사용자 요구(2026-08-18): 「꼴을 변경했을 때 새로 바뀌는 게 아니라 이동만 하는 거지」
 *
 * 🔴 클리어스페이스(여백)는 여기 없다 — 간격과 아예 다른 규정이고 이번 범위 밖이다.
 */

/**
 * 라벨행 높이와 게이지 열 폭. 🔑 **H 배수다** — H가 컨트롤러로 열리면서 절대 px이던 부채를 갚았다.
 * 값은 H=100에서 예전 절대값(44·64)과 정확히 같게 골랐다: 44/100 = 0.44, 64/100 = 0.64.
 * 🔴 라벨 글자 크기는 따라 커지지 않는다(`text-xs`) — 도판이 아주 작아지면 라벨이 트랙보다 커진다.
 *    그래서 H 하한을 매니페스트가 60으로 잡았다.
 */
const LABEL_ROW_RATIO = 0.44
const GAUGE_COL_RATIO = 0.64
/**
 * 면(밴드)의 투명도. 정본 도판의 연한 초록 띠.
 * 🔴 판 색으로 갈린다 — 검은 판에서 0.12는 아예 안 보인다(사용자 지적 2026-08-19). 어두운 면에서는
 *    같은 초록이 배경과 겹쳐 대비를 잃으므로 알파로 벌린다. 색을 바꾸지 않는 이유는 치수선·라벨과
 *    **같은 초록이어야** 「이 면과 이 선이 같은 것을 말한다」가 읽히기 때문이다.
 * 🔴 갈리는 기준은 테마가 아니라 **판**이다 — 판 색은 색상 표현이 정하고 사용자의 라이트/다크
 *    설정을 따르지 않는다. 그래서 테마 변형이 아니라 이 인자로 갈라야 한다(`surface.ts` 주석,
 *    `visual-vocabulary.test.ts`가 테마 변형 사용을 막는다).
 */
const bandOpacity = (tone: 'light' | 'dark') => (tone === 'light' ? 0.12 : 0.32)

/**
 * 안내선 색과 면 색을 **도판 밖에서도 쓸 수 있게** 연다. 클리어스페이스 프레임이 같은 색을 쓴다
 * (사용자 지정 2026-08-20) — 「규정을 그린 선」이라는 점이 같아서 색이 갈리면 다른 종류의 정보로 읽힌다.
 * 🔴 방향은 `view.tsx` → `diagram.tsx` 한쪽뿐이다. 반대로 import하면 모듈 최상위 상수에서 TDZ가
 *    난다(모프 토큰을 `motion.ts`로 뺀 이유가 그것이다).
 */
export { guideColorOf } from '../../../../displays/guide-style'

/**
 * 면으로 칠할 때의 안내선 색. 도판의 밴드는 요소 `opacity`로 연하게 하지만, 테두리처럼 **색 하나로**
 * 줘야 하는 자리는 알파를 색에 넣어야 한다 — 같은 12%/32%를 쓴다.
 */
export const guideTint = (guide: string, tone: 'light' | 'dark') =>
	`color-mix(in srgb, ${guide} ${bandOpacity(tone) * 100}%, transparent)`

/**
 * 첫 렌더에는 전환을 끈다 — 마운트 순간 CSS 전환이 걸려 있으면 초기 상태가 흘러 들어온다.
 * 🔑 이 상태 전환이 만드는 리렌더는 기하가 같아 FLIP이 아무것도 하지 않는다.
 */
function useMotion() {
	const [on, setOn] = useState(false)
	useEffect(() => {
		if (!reducedMotion()) setOn(true)
	}, [])
	return on
}

/**
 * FLIP — 렌더 뒤 위치가 바뀐 노드만 역방향으로 밀었다 놓는다.
 *
 * 🔴 `getBoundingClientRect`가 아니라 `offsetLeft/Top`을 쓴다. 두 가지를 동시에 푼다:
 *    ① 렌더 사이 스크롤이 좌표에 섞이지 않는다 ② **전환 중에 또 전환해도** transform이 섞이지
 *    않는다(offset은 레이아웃 값이라 transform과 무관하다). 실측으로 겪은 함정이다.
 * 🔴 그래서 판(grid)이 `position: relative`여야 한다 — 모든 노드의 `offsetParent`가 그것으로 모인다.
 * 🔴 `size: false`인 노드는 translate만 잇는다 — 글자·심볼의 폭을 키프레임으로 건드리면
 *    `max-content` 트랙이 그 값을 다시 읽어 420ms 동안 트랙이 떤다(되먹임).
 * 🔑 첫 렌더에는 이전 위치가 없어 애니메이션이 돌지 않는다(깜빡임 없음).
 */
function useDiagramFlip(structure: string) {
	const nodes = useRef(new Map<string, { node: HTMLElement; size: boolean }>())
	const previous = useRef(new Map<string, { x: number; y: number; w: number; h: number }>())
	const lastStructure = useRef(structure)

	useLayoutEffect(() => {
		/*
		 * 🔑 **구조가 바뀐 렌더에서만 잇는다.** 그 밖의 렌더(H 조절 같은 크기 변화)에서는 자리만
		 *    다시 기억하고 애니메이션을 돌리지 않는다.
		 * 🔴 왜 필요한가: 크기를 잇는 노드(면·치수선 = size:true)와 안 잇는 노드(글자·심볼 =
		 *    size:false)가 섞여 있어, H가 바뀌면 글자는 즉시 새 크기가 되고 밴드만 옛 크기에서
		 *    자란다 — 420ms 동안 글자가 자기 밴드를 벗어난다. 크기는 이산으로 두는 것이 맞다
		 *    (사용자 규칙: 위치는 연속, 크기·텍스트는 이산).
		 */
		const structural = lastStructure.current !== structure
		lastStructure.current = structure
		const skip = reducedMotion() || !structural
		for (const [key, entry] of nodes.current) {
			const { node, size } = entry
			const now = {
				x: node.offsetLeft,
				y: node.offsetTop,
				w: node.offsetWidth,
				h: node.offsetHeight,
			}
			const before = previous.current.get(key)
			previous.current.set(key, now)
			if (!before || skip) continue
			const dx = before.x - now.x
			const dy = before.y - now.y
			const dw = before.w - now.w
			const dh = before.h - now.h
			const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5
			const resized = size && (Math.abs(dw) > 0.5 || Math.abs(dh) > 0.5)
			if (!moved && !resized) continue
			// 전환 중 재전환: `morph`가 앞선 FLIP을 지우고 새 좌표로 다시 잇는다.
			// 🔑 출발값만 준다 — 비행 중 측정값이 출발값으로는 오히려 옳다(지금 보이는 자리에서
			//    이어진다). 도착값을 적지 않는 이유는 `morph` 주석에 있다.
			morph(node, {
				transform: `translate(${dx}px, ${dy}px)`,
				...(resized ? { width: `${before.w}px`, height: `${before.h}px` } : null),
			})
		}
	})

	/**
	 * 🔴 폰트가 늦게 오면(`font-display: block`) 글자 폭이 한 번 바뀌는데 React는 다시 렌더하지
	 *    않는다 → 기억한 위치가 낡는다. 그 시점에 다시 재서 맞춰 둔다(애니메이션은 돌리지 않는다).
	 */
	useLayoutEffect(() => {
		let alive = true
		document.fonts.ready.then(() => {
			if (!alive) return
			for (const [key, { node }] of nodes.current) {
				previous.current.set(key, {
					x: node.offsetLeft,
					y: node.offsetTop,
					w: node.offsetWidth,
					h: node.offsetHeight,
				})
			}
		})
		return () => {
			alive = false
		}
	}, [])

	return (key: string, size: boolean) => (node: HTMLDivElement | null) => {
		if (node) nodes.current.set(key, { node, size })
		else nodes.current.delete(key)
	}
}

const trackSize = (track: DiagramTrack, h: number) =>
	track.v === undefined ? 'max-content' : `${track.v * h}px`

type Placement = { column: [number, number]; row: [number, number] }
type Item = { placement: Placement; node: ReactNode; z: number; flow: boolean; size: boolean }

/**
 * 🔑 사방 신축 트랙. 판이 **캔버스를 꽉 채우게** 하는 장치다 — 면·선·점선이 도판 내용 폭이 아니라
 * **캔버스 끝까지** 닿아야 하고(사용자 지정 2026-08-19), 정본 도판도 그렇게 그린다.
 * 🔴 양쪽이 같은 신축이라 이것이 곧 가운데 정렬이다(`mx-auto`를 대신한다). 내용이 캔버스보다
 *    내용이 넓어져도 격자 자체는 카드 크기를 유지한다.
 * 🔴 `minmax(0, 1fr)`이어야 한다 — 맨 `1fr`은 최소 크기가 auto라 안의 것이 넘치면 트랙이 벌어진다.
 */
const FLEX = 'minmax(0, 1fr)'

/** 스펙 하나를 grid 좌표로 푼다. 트랙 배열의 인덱스가 곧 grid line이라 좌표 실수가 구조적으로 안 난다. */
function resolve(spec: DiagramSpec, h: number) {
	const LABEL_ROW = LABEL_ROW_RATIO * h
	const GAUGE_COL = GAUGE_COL_RATIO * h
	const columns: string[] = [FLEX]
	const colLine: Record<string, number> = {}
	for (let d = 0; d < spec.gaugeLeft; d++) columns.push(`${GAUGE_COL}px`)
	const leftGauge = (depth: number) => 1 + spec.gaugeLeft - depth
	for (const track of spec.cols) {
		if (track.id) colLine[track.id] = columns.length + 1
		columns.push(trackSize(track, h))
	}
	const rightGaugeStart = columns.length + 1
	for (let d = 0; d < spec.gaugeRight; d++) columns.push(`${GAUGE_COL}px`)
	const rightGauge = (depth: number) => rightGaugeStart + depth
	columns.push(FLEX)
	/** 판의 오른쪽 끝 선 = 캔버스 오른쪽 끝. 전폭 마크(면·실선)가 여기까지 걸린다. */
	const lastColumn = columns.length + 1

	const rows: string[] = [FLEX, `${LABEL_ROW}px`]
	const rowLine: Record<string, number> = {}
	for (const track of spec.rows) {
		if (track.id) rowLine[track.id] = rows.length + 1
		rows.push(trackSize(track, h))
	}
	const lastRow = rows.length + 1
	rows.push(`${LABEL_ROW}px`, FLEX)
	/** 판의 아래쪽 끝 선 = 캔버스 아래 끝. 세로 점선이 여기까지 걸린다. */
	const lastRowEdge = rows.length + 1

	const [envStart, envEnd] = spec.envRows
	const [areaStart, areaEnd] = spec.areaRows
	return {
		columns,
		rows,
		colLine,
		rowLine,
		leftGauge,
		rightGauge,
		lastColumn,
		lastRow,
		lastRowEdge,
		/* 신축 트랙 하나 + 라벨 행 하나가 스펙 행보다 앞에 있다. */
		envTop: 3 + envStart,
		envBottom: 3 + envEnd + 1,
		areaTop: 3 + areaStart,
		areaBottom: 3 + areaEnd + 1,
	}
}

type Geometry = ReturnType<typeof resolve>

/* ── 주석 프리미티브 ─────────────────────────────────────────────────── */

/**
 * 간격의 경계 — 점선 세로선 한 쌍.
 * 🔑 **열 간격에만 그린다**(정본 도판). 행 간격은 면(Band) 사이로 읽히고 치수를 적지 않는다.
 *    간격 정체가 축별로 갈려 있으므로(`gapX`/`gapY`) 이 마크가 축을 넘나드는 일이 없다.
 */
function Tick({ guide }: { guide: string }) {
	return (
		<div
			className="size-full"
			style={{
				borderLeft: `${GUIDE_LINE_WIDTH}px dashed ${guide}`,
				borderRight: `${GUIDE_LINE_WIDTH}px dashed ${guide}`,
			}}
		/>
	)
}

/** 간격 값 라벨. 🔑 회전하지 않고 **옮겨 앉기만** 한다. knockout 배경은 판 색이다. */
function GapLabel({
	value,
	place,
	guide,
	stage,
}: {
	value: number
	place: 'above' | 'below'
	guide: string
	stage: string
}) {
	const align = place === 'below' ? 'items-start pt-2.5' : 'items-end pb-2.5'
	return (
		<span className={`relative grid size-full min-h-0 min-w-0 justify-center ${align}`}>
			{place === 'below' ? (
				<span
					className="absolute top-0 left-1/2 h-2.5"
					style={{ borderLeft: `${GUIDE_LINE_WIDTH}px dashed ${guide}` }}
				/>
			) : null}
			{/* 🔴 knockout 배경에도 판과 **같은** 전환이 필요하다 — 없으면 판 색이 흐르는 동안 이
				배경만 즉시 갈려 라벨 상자의 윤곽이 드러난다(사용자 지적 2026-08-19). */}
			<span
				className="whitespace-nowrap px-1 font-body text-xs tabular-nums"
				style={{ color: guide, background: stage, transition: `background-color ${MORPH}` }}
			>
				{Number(value.toFixed(4))}H
			</span>
		</span>
	)
}

/** 치수 게이지 — 양끝 캡 달린 세로 실선 + 라벨. 🔴 안쪽 자식에는 FLIP을 걸지 않는다(offsetParent 함정). */
function Span({ label, side, guide }: { label: string; side: 'left' | 'right'; guide: string }) {
	const near = side === 'left' ? 'right' : 'left'
	return (
		<span className="relative grid size-full min-h-0 min-w-0 place-items-center">
			<span
				className="absolute top-0 bottom-0 w-px"
				style={{ background: guide, [near]: '13px' }}
			/>
			<span
				className="absolute top-0 h-px w-2.5"
				style={{ background: guide, [near]: '9px' }}
			/>
			<span
				className="absolute bottom-0 h-px w-2.5"
				style={{ background: guide, [near]: '9px' }}
			/>
			<span
				className="whitespace-nowrap font-body text-xs tabular-nums"
				style={{ color: guide, [side === 'left' ? 'marginRight' : 'marginLeft']: '22px' }}
			>
				{label}
			</span>
		</span>
	)
}

/**
 * 스펙 하나를 아이템 맵으로 만든다. 🔑 순수 함수라 **다른 꼴의 스펙에도 그대로 돌린다** —
 * 그래서 이 꼴에 없는 정체도 노드와 글자를 갖고 이음선으로 접히며 흐려진다(등장·퇴장이 대칭).
 */
function buildItems(
	spec: DiagramSpec,
	g: Geometry,
	ctx: {
		h: number
		guide: string
		stage: string
		/** 판이 밝은가 어두운가. 면의 알파가 이것으로 갈린다(`BAND_OPACITY`). */
		tone: 'light' | 'dark'
		motion: boolean
		symbol: ReactNode
		centered: boolean
	},
) {
	const items = new Map<string, Item>()
	const mark = (key: string, placement: Placement, node: ReactNode, z: number) =>
		items.set(key, { placement, node, z, flow: false, size: true })

	/* Band — 글자 행마다 전폭 */
	for (const track of spec.rows) {
		if (track.kind !== 'el' || !track.id) continue
		const line = g.rowLine[track.id] ?? 1
		mark(
			`band:${track.id}`,
			{ column: [1, g.lastColumn], row: [line, line + 1] },
			<div
				className="size-full"
				style={{
					background: ctx.guide,
					opacity: bandOpacity(ctx.tone),
					transition: ctx.motion ? `opacity ${MORPH}` : undefined,
				}}
			/>,
			0,
		)
	}

	/* Rule — 봉투(심볼 위·아래) 실선 */
	for (const [key, line] of [
		['rule:env-top', g.envTop],
		['rule:env-bottom', g.envBottom],
	] as const) {
		mark(
			key,
			{ column: [1, g.lastColumn], row: [line, line + 1] },
			<div
				className="w-full self-start"
				style={{ borderTop: `${GUIDE_LINE_WIDTH}px solid ${ctx.guide}`, height: 0 }}
			/>,
			2,
		)
	}

	/* Tick + 라벨 — 🔑 **열 간격에만**. 행 간격은 치수를 적지 않는다(정본 도판).
	   🔴 파생이 낼 수 있는 모든 수치를 적으면 도판이 아니라 계측기가 된다(사용자 지정 2026-08-19). */
	for (const track of spec.cols) {
		if ((track.kind !== 'gap' && track.kind !== 'bar') || !track.id) continue
		const column = g.colLine[track.id] ?? 1
		mark(
			`tick:${track.id}`,
			{ column: [column, column + 1], row: [1, g.lastRowEdge] },
			<Tick guide={ctx.guide} />,
			2,
		)
		const below = spec.labelBelow.includes(track.id)
		mark(
			`label:${track.id}`,
			{
				column: [column, column + 1],
				row: below ? [g.lastRow, g.lastRow + 1] : [2, 3],
			},
			<GapLabel
				value={track.labelValue ?? track.v ?? 0}
				place={below ? 'below' : 'above'}
				guide={ctx.guide}
				stage={ctx.stage}
			/>,
			3,
		)
	}

	/* 심볼 — 열이면 봉투 전체, 행이면 그 행 */
	{
		const column = g.colLine.sym
		const row = g.rowLine.sym
		const textColumn = g.colLine[spec.textCol] ?? 1
		const placement: Placement = column
			? { column: [column, column + 1], row: [g.envTop, g.envBottom] }
			: { column: [textColumn, textColumn + 1], row: [row, row + 1] }
		items.set('sym', {
			placement,
			node: <span className="grid size-full place-items-center">{ctx.symbol}</span>,
			z: 1,
			flow: true,
			size: false,
		})
	}

	/* 글자 — 🔑 규칙 하나. 행 트랙을 가리키면 그 행에, 없으면 영역 전체에 걸쳐 중앙에 놓인다. */
	for (const glyph of spec.glyphs) {
		const column = g.colLine[glyph.col] ?? g.colLine[spec.textCol] ?? 1
		const row = glyph.row ? g.rowLine[glyph.row] : undefined
		items.set(`text:${glyph.id}`, {
			placement: {
				column: [column, column + 1],
				row: row ? [row, row + 1] : [g.areaTop, g.areaBottom],
			},
			node: (
				<span
					className={`grid size-full items-center ${ctx.centered ? 'justify-center' : 'justify-start'}`}
				>
					<CapLine text={glyph.text} cap={glyph.cap} h={ctx.h} gapBefore={0} />
				</span>
			),
			z: 1,
			flow: true,
			size: false,
		})
	}

	/* 구분바 */
	for (const track of spec.cols) {
		if (track.kind !== 'bar' || !track.id) continue
		const column = g.colLine[track.id] ?? 1
		items.set(`bar:${track.id}`, {
			placement: { column: [column, column + 1], row: [g.areaTop, g.areaBottom] },
			node: <div className="size-full" style={{ background: 'currentColor' }} />,
			z: 1,
			flow: true,
			size: true,
		})
	}

	/* Span(게이지) */
	for (const span of spec.spans) {
		const column = span.side === 'left' ? g.leftGauge(span.depth) : g.rightGauge(span.depth)
		const top = (span.from === 'env' ? g.envTop : g.rowLine[span.from]) ?? 1
		const bottom =
			(span.to === 'env' ? g.envBottom : g.rowLine[span.to] ? g.rowLine[span.to] + 1 : 0) ||
			top + 1
		mark(
			span.id,
			{ column: [column, column + 1], row: [top, bottom] },
			<Span label={span.label} side={span.side} guide={ctx.guide} />,
			3,
		)
	}

	return items
}

export function LockupDiagram({
	lockup,
	siblings,
	h,
	tone,
	color,
	colors,
	stage,
	symbolT,
	symbolColors,
}: {
	lockup: Lockup
	/** 같은 계층의 다른 꼴들. 🔑 그 스펙까지 만들어 정체의 **합집합**을 마운트해 둔다. */
	siblings: Lockup[]
	h: number
	/** 판이 밝은가 어두운가. 🔴 판 **색**만으로는 알파를 정할 수 없어 따로 받는다. */
	tone: 'light' | 'dark'
	/**
	 * 락업(글자·구분바)의 색. 🔴 도판에도 **색상 표현이 그대로 적용된다** — 도판은 락업을 치수와
	 * 함께 보여주는 같은 락업이지, 다른 그림이 아니다. 안 넘기면 글자가 페이지 전경색을 상속해
	 * 표현을 바꿔도 안 물든다(실제 결함이었다). 주석(치수선·라벨·면)은 `guide`가 따로 가진다.
	 */
	color: string
	colors: Record<string, string>
	/** 판 색. 라벨의 knockout 배경으로 쓴다(테마 토큰이 아니라 판이 기준이다). */
	stage: string
	symbolT: number
	symbolColors: string[]
}) {
	const spec = useMemo(() => diagramSpec(lockup), [lockup])
	const g = useMemo(() => resolve(spec, h), [spec, h])
	// 🔑 정체가 바뀌었는가 = 판의 구조가 바뀌었는가. H·색은 여기 안 들어간다(크기·색은 이산이다).
	const register = useDiagramFlip(`${lockup.key}|${spec.textCol}`)
	const motion = useMotion()
	const guide = guideColorOf(colors)

	const items = useMemo(() => {
		const ctx = {
			h,
			guide,
			stage,
			tone,
			motion,
			symbol: <SymbolMark h={h} t={symbolT} colors={symbolColors} marginTop={undefined} />,
			centered: lockup.orientation === 'vertical',
		}
		const merged = new Map<string, Item & { present: boolean }>()
		for (const [key, item] of buildItems(spec, g, ctx))
			merged.set(key, { ...item, present: true })
		/* 🔑 이 꼴에 없는 정체도 노드·글자를 갖는다 — 배치만 이 꼴 기준으로 푸니 자리를 못 찾는
		      것은 이음선으로 떨어지고, 사라질 때도 페이드아웃이 실제로 보인다. */
		for (const sibling of siblings) {
			if (sibling.key === lockup.key) continue
			for (const [key, item] of buildItems(diagramSpec(sibling), g, ctx)) {
				if (!merged.has(key)) merged.set(key, { ...item, present: false })
			}
		}
		return merged
	}, [spec, g, siblings, lockup, h, guide, stage, tone, motion, symbolT, symbolColors])

	/* 🔴 순서를 고정한다 — 자리가 흔들리면 DOM이 재배열되어 같은 값을 잃는다.
	   🔴 「보이는 것」과 「숨은 것」을 두 배열로 나누면 안 된다. 같은 key라도 React는 다른 자식
	      슬롯으로 보고 언마운트→리마운트하며, 그러면 이동 전환이 죽는다(실측으로 잡았다). */
	const order = useMemo(() => [...items.keys()].sort(), [items])

	/** 🔑 없는 정체의 자리 — 「지워졌다」가 아니라 「글자 블록 속으로 접혔다」로 읽히게.
	 *  ponytail: 정체별 이음선 표가 더 정확하다(구분바는 `gap:branch:0`으로). 표 하나를 위해
	 *  데이터를 늘리지 않았고, 필요해지면 여기가 그 자리다. */
	const textColumn = g.colLine[spec.textCol] ?? 1
	const seam: Placement = {
		column: [textColumn, textColumn + 1],
		row: [g.areaTop, g.areaBottom],
	}

	return (
		/* 🔴 `h-full`이 있어야 판의 `size-full`이 캔버스 높이를 받는다 — 없으면 내용 높이가 되어
		   세로 신축 트랙이 0으로 접히고 세로 점선이 캔버스 위아래에 못 닿는다. */
		<div className="size-full min-h-0 min-w-0 overflow-clip">
			{/* 카드 영역을 채우고 남는 공간은 신축 트랙으로 나눈다. */}
			<div
				className="relative grid size-full min-h-0 min-w-0"
				style={{
					gridTemplateColumns: g.columns.join(' '),
					gridTemplateRows: g.rows.join(' '),
					alignItems: 'stretch',
					/* 🔑 색은 여기 한 번만 얹는다 — 글자·구분바가 상속하고, 주석 마크는 전부
					   `guide`를 명시로 갖고 있어 영향을 받지 않는다. 전환은 락업과 같은 토큰이다. */
					color,
					transition: motion ? `color ${MORPH}` : undefined,
				}}
			>
				{order.map((key) => {
					const item = items.get(key)
					if (!item) return null
					const placement = item.present ? item.placement : seam
					return (
						<div
							key={key}
							ref={register(key, item.size)}
							data-diagram={key}
							data-absent={item.present ? undefined : 'true'}
							aria-hidden={item.present ? undefined : true}
							className="pointer-events-none min-w-0"
							style={{
								gridColumn: `${placement.column[0]} / ${placement.column[1]}`,
								gridRow: `${placement.row[0]} / ${placement.row[1]}`,
								zIndex: item.z,
								opacity: item.present ? 1 : 0,
								transition: motion ? `opacity ${MORPH}` : undefined,
								/* 🔴 주석 마크는 흐름에서 뺀다 — `max-content` 트랙이 전폭 Band나 없는
								   정체의 글자 폭을 다시 읽어 트랙이 떠는 되먹임을 끊는다. 판을 만드는
								   것(심볼·글자·구분바)만 흐름에 남는다. */
								...(item.flow && item.present
									? null
									: { position: 'absolute' as const, inset: 0 }),
							}}
						>
							{item.node}
						</div>
					)
				})}
			</div>
		</div>
	)
}
