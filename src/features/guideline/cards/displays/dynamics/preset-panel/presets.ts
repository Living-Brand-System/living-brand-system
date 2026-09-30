import { BRAND_FONT_STACK, LEADING } from '../brand-typeface'

// 이미지가 아니라 코드로 그려지는 나쁜예시 프리셋. 두 종류다 — 위반이 **색**인 것(COLOR_PRESETS)과
// 위반이 **글자 자체**인 것(TYPO_PRESETS). 둘은 admin에서 한 select를 나눠 쓰므로 키가 겹치면 안 된다.
//
// 출처는 브랜드팀 SVG `0730_HD_Guidlines_All-54.svg`(가이드라인 54p, 컬러)와 Artboard 49(타이포)이고,
// 패널 색·밴드 위치·로고 변형을 그 아트워크에서 그대로 뽑았다. 눈대중으로 고치지 말 것.
//
// 🔴 여기 색은 전부 "위반 예시"라 brand-colors에 넣지 않는다 — 지정 컬러가 아닌 게 요점이다.
// 🔴 schema.ts가 이 파일의 PRESET_OPTIONS를 읽는다. payload.config는 Node에서 로드되므로
//    react·이미지 import를 절대 넣지 말 것(docs/11 §2).
//
// 예시를 CMS에 이미지로 올리지 않고 코드 프리셋으로 두는 이유: 색·그라디언트·투명도 중첩은
// 래스터 이미지로 만들면 원본 값이 사라진다. 키로 참조하면 조합이 문자열 하나로 표현된다.

/** 패널 위에 겹쳐 깔리는 띠. 폭 합이 100%를 넘어 서로 물린다 — 그 겹침이 보여줄 대상이다. */
export type Band = { color: string; leftPct: number; widthPct: number }

export type ColorPreset = {
	/** 패널 배경. CSS background 값 그대로 */
	panel: string
	/** 투명도·중첩 항목에만 있다 */
	bands?: Band[]
	/** 로고를 어떻게 그리나. `fill`이 있으면 단색형을 그 색으로 칠한다 */
	logo: { variant: 'default' | 'white' | 'mono'; fill?: string; opacity?: number }
}

/** 밴드 알파. SVG의 `opacity: .6`. */
export const BAND_OPACITY = 0.6

export const COLOR_PRESETS = {
	'off-palette': {
		panel: '#3C0087',
		logo: { variant: 'mono', fill: '#002F87' },
	},
	gradient: {
		// SVG의 linear-gradient 4스톱(좌→우) 그대로.
		panel: 'linear-gradient(90deg, #00AF41 0%, #009A3B 28%, #007D34 74%, #007332 100%)',
		logo: { variant: 'white' },
	},
	'low-contrast': {
		panel: '#4D4D4D',
		logo: { variant: 'mono', fill: '#666666' },
	},
	'unpaired-combo': {
		panel: '#000A32',
		logo: { variant: 'default' },
	},
	'overlay-stack': {
		panel: '#000000',
		// 🔴 알파는 일부러 띠마다 준다. 보통은 그룹째로 투명하게 해서 겹침이 진해지는 걸 피하지만
		//    (widget-css-traps), 여기서는 그 누적이 바로 "컬러 중첩"이라 없애면 예시가 무의미해진다.
		bands: [
			{ color: '#73D75A', leftPct: 0, widthPct: 26.06 },
			{ color: '#00AF41', leftPct: 18.91, widthPct: 31.09 },
			{ color: '#007332', leftPct: 39.89, widthPct: 47.61 },
			{ color: '#00280A', leftPct: 75, widthPct: 25 },
		],
		logo: { variant: 'white' },
	},
	'brightness-opacity': {
		panel: '#000000',
		logo: { variant: 'default', opacity: 0.6 },
	},
} as const satisfies Record<string, ColorPreset>

export type ColorPresetKey = keyof typeof COLOR_PRESETS

/**
 * 타이포 위반 프리셋(Artboard 49). 컬러 판형과 판은 같지만 위반이 글자 자체라 색으로는 표현할 수 없다.
 * 원본은 여섯 칸이 **같은 문구**에 서로 다른 위반을 하나씩 건 것이라, 문구는 공유하고 칸마다 CSS만 다르다.
 *
 * 🔴 지금 붙은 HD체는 라틴 서브셋이라 국문 줄이 본문 서체로 폴백된다. 서체 위반 칸은 세리프로 갈려
 *    여전히 읽히지만, 나머지 칸의 국문은 엄밀히는 "지정 서체"가 아니다 — 서체가 들어오면 저절로 맞는다.
 */
export type TypoPreset = {
	/** 칸마다 명시한다 — 위반 하나가 "서체가 바뀐 것"이라 기본값에 숨기면 무엇이 지정 서체인지 안 읽힌다. */
	fontFamily: string
	letterSpacing?: string
	/** 형태 변형·기울임. 둘 다 transform 한 줄로 표현된다. */
	transform?: string
	/** 줄별 크기 배수(기본 1). 한 문장 안에서 크기가 갈리는 위반을 표현한다. */
	lineScale?: readonly number[]
}

/** 여섯 칸이 공유하는 문구. 줄바꿈 위치까지 원본을 따른다. */
export const TYPO_SAMPLE_LINES = ['인류의 미래를 개척하는', 'FUTURE BUILDER'] as const

/**
 * 판 폭 기준 글자 크기. 원본은 456px 판에 39.2px(8.6%)이지만 자간을 넓히는 칸이 그 크기로는 판을 넘는다.
 * 여섯 칸이 같은 크기여야 위반만 비교되므로 가장 넓어지는 칸에 맞춰 낮췄다.
 * 🔴 폰트에서 잰 수치가 아니라 판형 비율이다 — 서체가 교체돼도 그대로 쓴다.
 */
export const TYPO_FONT_SIZE = '6.5cqw'
/** 글자가 판 가장자리에 닿지 않게 두는 상한. 넘칠 것 같으면 잘리는 대신 줄바꿈으로 흐른다. */
export const TYPO_MAX_WIDTH = '92cqw'
/** Bold. AVAILABLE_WEIGHTS에 있는 굵기라 브라우저 합성 없이 실제 굵기로 나온다. */
export const TYPO_WEIGHT = 700
/** 행간은 규정값 그대로다 — 이 판에서 틀린 것은 자간·서체·크기·형태·기울기뿐이어야 한다. */
export const TYPO_LINE_HEIGHT = LEADING.ko.head[0] / 100

/** 브랜드 서체와 장르가 달라야(산세리프 ↔ 세리프) 서체가 바뀐 게 눈에 보인다. */
const WRONG_FONT_STACK = "'Times New Roman', Batang, serif"

export const TYPO_PRESETS = {
	'tight-tracking': { fontFamily: BRAND_FONT_STACK, letterSpacing: '-0.1em' },
	'loose-tracking': { fontFamily: BRAND_FONT_STACK, letterSpacing: '0.2em' },
	'wrong-typeface': { fontFamily: WRONG_FONT_STACK },
	// 원본은 한 문장 안에 39.2px과 28px을 섞었다. 줄 단위로 옮겨 그 비(0.714)를 유지한다.
	'mixed-size': { fontFamily: BRAND_FONT_STACK, lineScale: [1, 28 / 39.2] },
	// 🔴 가로로 늘리면 판을 넘어 잘린다. 판이 남는 축(세로)으로 늘리고 가로를 줄여 왜곡만 보이게 한다.
	distorted: { fontFamily: BRAND_FONT_STACK, transform: 'scale(0.78, 1.45)' },
	// 원본 SVG의 변환값 그대로. 큰 각도지만 그게 위반 예시의 요점이다.
	slanted: { fontFamily: BRAND_FONT_STACK, transform: 'skewX(-29.4753deg) scale(0.8706)' },
} as const satisfies Record<string, TypoPreset>

export type TypoPresetKey = keyof typeof TYPO_PRESETS
export type PresetKey = ColorPresetKey | TypoPresetKey

// 두 프리셋이 select 하나를 나눠 쓰므로 키만 보고 어느 쪽인지 가른다.
// 🔴 반환 타입에 `undefined`를 명시한다 — 삭제된 옛 키가 문서에 남아 있으면 조회가 빈다.
export const colorPreset = (key: PresetKey): ColorPreset | undefined =>
	COLOR_PRESETS[key as ColorPresetKey]
export const typoPreset = (key: PresetKey): TypoPreset | undefined =>
	TYPO_PRESETS[key as TypoPresetKey]

/**
 * admin select용. 라벨은 브랜드팀 캡션을 줄인 것이다.
 * 🔴 컬러·타이포가 한 목록이다. schema는 이 배열만 읽으므로 여기에 이어 붙이면 enum이 따라 늘어난다.
 */
export const PRESET_OPTIONS = [
	{ label: '지정 컬러 외 컬러', value: 'off-palette' },
	{ label: '그라디언트 적용', value: 'gradient' },
	{ label: '명도 대비 낮음', value: 'low-contrast' },
	{ label: '지정되지 않은 배색 조합', value: 'unpaired-combo' },
	{ label: '투명도·컬러 중첩', value: 'overlay-stack' },
	{ label: '밝기 변형 + 투명도', value: 'brightness-opacity' },
	{ label: '자간 지나치게 좁힘', value: 'tight-tracking' },
	{ label: '자간 지나치게 넓힘', value: 'loose-tracking' },
	{ label: '지정 외 서체', value: 'wrong-typeface' },
	{ label: '한 문장 안 크기 혼재', value: 'mixed-size' },
	{ label: '글자 형태 변형', value: 'distorted' },
	{ label: '글자 기울임', value: 'slanted' },
] as const satisfies readonly { label: string; value: PresetKey }[]
