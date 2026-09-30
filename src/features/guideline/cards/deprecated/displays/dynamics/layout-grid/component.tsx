'use client'

import type { StaticImageData } from 'next/image'
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { controllerBoolean, controllerNumber } from '@/features/guideline/domain/controller-values'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import type { LayoutGridWidget as LayoutGridWidgetRow } from '@/payload-types'
import {
	CI_ART,
	COMPOSITIONS,
	type Element,
	PHOTOS,
	type Placement,
	type Span,
} from '../../../../displays/dynamics/layout-grid/compositions'
import {
	GUIDES,
	GUTTER_X,
	GUTTER_Y,
	MARGIN,
} from '../../../../displays/dynamics/layout-grid/manifest'
import type { LayoutGridSample } from '../../../../displays/dynamics/layout-grid/samples'
import { WIDGET_CAPTION } from '../../../../displays/dynamics/readout'
import { GUIDE_LINE_WIDTH } from '../../../../displays/guide-style'

// 템플릿: HD현대 Key Layout 그리드(정본 규칙). 판형을 축별로 1:2:3으로 나눈 9셀에 개체를 스냅한다.
// 이 파일은 레이아웃 시스템만 소유한다 — 그리드·마진·거터·가이드·개체 종류별 렌더.
// 무엇을 어디에 놓는가(조합)는 compositions.ts의 순수 데이터다. 조합을 늘려도 이 파일은 안 바뀐다.
// 마진·거터 값은 블록 단위 스코프(store.tsx)에 있다 — 한 블록의 판형들이 그 블록 패널로 함께 움직인다.
//
// 🔴 규칙 상수(TRACKS)는 정본이다. 눈대중으로 고치지 말 것.

/** 축별 트랙 비율. 좌상단부터 1:2:3 (가로·세로 동일 규칙, 단위는 축별로 다름). */
const TRACKS = [1, 2, 3]

/** 마진·거터 영역 채움의 투명도. 밴드가 아니라 **그룹**에 적용해야 교차부가 진해지지 않는다. */
const GRID_AREA_OPACITY = 0.3
/** 그리드가 보일 때 콘텐츠 투명도 — 선과 영역이 읽히도록 죽인다. */
const CONTENT_DIMMED = 0.3

/** 표 내부 구분선의 그리드 선 번호(1/6·1/2). 콘텐츠 트랙 사이 경계라 트랙 수에서 파생된다. */
const INTERIOR_LINES = TRACKS.slice(1).map((_, index) => index + 3)

const spanStart = (span: Span) => (Array.isArray(span) ? span[0] : span)
const spanEnd = (span: Span) => (Array.isArray(span) ? span[1] : span)

/** 그리드 표시 — shared면 컨트롤 패널을 따르고, on·off면 이 판형만 고정한다. */
export type GuidesMode = 'shared' | 'on' | 'off'

export function LayoutGridWidget({
	sample,
	caption,
	guides,
	marginPct: marginOverride,
	gutterX: gutterXOverride,
	gutterY: gutterYOverride,
	guideColor,
}: {
	sample?: LayoutGridSample | null
	caption?: string | null
	guides?: GuidesMode | null
	guideColor?: string
	/** 판형별 값. 넣으면 이 판형만 그 값으로 고정된다(패널이 없는 페이지의 유일한 입구). */
	marginPct?: number | null
	gutterX?: number | null
	gutterY?: number | null
}) {
	// 컨트롤러 스코프 밖(컨트롤 없이 판형만 둔 블록)이면 값이 비어 매니페스트 기본값으로 떨어진다.
	const { values } = useGuidelineController()

	// 판형에 값이 있으면 그것이 이기고, 없으면 컨트롤 현재값을 따른다.
	const resolve = (
		override: number | null | undefined,
		control: typeof MARGIN | typeof GUTTER_X | typeof GUTTER_Y,
	) => override ?? controllerNumber(values, control.id, control.defaultValue)
	const marginPct = resolve(marginOverride, MARGIN)
	const gutterX = resolve(gutterXOverride, GUTTER_X)
	const gutterY = resolve(gutterYOverride, GUTTER_Y)

	// 같은 블록의 판형이 서로 다른 그리드 상태를 가질 수 있어야 한다.
	const guidesOn =
		guides === 'on'
			? true
			: guides === 'off'
				? false
				: controllerBoolean(values, GUIDES.id, GUIDES.defaultValue)
	const composition = COMPOSITIONS[sample ?? 'a']
	// 거터의 절반을 셀 안쪽 경계에 넣는다. 마진의 %라서 단위도 마진과 같은 cqmax(긴 축의 1%).
	const gutterHalf = { x: (marginPct * gutterX) / 100 / 2, y: (marginPct * gutterY) / 100 / 2 }

	return (
		<figure className="flex size-full min-h-0 min-w-0 flex-col gap-2">
			{/* 판형 — 카드가 정한 너비·높이를 채운다. cq 단위의 기준 컨테이너다. */}
			<div
				className="relative min-h-0 w-full flex-1 overflow-clip"
				style={{
					containerType: 'size',
					background: composition.background,
					color: composition.color,
				}}
			>
				{/* 그리드가 대지 전체를 덮는다 — 양끝 마진 트랙 덕에 문서 경계도 그리드 선이 된다. */}
				<div
					className="absolute inset-0 grid"
					style={{ ...gridTemplate(marginPct), opacity: guidesOn ? CONTENT_DIMMED : 1 }}
				>
					{composition.items.map((item, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: 정적 조합 배열, 재정렬 없음.
							key={index}
							style={{
								...placement(item),
								...cellPadding(item, gutterHalf),
								...alignment(item),
								background: item.background,
								// 텍스트·CI는 이미지 위에 온다(behind만 이미지 레이어).
								position: 'relative',
								zIndex: item.behind ? 0 : 1,
							}}
						>
							{item.element ? renderElement(item.element) : null}
						</div>
					))}
				</div>

				{guidesOn && (
					<Guides marginPct={marginPct} gutterHalf={gutterHalf} color={guideColor} />
				)}
			</div>

			{/* 캡션은 판형 밖이라 블록 면 위에 온다 — 그 면의 토큰 스코프를 따른다(Block이 선언한다). */}
			{caption ? <figcaption className={WIDGET_CAPTION}>{caption}</figcaption> : null}
		</figure>
	)
}

type Offsets = { x: number; y: number }

/**
 * 대지 전체를 덮는 5×5 트랙. 양끝은 마진, 가운데 3개가 1:2:3 콘텐츠 트랙이다.
 * 선 번호: 1=문서끝 · 2=표끝 · 3=1/6 · 4=1/2 · 5=표끝 · 6(-1)=문서끝.
 * 마진을 트랙으로 두면 문서 경계까지 뻗는 요소를 수치 계산 없이 그리드 선으로 지정할 수 있다.
 */
function gridTemplate(marginPct: number): CSSProperties {
	// 마진 단위는 cqmax(= 판형 긴 축의 1%)다. 축마다 % 기준이 달라지지 않으니
	// 수직·수평 마진이 언제나 같은 길이가 된다 — 판형 종횡비가 뭐든.
	// 🔴 minmax(0, Nfr) 필수 — 맨 `Nfr`은 minmax(auto, Nfr)이라 사진의 intrinsic 크기가
	// 트랙을 밀어내 1:2:3이 깨진다(하한을 0으로 못 박아야 비율이 보존된다).
	const margin = `${marginPct}cqmax`
	const tracks = `${margin} ${TRACKS.map((t) => `minmax(0, ${t}fr)`).join(' ')} ${margin}`
	// 거터를 grid gap으로 주지 않는다 — gap은 남는 폭을 나눠 분할선을 밀어낸다.
	// 대신 셀 안쪽 padding으로 넣어 분할선을 1/6·1/2에 고정한다.
	return { gridTemplateColumns: tracks, gridTemplateRows: tracks }
}

/** 콘텐츠 셀 n번의 변 = 선 n+1(왼·위) / n+2(오른·아래). bleed를 준 변은 문서 끝 선(1 또는 -1)이다. */
function placement({ col, row, bleed = [] }: Placement): CSSProperties {
	return {
		gridColumnStart: bleed.includes('left') ? 1 : spanStart(col) + 1,
		gridColumnEnd: bleed.includes('right') ? -1 : spanEnd(col) + 2,
		gridRowStart: bleed.includes('top') ? 1 : spanStart(row) + 1,
		gridRowEnd: bleed.includes('bottom') ? -1 : spanEnd(row) + 2,
	}
}

/** 거터의 절반씩을 셀 내부 경계에 넣는다. 표 바깥쪽 변과 문서 끝으로 bleed한 변만 거터가 없다. */
function cellPadding({ col, row, bleed = [] }: Placement, half: Offsets): CSSProperties {
	const last = TRACKS.length
	return {
		paddingLeft: spanStart(col) > 1 && !bleed.includes('left') ? `${half.x}cqmax` : 0,
		paddingRight: spanEnd(col) < last && !bleed.includes('right') ? `${half.x}cqmax` : 0,
		paddingTop: spanStart(row) > 1 && !bleed.includes('top') ? `${half.y}cqmax` : 0,
		paddingBottom: spanEnd(row) < last && !bleed.includes('bottom') ? `${half.y}cqmax` : 0,
	}
}

/** 셀 안에서의 정렬. 지정이 없으면 좌상단이라 flex를 쓰지 않는다(개체가 셀을 그대로 채운다). */
function alignment({ alignX, alignY }: Placement): CSSProperties {
	if (!alignX && !alignY) return {}
	const flex = (value?: 'center' | 'end') =>
		value === 'center' ? 'center' : value === 'end' ? 'flex-end' : 'flex-start'
	return {
		display: 'flex',
		flexDirection: 'column',
		alignItems: flex(alignX),
		justifyContent: flex(alignY),
	}
}

/** 개체 종류 → 컴포넌트. 조합 데이터가 아는 것은 종류와 값뿐이고, 조판 규칙은 여기 있다. */
function renderElement(element: Element): ReactNode {
	switch (element.kind) {
		case 'photo':
			return <Photo src={PHOTOS[element.asset]} />
		case 'ci':
			return <Ci src={CI_ART[element.art]} height={element.height} mono={element.mono} />
		case 'caption':
			return <Caption>{element.text}</Caption>
		case 'title':
			return <Title>{element.text}</Title>
		case 'fillTitle':
			return <FillTitle>{element.text}</FillTitle>
	}
}

/**
 * 그리드 표시 = 마진 링 + 거터 밴드의 **면**. 5×5 트랙 위에 그려 위치 계산이 없다.
 * 색은 `bg-primary` — 주입된 브랜드 색을 따른다(docs/09 §4·§5). 판형 배경은 조합 데이터라 토큰이 아니다.
 *
 * 🔴 밴드를 불투명하게 그리고 그룹째로 한 번만 투명하게 만든다. 밴드에 직접 알파를 주면 거터
 *    교차부에서 알파가 누적돼 그 네 곳만 진해진다.
 *
 * 새 카드가 color를 전달하면 5% 면과 1px 셀 경계선을 사용한다.
 * 구형 도판은 셀 경계의 1px 분할선을 그리지 않는다 — Figma(61:3299)의 판형 다섯 아티클 어디에도 없다.
 *    마진·거터를 면으로만 보여주는 것이 이 도판의 어법이고, 선을 얹으면 면보다 선이 먼저 읽힌다.
 */
function Guides({
	marginPct,
	gutterHalf,
	color,
}: {
	marginPct: number
	gutterHalf: Offsets
	color?: string
}) {
	return (
		<>
			<div
				className="pointer-events-none absolute inset-0 grid"
				data-slot="layout-grid-guide-fill"
				style={{
					...gridTemplate(marginPct),
					color,
					opacity: color ? 0.05 : GRID_AREA_OPACITY,
				}}
			>
				{/* 마진 영역 — 바깥 링 4개 밴드. 트랙이라 좌표를 계산하지 않는다. */}
				<div
					className={color ? 'bg-current' : 'bg-primary'}
					style={{ gridColumn: '1 / -1', gridRow: 1 }}
				/>
				<div
					className={color ? 'bg-current' : 'bg-primary'}
					style={{ gridColumn: '1 / -1', gridRow: -2 }}
				/>
				<div
					className={color ? 'bg-current' : 'bg-primary'}
					style={{ gridColumn: 1, gridRow: '2 / -2' }}
				/>
				<div
					className={color ? 'bg-current' : 'bg-primary'}
					style={{ gridColumn: -2, gridRow: '2 / -2' }}
				/>

				{/* 거터 — 구분선은 실제 트랙이 아니라 셀 padding이라, 구분선이 왼변(위변)인 셀에 붙여
			    절반만큼 밀고 거터 폭만큼 채워 선을 가운데 두고 덮는다. */}
				{INTERIOR_LINES.map((line) => (
					<div
						key={`gutter-v-${line}`}
						className={color ? 'bg-current' : 'bg-primary'}
						style={{
							gridColumn: line,
							gridRow: '2 / -2',
							marginLeft: `-${gutterHalf.x}cqmax`,
							width: `${gutterHalf.x * 2}cqmax`,
						}}
					/>
				))}
				{INTERIOR_LINES.map((line) => (
					<div
						key={`gutter-h-${line}`}
						className={color ? 'bg-current' : 'bg-primary'}
						style={{
							gridColumn: '2 / -2',
							gridRow: line,
							marginTop: `-${gutterHalf.y}cqmax`,
							height: `${gutterHalf.y * 2}cqmax`,
						}}
					/>
				))}
			</div>
			{color && (
				<div
					data-slot="layout-grid-guide-lines"
					className="pointer-events-none absolute inset-0 grid"
					style={{ ...gridTemplate(marginPct), color }}
				>
					{TRACKS.flatMap((rowTrack, row) =>
						TRACKS.map((colTrack, col) => (
							<div
								key={`${rowTrack}-${colTrack}`}
								style={{
									gridColumn: col + 2,
									gridRow: row + 2,
									marginLeft: col === 0 ? 0 : `${gutterHalf.x}cqmax`,
									marginRight: col === 2 ? 0 : `${gutterHalf.x}cqmax`,
									marginTop: row === 0 ? 0 : `${gutterHalf.y}cqmax`,
									marginBottom: row === 2 ? 0 : `${gutterHalf.y}cqmax`,
									border: `${GUIDE_LINE_WIDTH}px solid currentColor`,
								}}
							/>
						)),
					)}
				</div>
			)}
		</>
	)
}

// ── 개체 렌더 ────────────────────────────────────────────────

/**
 * CI 락업. 높이만 주고 폭은 원본 비율대로 두므로 가로형은 셀 밖으로 넘친다(overflow 허용).
 * 크기는 텍스트와 같은 대지 기준 단위(cqmax)라 셀 크기·거터에 따라 변하지 않는다.
 * 🔴 비율은 CSS로 바꾸지 않는다(금지 7).
 * mono = 단색 락업. 이 파일은 fill 선언이 없어(= 색을 입혀 쓰라고 비워둔 아트워크) 그대로 두면
 * SVG 기본값인 검정이다. 색을 넣는 것이 정상 사용이며, 여기서는 어두운 배경용 흰색으로 렌더한다.
 */
function Ci({ src, height, mono }: { src: StaticImageData; height: string; mono?: boolean }) {
	return (
		// biome-ignore lint/performance/noImgElement: 정적 SVG라 next/image 미사용.
		<img
			// 🔴 .src를 써야 한다 — svg import는 StaticImageData 객체이고 타입이 any라
			//    객체를 그대로 넘겨도 typecheck를 통과한 뒤 런타임에 src="[object Object]"가 된다.
			src={src.src}
			alt=""
			// max-w-none 필수 — preflight의 img{max-width:100%}가 넘치는 폭을 셀 폭으로 되돌린다.
			className="block w-auto max-w-none"
			style={{ height, filter: mono ? 'brightness(0) invert(1)' : undefined }}
		/>
	)
}

/** 사진. 놓인 영역을 꽉 채운다(cover). */
function Photo({ src }: { src: StaticImageData }) {
	return (
		// biome-ignore lint/performance/noImgElement: 위젯 내부 정적 에셋이라 next/image 미사용(기존 위젯 선례).
		<img
			src={src.src}
			alt=""
			// max-w-none 필수 — preflight의 img{max-width:100%}가 셀 밖으로 넘기는 width를 100%로 되돌린다.
			className="block max-w-none"
			style={{ width: '100%', height: '100%', objectFit: 'cover' }}
		/>
	)
}

/** 위젯 텍스트는 전부 HD체 Bold. 서브셋에 소문자가 없어 대문자로 조판한다. */
const HD_BOLD: CSSProperties = { fontFamily: '"HD OTF", sans-serif', fontWeight: 700 }

/** 본문. 문자열의 개행을 그대로 지킨다(pre-line). */
function Caption({ children }: { children: ReactNode }) {
	return (
		<p
			className="uppercase leading-tight"
			style={{ ...HD_BOLD, fontSize: '1.3cqw', whiteSpace: 'pre-line' }}
		>
			{children}
		</p>
	)
}

/** 큰 타이틀. line-height 100% — 행간 여백 없이 글자 높이만 차지한다. */
function Title({ children }: { children: ReactNode }) {
	return (
		<p className="uppercase" style={{ ...HD_BOLD, fontSize: '3.5cqw', lineHeight: '100%' }}>
			{children}
		</p>
	)
}

/**
 * 놓인 영역의 폭을 정확히 채우는 타이틀. 폰트 크기를 계산하지 않는다 —
 * 문자열의 잉크 경계를 한 번 실측해 viewBox로 쓰면, 이후 스케일은 SVG가 폭 100%에 맞춰 처리한다.
 * 실측은 문자열에만 의존하므로 컨테이너가 바뀌어도 다시 재지 않는다.
 * 🔴 글자 모양·자간은 그대로 늘어난다(scaleX 왜곡 없음).
 * 🔴 cap height를 높이로 가정하면 안 된다 — 둥근 대문자(U·D·B)는 베이스라인 아래로 오버슈트가
 *    있어 글자 아래가 잘린다. actualBoundingBox로 실제 잉크 상·하·좌·우를 받아 그만큼만 잡는다.
 */
function FillTitle({ children }: { children: string }) {
	const [ink, setInk] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

	useEffect(() => {
		let alive = true
		// 폰트가 로드된 뒤 재야 폴백 폰트 지표로 잘못 잡히지 않는다.
		document.fonts.ready.then(() => {
			const ctx = document.createElement('canvas').getContext('2d')
			if (!ctx || !alive) return
			ctx.font = '700 1000px "HD OTF", sans-serif'
			const m = ctx.measureText(children)
			// 기준점은 (0, 베이스라인). left는 기준점 왼쪽 방향이 양수라 부호를 뒤집는다.
			setInk({
				x: -m.actualBoundingBoxLeft,
				y: -m.actualBoundingBoxAscent,
				w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
				h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
			})
		})
		return () => {
			alive = false
		}
	}, [children])

	// 실측 전에는 그리지 않는다 — 잘못된 크기로 한 프레임 튀는 것을 막는다.
	if (!ink) return null

	return (
		<svg
			viewBox={`${ink.x} ${ink.y} ${ink.w} ${ink.h}`}
			preserveAspectRatio="xMinYMin meet"
			style={{ width: '100%', display: 'block' }}
		>
			<title>{children}</title>
			<text
				x={0}
				y={0}
				fontFamily={'"HD OTF", sans-serif'}
				fontWeight={700}
				fontSize={1000}
				fill="currentColor"
			>
				{children}
			</text>
		</svg>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function LayoutGridDisplay({ display }: { display: LayoutGridWidgetRow }) {
	return (
		<LayoutGridWidget
			sample={display.sample}
			caption={display.caption}
			guides={display.guides}
			marginPct={display.marginPct}
			gutterX={display.gutterX}
			gutterY={display.gutterY}
		/>
	)
}
