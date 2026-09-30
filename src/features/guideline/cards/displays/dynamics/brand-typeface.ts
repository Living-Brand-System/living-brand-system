// Typography 토픽 위젯들이 공유하는 서체 상수. 값의 출처는 브랜드팀 SVG(Artboard 42~49)다.
//
// 🔴 위젯은 폰트에서 잰 수치를 상수로 박지 않는다 — 서체가 바뀌면 theme.css의 @font-face만
//    갈아 끼우고 위젯은 손대지 않는 상태가 목표다.
//
// 🔴 react·이미지 import 금지(schema가 참조할 수 있다).

/** 브랜드 서체 스택. HD체가 못 뜨는 동안만 본문 서체가 받아 준다. */
export const BRAND_FONT_STACK = '"HD OTF", var(--font-body)'

/** 굵기 3종. 원본 Artboard 43이 BOLD / MEDIUM / LIGHT 3열로 보여 준다. */
export const WEIGHTS = [
	{ key: 'light', label: 'Light', value: 300 },
	{ key: 'medium', label: 'Medium', value: 500 },
	{ key: 'bold', label: 'Bold', value: 700 },
] as const
export type WeightKey = (typeof WEIGHTS)[number]['key']

/** 현재 배포 서체에 실제로 있는 굵기. 없는 굵기는 브라우저가 합성해 원본과 다르게 보인다. */
export const AVAILABLE_WEIGHTS: readonly number[] = [300, 500, 700]

export const LANGUAGES = [
	{ key: 'ko', label: '국문' },
	{ key: 'en', label: '영문' },
	{ key: 'enCaps', label: '영문 (All Caps)' },
] as const
export type LanguageKey = (typeof LANGUAGES)[number]['key']

export const TIERS = [
	{ key: 'head', label: 'Head Copy', weight: 700 },
	{ key: 'sub', label: 'Sub Copy', weight: 700 },
	{ key: 'body', label: 'Body Copy', weight: 500 },
] as const
export type TierKey = (typeof TIERS)[number]['key']

/**
 * 언어 × 단계별 행간 규정(%). 원본 Artboard 46(국문)·47(영문)·48(영문 대문자)에서 그대로 옮겼다.
 * 🔴 이 토픽의 요점이 "언어가 바뀌면 행간 규정이 바뀐다"는 것이다 — 눈대중으로 고치지 말 것.
 */
export const LEADING: Record<LanguageKey, Record<TierKey, [number, number]>> = {
	ko: { head: [130, 140], sub: [140, 150], body: [150, 160] },
	en: { head: [115, 125], sub: [125, 135], body: [135, 145] },
	enCaps: { head: [105, 115], sub: [115, 125], body: [135, 145] },
}

/** 단계별 표시 크기(px). 원본 46~48의 60 / 30 / 17을 그대로 쓴다. */
export const TIER_SIZE: Record<TierKey, number> = { head: 60, sub: 30, body: 17 }

/** 원본 46~48의 예시 문단. 언어별로 같은 내용을 옮긴 것이다. */
export const SAMPLE_PARAGRAPH: Record<LanguageKey, Record<TierKey, string>> = {
	ko: {
		head: '새로운 50년을 만들어가는\n그룹의 지주회사 HD현대',
		sub: 'HD현대의 과거 50년은 도전과 성장으로\n우리나라 경제발전의 한 페이지를 작성한\n영광의 역사였습니다.',
		body: 'HD현대(주)는 그룹의 지주회사입니다. HD현대는 1972년 울산의 작은 어촌마을에서 조선사업을 시작해 해양플랜트, 기계, 로봇, 에너지 등으로 사업 영역을 넓히며 성장해왔습니다.',
	},
	en: {
		head: "The Group's holding company shaping\nthe next 50 years",
		sub: 'The past 50 years for HD Hyundai\nhave been a glorious history of\nchallenges and growth',
		body: 'HD Hyundai is the holding company of the group. Starting business as a shipbuilder at a small fishing village in 1972, HD Hyundai is progressing to be a Future Builder.',
	},
	enCaps: {
		head: "THE GROUP'S HOLDING COMPANY SHAPING\nTHE NEXT 50 YEARS",
		sub: 'THE PAST 50 YEARS FOR HD HYUNDAI\nHAVE BEEN A GLORIOUS HISTORY OF\nCHALLENGES AND GROWTH',
		body: 'HD Hyundai is the holding company of the group. Starting business as a shipbuilder at a small fishing village in 1972, HD Hyundai is progressing to be a Future Builder.',
	},
}

/** 굵기 비교용 한 덩어리 문구(Artboard 43). 위계가 없는 단일 텍스트다. */
export const WEIGHT_SAMPLE: Record<LanguageKey, string> = {
	ko: '시대를 이끄는 혁신과\n끊임없는 도전으로\n인류의 미래를 개척합니다',
	en: 'A FUTURE BUILDER,\nPIONEERING\nTHE FUTURE OF HUMANITY',
	enCaps: 'A FUTURE BUILDER,\nPIONEERING\nTHE FUTURE OF HUMANITY',
}

/**
 * 굵기 슬라이더가 쓰는 표본. 국문·영문을 한 덩어리에 섞어 둔다 — 굵기 하나가 두 문자 체계에
 * 어떻게 걸리는지가 이 화면의 요점이라 언어를 갈라 놓으면 그게 안 보인다.
 * 🔴 줄바꿈이 내용의 일부다. 국문 "인류를위해"의 붙임도 브랜드팀 표기 그대로다.
 */
export const WEIGHT_SLIDER_SAMPLE = {
	title: '인류의 미래를 개척하는 Future Builder',
	body: 'HD현대는 세계 1위 조선회사를 넘어 인류를위해\n새로운 가치를 만들어가는 퓨처빌더로 거듭나고자 합니다.\nHD Hyundai aims to go beyond being a global\nno.1 Shipbuilder to a Future Builder that\ncreates a new value and foundation for humanity.',
} as const

/**
 * 굵기 표본의 작은 본문(Artboard 43). 큰 문구 아래에 딸려 같은 굵기로 조판된다 —
 * 굵기는 큰 글자보다 작은 글자에서 인상이 갈리므로 두 크기를 함께 보여 준다.
 * 🔴 브랜드팀 표기를 그대로 옮겼다(국문 "인류를위해"의 붙임 포함). 줄바꿈도 원본이다.
 */
export const WEIGHT_SAMPLE_BODY: Record<LanguageKey, string> = {
	ko: 'HD현대는 세계 1위 조선회사를 넘어\n인류를위해 새로운 가치를 만들어가는\n퓨처빌더로 거듭나고자 합니다.',
	en: 'HD HYUNDAI Aims to go beyond being\na global no.1 Shipbuilder to a Future\nBuilder that creates a new value\nand foundation for humanity.',
	enCaps: 'HD HYUNDAI Aims to go beyond being\na global no.1 Shipbuilder to a Future\nBuilder that creates a new value\nand foundation for humanity.',
}
