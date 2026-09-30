'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DisplayDownload } from '@/features/guideline/cards/actions'
import {
	controllerBoolean,
	controllerNumber,
	controllerString,
} from '@/features/guideline/domain/controller-values'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import { DisplayFit } from '../../../../displays/display-fit'
import { lockupSvg } from '../../../../displays/dynamics/ci-lockup/export-svg'
import {
	BRANCH_VALUES,
	ciLockupHiddenAxes,
	FORM_VALUES,
	HEIGHT,
	LANGUAGE_VALUES,
	SUBSIDIARY_VALUES,
} from '../../../../displays/dynamics/ci-lockup/manifest'
import {
	easeMorph,
	MORPH,
	type MORPH_EASING,
	MORPH_HOLD_MS,
	MORPH_MS,
	morph,
	reducedMotion,
} from '../../../../displays/dynamics/ci-lockup/motion'
import {
	bearingOf,
	branchLabel,
	CLEAR_SPACE_MODES,
	type ClearSpaceMode,
	COLOR_TYPES,
	type ColorType,
	type Column,
	clearSpaceFor,
	deriveLockups,
	FONT,
	fontSizeFor,
	type Language,
	type Lockup,
	lockupOptions,
	MONO_COLORS,
	type MonoColor,
	OVERSEAS_BRANCHES,
	partialColumnArea,
	SUBSIDIARIES,
	SYMBOL_ASPECT,
	SYMBOL_CONTOURS,
	splitScripts,
	stageTone,
	symbolPoints,
	textColorName,
	tierFor,
	trimFor,
} from '../../../../displays/dynamics/ci-lockup/rules'
import { CI_STAGE_DARK, CI_STAGE_LIGHT } from '../../../../displays/dynamics/surface'
import { guideColorOf, guideTint, LockupDiagram } from './diagram'

// CI 락업을 벡터가 아니라 **HTML로 조립한다**. 심볼(승인 아트워크)은 그대로 쓰고, 워드마크만
// 조판해 H비율 그리드에 얹는다. 배치 규칙이 전부 H의 배수라 CSS로 그대로 옮겨진다.
//
// 🔴 자간·행간을 손으로 맞추지 않는다(letter-spacing: normal). 정본과의 차이를 없애면
//    "폰트로 재현 가능한가"를 판정할 수 없다 — 그 판정이 이 위젯의 목적 중 하나다.
// 🔴 폭은 계산하지 않는다. advance width가 균일하지 않고 커닝도 있어 규칙으로 못 낸다.
//    높이·간격만 규칙이 정하고 폭은 폰트 렌더에 맡긴다.
// 🔴 이 위젯은 **컨트롤을 그리지 않는다**(docs/11 §4.1). 무엇을 조절할 수 있는지는 `manifest.ts`가
//    선언하고 하단 알약이 그린다. 여기 남는 것은 Canvas — 값을 읽어 락업을 그리는 일뿐이다.
// 🔴 값 스코프는 **블록 단위**다(`providers/guideline-controller-provider.tsx`). 토픽 라우트가 이 위젯을 여러 번
//    렌더해도 블록마다 자기 값을 갖는다.

/**
 * 🔴 디버그 표시. 트림된 잉크 상자를 눈으로 확인할 때만 `true`로 둔다 — 글자 뒤에 핑크 판이 깔린다.
 * 판이 글자를 딱 감싸면 트림이 맞은 것이고, 위아래나 좌우에 빈틈이 보이면 그만큼 여백이 남은 것이다.
 * 🔴 확인이 끝나면 `false`로 돌리거나 이 상수와 아래 `background` 한 줄을 지운다.
 */
const DEBUG_INK_BOX = false

/**
 * 통합 CI 위젯의 **Canvas**. 🔑 화면에는 락업 하나만 있고, 그것을 갈아끼우는 값은 알약에서 온다.
 * 계층은 켜기 두 개에서 파생되고(본사 = 아무것도 켜지 않은 상태), 꼴·언어가 형태를,
 * 색상 표현이 색과 판을 정한다.
 */
/**
 * 인스턴스 고정값. admin이 이 블록 자식에 넣은 값이고, **알약에서 뺀 축에만** 적용된다.
 *
 * 🔑 그래서 한 블록에 위젯을 여럿 둘 수 있다 — 스코프는 블록당 하나이므로 알약에 남은 축은
 *    판들이 **함께** 움직이고(H·클리어스페이스·치수), 뺀 축은 판마다 자기 값에 머문다(꼴·색상 표현).
 *    정본 지면이 그렇게 구성돼 있다: 가로형·세로형을 나란히, 표현 3종을 나란히.
 * 🔴 규칙은 하나다 — 뺀 축이면 자기 값, 아니면 컨트롤러 값. `layout-grid`의 `override ??` 선례에
 *    「무엇을 뺐나」를 더한 형태다(그쪽은 lock 플래그를 따로 받는다).
 */
export type CiLockupFixed = {
	h?: number | null
	subsidiaryOn?: boolean | null
	subsidiary?: string | null
	branchOn?: boolean | null
	branch?: string | null
	form?: string | null
	language?: string | null
	colorType?: string | null
	mono?: string | null
	clearSpace?: string | null
	measured?: boolean | null
	/** H를 알약에 낼지. 🔴 기본은 꺼짐 — H는 저작자가 판끼리의 비율을 맞추는 값이다. */
	heightControl?: boolean | null
	/** 알약에서 뺀 축 목록. 이것이 「어느 값을 자기 것으로 쓸지」를 정한다. */
	hiddenControls?: (string | null)[] | null
}

export function CiLockupView({
	colors,
	fixed = {},
	diagramVisible,
	showDownload = true,
	framed = true,
}: {
	colors: Record<string, string>
	fixed?: CiLockupFixed
	diagramVisible?: boolean
	showDownload?: boolean
	framed?: boolean
}) {
	// 🔑 값의 뜻은 여기가 갖고, 알약은 id로만 넣고 뺀다. 그래서 fallback을 여기서 준다 —
	//    스코프 밖(위젯 갤러리처럼 블록 없이 렌더)에서도 락업이 그려져야 한다.
	const controller = useGuidelineController()
	const values = diagramVisible === undefined ? controller.values : {}
	// 🔑 뺀 축이면 자기 값, 아니면 알약 값. 스코프 밖이면 알약 값이 매니페스트 기본값으로 떨어진다.
	// 🔴 제한 변환과 **같은 함수**로 판정한다. 둘이 갈라지면 알약에 없는 축을 여기서 알약 값으로
	//    읽어 admin 값이 조용히 버려진다.
	const off = ciLockupHiddenAxes(fixed)
	const pick = <T,>(id: string, own: T | null | undefined, live: T): T =>
		off.has(id) && own !== null && own !== undefined ? own : live

	/** H(심볼 높이). 🔑 락업 내부 치수가 이 값의 배수다. 카드 너비·높이는 바꾸지 않는다. */
	const H = pick('h', fixed.h, controllerNumber(values, 'h', HEIGHT.defaultValue))
	const subOn = pick(
		'subsidiaryOn',
		fixed.subsidiaryOn,
		controllerBoolean(values, 'subsidiaryOn', false),
	)
	const branchOn = pick('branchOn', fixed.branchOn, controllerBoolean(values, 'branchOn', false))
	const form = pick(
		'form',
		fixed.form,
		controllerString(values, 'form', FORM_VALUES, 'horizontal'),
	)
	const language = pick(
		'language',
		fixed.language as Language | null | undefined,
		controllerString(values, 'language', LANGUAGE_VALUES, 'ko'),
	)
	const subKo = pick(
		'subsidiary',
		fixed.subsidiary,
		controllerString(values, 'subsidiary', SUBSIDIARY_VALUES, SUBSIDIARIES[0].ko),
	)
	const branchKey = pick(
		'branch',
		fixed.branch,
		controllerString(values, 'branch', BRANCH_VALUES, branchLabel(OVERSEAS_BRANCHES[0])),
	)
	const colorType = pick(
		'colorType',
		fixed.colorType as ColorType | null | undefined,
		controllerString(values, 'colorType', COLOR_TYPES, 'fullColor'),
	)
	const mono = pick(
		'mono',
		fixed.mono as MonoColor | null | undefined,
		controllerString(values, 'mono', MONO_COLORS, 'BLACK'),
	)
	const clearSpaceMode = pick(
		'clearSpace',
		fixed.clearSpace as ClearSpaceMode | null | undefined,
		controllerString(values, 'clearSpace', CLEAR_SPACE_MODES, 'off'),
	)
	/** 치수 도판. 🔴 규정을 **보여주기만** 한다 — 간격은 조정 대상이 아니다(금지규정 #9). */
	const measured = pick('measured', fixed.measured, controllerBoolean(values, 'measured', false))

	// 계층 파생 규칙은 rules.ts가 소유한다(`tierFor`) — 켜짐 종속·보관 이유가 그 주석에 있다.
	const tier = tierFor(subOn, branchOn)

	const options = lockupOptions(tier)
	// 🔴 단계마다 가진 세트가 달라, 없는 조합이 선택돼 있으면 첫 항목으로 떨어뜨린다.
	const activeForm = options.forms.some((f) => f.key === form) ? form : options.forms[0].key
	const activeLanguage = options.languages.some((l) => l.key === language)
		? language
		: options.languages[0].key

	const subsidiary = SUBSIDIARIES.find((s) => s.ko === subKo) ?? SUBSIDIARIES[0]
	const branch =
		OVERSEAS_BRANCHES.find((b) => branchLabel(b) === branchKey) ?? OVERSEAS_BRANCHES[0]
	const all = deriveLockups({ tier, subsidiary, branch })
	const lockup = all.find((l) => l.form === activeForm && l.language === activeLanguage) ?? all[0]

	// 🔑 형태와 색이 같은 파라미터 하나로 연속 변한다 — 이산 전환이 아니다.
	const isMono = colorType === 'mono'
	const symbolT = useApproach(isMono ? 1 : 0)
	const hex = (name: string) => colors[name] ?? 'currentColor'
	const symbolColors = isMono
		? SYMBOL_CONTOURS.map(() => hex(mono))
		: SYMBOL_CONTOURS.map((c) => hex(c.colorName))
	// 판은 취향이 아니라 규정이다 — 표현이 정하고 테마를 따르지 않는다(surface.ts).
	const tone = stageTone(colorType, mono)
	const stage = framed
		? tone === 'dark'
			? CI_STAGE_DARK
			: CI_STAGE_LIGHT
		: 'var(--guideline-display-background)'
	const clearSpace = clearSpaceFor(lockup.orientation, clearSpaceMode)

	return (
		<LockupFigure
			framed={framed}
			diagramVisible={diagramVisible}
			showDownload={showDownload}
			lockup={lockup}
			h={H}
			color={hex(textColorName(colorType, mono))}
			stage={stage}
			tone={tone}
			guide={guideColorOf(colors)}
			symbolT={symbolT}
			symbolColors={symbolColors}
			clearSpace={clearSpace}
			diagram={
				measured ? (
					<LockupDiagram
						lockup={lockup}
						siblings={all}
						h={H}
						tone={tone}
						color={hex(textColorName(colorType, mono))}
						colors={colors}
						stage={stage}
						symbolT={symbolT}
						symbolColors={symbolColors}
					/>
				) : null
			}
		/>
	)
}

/**
 * 전환기의 슬롯. 하위 선택이 없으면 항목 하나(`key`), 있으면 **반으로 갈린 캡슐**(`cap`+`halves`)이다.
 */

/**
 * 레이아웃이 바뀌어 **덩어리가 다른 자리로 옮겨갈 때** 그 이동을 이어 준다.
 *
 * 🔑 왜 CSS만으로 안 되나: 락업은 판 가운데에 놓이고 폭은 글자가 정한다(`폭은 계산하지 않는다` 주석).
 * 그래서 위치는 레이아웃 결과이고, 레이아웃 결과는 transition 대상이 아니다. 옛 자리를 기억해 두고
 * 새 자리에서 그만큼 거꾸로 밀었다가 놓는 것이 전부다.
 *
 * 🔑 의존 목록이 없다 — 매 렌더에 자리를 재고 **움직였을 때만** 애니메이트한다. 그래서 원인을
 * 열거하지 않아도 된다(글자·꼴·계층·계열사 무엇이 바뀌어도 잡힌다). 안 움직였으면 읽기 두 번으로 끝난다.
 * 🔴 `getBoundingClientRect`가 아니라 `offsetLeft/Top`을 쓴다 — 렌더 사이에 페이지가 스크롤되면
 *    화면 좌표 기준 차이에 스크롤량이 섞여 엉뚱한 거리를 애니메이트한다.
 */
function useSlide() {
	const ref = useRef<HTMLDivElement>(null)
	const previous = useRef<{ x: number; y: number } | null>(null)

	useLayoutEffect(() => {
		const el = ref.current
		if (!el) return
		const now = anchorOf(el)
		const before = previous.current
		previous.current = now
		if (!before || reducedMotion()) return
		const dx = before.x - now.x
		const dy = before.y - now.y
		if (dx === 0 && dy === 0) return
		morph(el, { transform: `translate(${dx}px, ${dy}px)` })
	})

	return ref
}

/**
 * 🔑 **상자가 아니라 심볼을 기준으로 잰다.** 상자(`ClearSpaceFrame`)는 판 가운데에 놓이므로, 글자가
 * 길어지면 상자의 왼쪽 끝은 움직이는데 그 안에서 **가운데 정렬된** 심볼은 제자리다. 상자 기준으로
 * 되돌리면 심볼이 그 차이만큼 끌려갔다 돌아온다(실측: 세로형 본사 언어 전환에서 16px 왕복 —
 * 사용자 지적 「로고가 순간이동」). 크기를 함께 이어도 안 된다: 판이 상자를 가운데 두므로 폭을
 * 되돌리는 것만으로 이미 옛 자리가 재현되어, 이동까지 얹으면 **같은 이동을 두 번** 센다.
 *
 * 심볼은 SVG라 offset 좌표가 없다. 화면 rect의 차이에서 DisplayFit 배율을
 * 제거한 뒤 레이아웃 offset에 더해야 크기 변경을 이동으로 오인하지 않는다.
 */
function anchorOf(el: HTMLElement) {
	const symbol = el.querySelector('[data-ink="symbol"]')
	if (!symbol) return { x: el.offsetLeft, y: el.offsetTop }
	const content = el.closest<HTMLElement>('[data-display-fit-content]')
	const scale = content?.offsetWidth
		? content.getBoundingClientRect().width / content.offsetWidth
		: 1
	const box = el.getBoundingClientRect()
	const ink = symbol.getBoundingClientRect()
	return {
		x: el.offsetLeft + (ink.left - box.left) / (scale || 1),
		y: el.offsetTop + (ink.top - box.top) / (scale || 1),
	}
}

/**
 * 목표값으로 **연속** 접근하는 값. 🔴 형태 보간이 필요한데 `<polygon points>`는 CSS로 보간되지 않아
 * (transition 대상이 아니다) 여기서 프레임마다 계산한다. 색은 CSS `fill` transition이 맡고 같은
 * 지속시간을 쓰므로 형태와 색이 함께 움직인다.
 *
 * 🔴 백그라운드 탭에서는 rAF가 멈춘다(실측: 500ms에 2프레임). 아무도 안 보는 동안 멈추는 것이
 *    맞는 동작이고, 탭이 보이면 남은 구간을 이어서 끝낸다 — `p`가 경과 시간으로 계산되므로
 *    오래 숨어 있었으면 돌아온 첫 프레임에 목표로 스냅한다.
 */
function useApproach(target: number, ms = MORPH_MS) {
	const [value, setValue] = useState(target)
	const current = useRef(target)

	useEffect(() => {
		const from = current.current
		if (from === target) return
		// 🔴 움직임을 줄여 달라고 한 사용자에게는 보간하지 않고 바로 목표로 간다.
		if (reducedMotion()) {
			current.current = target
			setValue(target)
			return
		}
		const start = performance.now()
		let frame = 0
		const step = (now: number) => {
			// 🔴 clamp 필수 — rAF 타임스탬프가 `start`보다 이전일 수 있어(프레임 시작 시각) `p`가
			//    한 프레임 음수가 되고, 그러면 정점이 유효 범위를 벗어난다(실측: -0.0008).
			const p = Math.min(1, Math.max(0, (now - start) / ms))
			// 🔑 CSS와 같은 곡선을 쓴다 — 형태와 색이 같은 리듬으로 움직이게.
			current.current = from + (target - from) * easeMorph(p)
			setValue(current.current)
			if (p < 1) frame = requestAnimationFrame(step)
		}
		frame = requestAnimationFrame(step)
		return () => cancelAnimationFrame(frame)
	}, [target, ms])

	return value
}

/**
 * 심볼. 🔑 정삼각 격자 위 삼각형 3개를 좌표에서 직접 그린다 — 이미지도, 마스크도, 폰트도 아니다.
 * `t`가 0→1로 가면 이음선이 벌어지고(`symbolPoints`) 동시에 색이 단색으로 물든다.
 */
export function SymbolMark({
	h,
	t,
	colors,
	marginTop,
}: {
	h: number
	t: number
	colors: string[]
	marginTop: number | undefined
}) {
	return (
		<svg
			// 🔑 잉크 마커. 심볼을 「그 안의 유일한 svg」로 짐작하지 않게 글자·구분바와 같은 어휘를
			//    쓴다 — 내보내기(`export-svg.ts`)와 덩어리 이동 기준(`anchorOf`)이 이것으로 찾는다.
			data-ink="symbol"
			viewBox={`0 0 ${SYMBOL_ASPECT} 1`}
			width={h * SYMBOL_ASPECT}
			height={h}
			style={{ marginTop }}
			className="block shrink-0 overflow-visible"
			aria-hidden="true"
		>
			{symbolPoints(t).map((points, i) => (
				<polygon
					key={SYMBOL_CONTOURS[i].colorName}
					points={points.map(([x, y]) => `${x},${y}`).join(' ')}
					fill={colors[i]}
					style={{ transition: `fill ${MORPH}` }}
				/>
			))}
		</svg>
	)
}

function LockupFigure({
	lockup,
	h,
	color,
	stage,
	tone,
	guide,
	symbolT,
	symbolColors,
	clearSpace,
	diagram,
	diagramVisible,
	showDownload,
	framed,
}: {
	lockup: Lockup
	h: number
	color: string
	stage: string
	/** 판이 밝은가 어두운가. 🔴 판 위에 얹히는 컨트롤의 색을 이것이 정한다 — 테마가 아니다. */
	tone: 'light' | 'dark'
	/** 치수 도판과 공유하는 안내선 초록. 클리어스페이스의 선·면이 같은 색이어야 한다. */
	guide: string
	symbolT: number
	symbolColors: string[]
	/** 여백(H 배수). 0이면 그리지 않는다. */
	clearSpace: number
	/**
	 * 치수 도판. **hover하는 동안에만** 판 안의 락업을 이것으로 갈아끼운다(같은 자리·같은 판 크기).
	 * null이면 이 판은 치수를 갖지 않는다(저작 결정 — `manifest.ts`의 `MEASURED`).
	 */
	diagram: React.ReactNode
	diagramVisible?: boolean
	showDownload: boolean
	framed: boolean
}) {
	// 🔑 기본 상태는 규정을 **얹은** 락업(클리어스페이스)이고, 치수는 들여다볼 때만 나온다
	//    (사용자 지정 2026-08-20). 여백은 락업 위에 얹히지만 치수는 판을 갈아치우므로, 늘 켜 두면
	//    이 판이 로고가 아니라 계측기로 읽힌다.
	// 🔴 CSS로 못 한다 — 보이고 숨는 것이 아니라 **다른 트리로 교체**되기 때문이다.
	const [peeking, setPeeking] = useState(false)
	const shown = (diagramVisible ?? peeking) ? diagram : null

	const stageRef = useRef<HTMLDivElement>(null)
	// 파일 생성은 위젯, 버튼·진행·실패 표시는 카드 Actions가 소유한다.
	const download = async () => {
		const root = stageRef.current?.querySelector<HTMLElement>('[data-lockup]')
		if (!root) throw new Error('내보낼 로고가 없습니다.')
		return {
			filename: `${lockup.label} 로고.svg`,
			blob: new Blob([await lockupSvg(root)], { type: 'image/svg+xml' }),
		}
	}

	return (
		// hover는 콘텐츠 전환만 소유한다. 다운로드는 카드 Actions에서 독립적으로 동작한다.
		<div
			className="relative size-full min-h-0 min-w-0"
			onPointerEnter={() => setPeeking(true)}
			onPointerLeave={() => setPeeking(false)}
		>
			{/* 기본형 Full Color는 밝은 배경 전용이다. 도판은 스크롤 없이 판 경계에서 자른다. */}
			{/* 배경은 카드 영역을 채우고, 로고·보호 공간만 가용 영역 안에 맞춘다. */}
			<div
				ref={stageRef}
				className={`relative flex size-full min-h-0 min-w-0 items-center justify-center overflow-clip ${framed ? 'border border-border' : ''}`}
				style={{
					background: framed ? stage : undefined,
					transition: `background-color ${MORPH}`,
				}}
			>
				{/* 🔑 갈아치우지 않고 **겹쳐 두고 투명도만** 바꾼다 — 둘은 같은 규정의 두 얼굴이라
					툭 바뀌면 다른 것으로 갈아탄 것처럼 읽힌다. 겹쳐 두는 덕에 도판이 마운트를
					반복하지 않아 그 안의 FLIP도 흔들리지 않는다. */}
				<div
					className="absolute inset-0"
					aria-hidden={!!shown}
					style={{
						opacity: shown ? 0 : 1,
						transition: `opacity ${MORPH}`,
						// 🔴 **나가는 쪽만** 기다린다(`MORPH_HOLD_MS` 주석). 양쪽에 걸면 들어오는 층도
						//    늦어져 딥이 그대로 남는다.
						transitionDelay: shown ? `${MORPH_HOLD_MS}ms` : '0ms',
					}}
				>
					<DisplayFit>
						<ClearSpaceFrame h={h} clearSpace={clearSpace} guide={guide} tone={tone}>
							<Composed
								lockup={lockup}
								h={h}
								color={color}
								symbolT={symbolT}
								symbolColors={symbolColors}
							/>
						</ClearSpaceFrame>
					</DisplayFit>
				</div>
				{diagram ? (
					<div
						className="pointer-events-none absolute inset-0 flex items-center justify-center"
						aria-hidden={!shown}
						style={{
							opacity: shown ? 1 : 0,
							transition: `opacity ${MORPH}`,
							transitionDelay: shown ? '0ms' : `${MORPH_HOLD_MS}ms`,
						}}
					>
						<DisplayFit>{diagram}</DisplayFit>
					</div>
				) : null}
			</div>
			{shown || !showDownload ? null : (
				<DisplayDownload
					format="svg"
					label={`${lockup.label} SVG 내려받기`}
					download={download}
				/>
			)}
		</div>
	)
}

/**
 * 클리어스페이스 프레임. 🔑 여백은 **로고 바운딩박스 사방 균일**이고(rules.ts `clearSpaceFor`),
 * 우리는 잉크로 트림해 두었으므로 안의 락업 박스가 곧 그 bbox다 — 여백이 그대로 규정이 된다.
 *
 * 두 겹으로 보인다: 바깥 실선이 여백의 끝(누구도 넘어올 수 없는 선)이고, 안쪽 점선이 로고 bbox다.
 * 🔑 선과 면은 **치수 도판과 같은 초록**이다(사용자 지정 2026-08-20). 여백과 간격은 다른 규정이지만
 *    「규정을 그린 선」이라는 점은 같아서, 색이 갈리면 둘이 다른 종류의 정보로 읽힌다.
 * 🔴 여백 면을 `padding`이 아니라 **border**로 그린다 — padding에 배경을 깔면 로고 자리까지 함께
 *    칠해진다. border는 그 띠만 칠하고, 자리 차지는 padding과 정확히 같다(둘 다 auto 크기라
 *    box-sizing에 걸리지 않는다). 안쪽 점선은 padding box(=로고 bbox)에 `inset: 0`으로 붙는다.
 * 🔴 `clearSpace`가 0이면 테두리를 그리지 않지만 **자리는 그대로 차지한다** — 켜고 끌 때 락업이
 *    움직이면 여백이 아니라 로고가 변한 것처럼 보인다.
 */
function ClearSpaceFrame({
	h,
	clearSpace,
	guide,
	tone,
	children,
}: {
	h: number
	clearSpace: number
	/** 치수 도판이 쓰는 안내선 초록. 선도 면도 이 색이다. */
	guide: string
	/** 판이 밝은가 어두운가 — 같은 초록이라도 어두운 판에서는 알파를 벌려야 보인다. */
	tone: 'light' | 'dark'
	children: React.ReactNode
}) {
	const on = clearSpace > 0
	// 🔑 미끄러지는 것은 **이 프레임**이다. 판 가운데에 놓이므로 안의 글자 폭이 바뀌면 자리가 바뀐다.
	// 🔴 `Composed`에 걸면 안 된다 — 이 프레임이 `position: relative`라 그쪽 `offsetLeft`는 항상
	//    padding 값으로 고정돼(offsetParent가 이 프레임이 된다) 움직임을 못 잡는다. 실제로 그렇게 깨졌다.
	const slideRef = useSlide()

	return (
		<div
			ref={slideRef}
			className="relative border-solid"
			style={{
				// 🔴 두께에 전환을 걸지 않는다 — `useSlide`가 잉크 기준으로 이동을 이미 잇는데,
				//    여백까지 흐르면 같은 이동을 두 번 세서 락업이 옛 자리를 지나쳐 되돌아온다.
				borderWidth: h * clearSpace,
				borderColor: on ? guideTint(guide, tone) : 'transparent',
				transition: `outline-color ${MORPH}, border-color ${MORPH}`,
				outline: '1px solid',
				outlineColor: on ? guide : 'transparent',
				outlineOffset: -1,
			}}
		>
			{/* 안쪽 점선 = 로고 bbox. 여백이 무엇의 바깥인지 보이게 한다.
				🔑 `inset: 0`이 곧 로고 bbox다 — 여백을 border로 그리므로 padding box가 그 자리다. */}
			<div
				className="pointer-events-none absolute inset-0 border border-dashed"
				style={{
					borderColor: on ? guide : 'transparent',
					transition: `border-color ${MORPH}`,
				}}
			/>
			{children}
		</div>
	)
}

/** 심볼 + 워드마크를 H비율로 얹는다. 여기 있는 값은 전부 rules.ts에서 온다. */
function Composed({
	lockup,
	h,
	color,
	symbolT,
	symbolColors,
}: {
	lockup: Lockup
	h: number
	color: string
	symbolT: number
	symbolColors: string[]
}) {
	const horizontal = lockup.orientation === 'horizontal'
	// 열이 여럿이면 모든 열이 같은 영역 높이를 공유한다 — 구분바 높이와 하단정렬이 그것을 기준으로 잡힌다.
	const areaPx = lockup.area !== undefined ? lockup.area * h : undefined

	/**
	 * 🔑 심볼이 열 **전체**가 아니라 앞 몇 행에 맞는 꼴이 있다(해외지사 가로형B의 2×2 그리드).
	 * 그때는 flex 중앙정렬을 쓸 수 없어서 — 그러면 매달린 지역명까지 포함해 가운데를 잡는다 —
	 * 위에서부터 쌓고 심볼을 그 블록 중앙으로 끌어올린다.
	 */
	const baseTop =
		lockup.baseRows === undefined
			? undefined
			: (partialColumnArea(lockup, lockup.columns[0], lockup.baseRows) * h - h) / 2

	return (
		<div
			data-lockup=""
			className={`flex ${horizontal ? `flex-row ${baseTop === undefined ? 'items-center' : 'items-start'}` : 'flex-col items-center'}`}
			style={{ gap: h * lockup.gap }}
		>
			{/* 심볼은 형상 규칙으로 그린다 — 이미지가 아니다(SYMBOL_CONTOURS 주석). */}
			<SymbolMark h={h} t={symbolT} colors={symbolColors} marginTop={baseTop} />

			{/* 🔴 열 사이는 flex gap이 아니라 열마다의 marginLeft다 — 열마다 간격이 다를 수 있다. */}
			{/* 🔴 `color`에도 전환이 필요하다 — 없으면 심볼은 물드는데 글자만 즉시 점프해 어긋난다. */}
			<div
				className="flex shrink-0 flex-row items-stretch"
				style={{ color, transition: `color ${MORPH}` }}
			>
				{lockup.columns.map((column, i) => (
					<ColumnStack
						key={column.bar ? `bar-${i}` : column.rows.map((r) => r.text).join('/')}
						lockup={lockup}
						column={column}
						h={h}
						areaPx={areaPx}
						first={i === 0}
					/>
				))}
			</div>
		</div>
	)
}

/**
 * 워드마크 한 열. 🔴 `align: 'bottom'`이면 2행 그리드의 아래 행에 붙는다 — 그러려면 열이 영역
 * 높이만큼 자리를 차지해야 하므로 `minHeight`를 준다. 구분바 열은 글자 없이 면만 그린다.
 */
function ColumnStack({
	lockup,
	column,
	h,
	areaPx,
	first,
}: {
	lockup: Lockup
	column: Column
	h: number
	areaPx: number | undefined
	first: boolean
}) {
	const marginLeft = first ? 0 : h * (column.gapBefore ?? 0)

	if (column.bar !== undefined) {
		// 구분바 높이는 열 영역 전체다(실측). 영역이 없으면 그릴 근거가 없어 렌더하지 않는다.
		return areaPx === undefined ? null : (
			<div
				data-ink="bar"
				style={{
					marginLeft,
					width: h * column.bar,
					height: areaPx,
					background: 'currentColor',
				}}
				className="shrink-0 self-center"
			/>
		)
	}

	const horizontal = lockup.orientation === 'horizontal'
	return (
		<div
			className={`flex shrink-0 flex-col ${horizontal ? 'items-start' : 'items-center'} ${
				column.align === 'bottom' ? 'justify-end' : ''
			}`}
			style={{
				marginLeft,
				...(column.align === 'bottom' && areaPx ? { minHeight: areaPx } : {}),
			}}
		>
			{column.rows.map((row, i) => (
				<CapLine
					key={row.text}
					text={row.text}
					cap={row.cap}
					h={h}
					gapBefore={i === 0 ? 0 : (row.gapBefore ?? lockup.rowGap)}
				/>
			))}
		</div>
	)
}

/**
 * 한 줄을 **잉크 높이가 정확히 `cap × H`가 되도록** 그린다.
 * 🔴 상자 높이가 cap과 같아야 그 위아래 간격(lineGap·gap)이 스펙대로 성립한다. font-size를 그대로
 *    쓰면 어센더·디센더 여백까지 상자에 포함돼 정본보다 벌어진다.
 * 🔴 서체는 하나인데 한 줄 안에서 **경우마다 글자 크기가 다르다**(`HD현대`의 `HD`와 `현대`).
 *    서체가 라틴 대문자와 한글을 다른 크기로 그리는데 정본은 둘의 위아래 끝이 같기 때문이다(FONT 주석).
 *    각 조각을 자기 잉크 상자로 트림하면 남는 높이가 양쪽 다 `cap × H`라, 나란히 놓기만 하면 맞는다.
 * 🔴 좌우도 같이 걷어낸다 — 줄 첫 글자의 왼쪽 여백과 마지막 글자의 오른쪽 여백. 이걸 안 하면
 *    심볼–워드마크 간격이 규정(0.25H)보다 벌어지고, 세로형의 가운데 정렬도 잉크 기준이 아니게 된다.
 */
export function CapLine({
	text,
	cap,
	h,
	gapBefore,
}: {
	text: string
	cap: number
	h: number
	/** 이 줄 위의 간격(H 배수). */
	gapBefore: number
}) {
	return (
		<span
			className="flex items-start"
			style={{
				marginTop: h * gapBefore,
				// 🔴 이 상자가 곧 트림 결과다 — 높이 = cap × H, 폭 = 잉크 폭. DEBUG_INK_BOX 주석 참조.
				background: DEBUG_INK_BOX ? 'rgb(255 0 255 / 0.35)' : undefined,
			}}
		>
			{splitScripts(text).map((run, i, runs) => {
				const trim = trimFor(run.script)
				// 좌우 여백은 줄의 양 끝에서만 걷어낸다 — 조각 사이는 원래 글자 간격이라 건드리지 않는다.
				const left = i === 0 ? bearingOf(run.text[0], run.script).left : 0
				const right =
					i === runs.length - 1 ? bearingOf(run.text.at(-1), run.script).right : 0
				return (
					<span
						key={`${run.script}-${run.text}`}
						data-ink="text"
						className="whitespace-pre"
						style={{
							fontFamily: FONT.family,
							fontWeight: FONT.weight,
							fontSize: fontSizeFor(cap, h, run.script),
							lineHeight: 1,
							// 자간은 건드리지 않는다 — 정본과의 차이가 보여야 판정이 된다.
							letterSpacing: 'normal',
							marginTop: `${trim.top}em`,
							marginBottom: `${trim.bottom}em`,
							marginLeft: `${-left}em`,
							marginRight: `${-right}em`,
						}}
					>
						{run.text}
					</span>
				)
			})}
		</span>
	)
}

export default CiLockupView

/* 🔑 모프 토큰은 `motion.ts`가 소유한다. 여기서 재수출하는 것은 기존 import 경로를 지키기 위함이다. */
export { easeMorph, type MORPH_EASING, MORPH_MS, reducedMotion }
