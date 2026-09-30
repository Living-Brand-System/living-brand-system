// CI 락업 조립 규칙. 모든 값은 H(심볼 = Forward Mark 높이) 배수다.
// 출처: 브랜드 가이드라인 `01-specs` A절. 값의 출처 지도와 미해결 항목은 `docs/12-ci-lockup-canon.md`.
//
// 🔴 여기 숫자를 눈대중으로 고치지 말 것. 정본과 어긋나면 브랜드팀과 상의해 스펙을 바꾼다.
// 🔴 완성 락업 SVG를 쓰지 않는 이유: CI → 자회사 → 해외지사는 평평한 3종이 아니라 **계층 누적**이라
//    완성본을 파일로 유지하면 회사·지부가 늘 때마다 배리언트가 곱셈으로 터진다. 전부 같은 H비율
//    그리드에 조각 배치만 다른 결과이므로, 조각(심볼 + 서체) + 규칙으로 조립한다.
//
// 🔴 react·에셋 import 금지(schema가 이 모듈을 참조하게 될 수 있다).

/**
 * 워드마크 조판. 🔴 **임시 서체다** — 이사만루(사용자 지정, weight 400). 정본 서체가 아니다.
 * 락업 하나 안의 텍스트는 **라틴이든 한글이든 전부 이 서체 하나**를 쓴다(사용자 결정 2026-08-14).
 * 🔴 라틴만 있는 서체로 일부를 덮지 말 것 — 반쪽짜리는 안 쓰는 게 낫다는 것이 그 결정의 이유다.
 *
 * 서체는 하나인데 값이 둘인 이유: **워드마크에 나오는 것은 라틴 대문자와 조합형 한글 두 경우뿐**이고
 * 서체가 그 둘을 다른 크기로 그린다. `ink`는 글자가 실제로 그려지는 상자를 베이스라인 기준 em으로
 * 적은 것이고, 경우마다 그 상자를 `cap × H`로 맞추는 것이 조판의 전부다.
 * 🔴 **정본은 라틴 대문자와 한글의 위아래 끝이 정확히 같다** — `scripts/assets/ci/ko-horizontal-default.svg`를
 *    재면 H·D·대가 전부 top 15.75 / bottom 74.25(= 0.65H)로 나온다. 서체는 그렇지 않으므로 렌더가 맞춘다.
 * 🔴 서체를 갈면 아래 수치를 전부 다시 재야 한다 — `python3 scripts/measure-cap-vs-hangul.py <폰트>`
 *    (어센더·디센더도 서체마다 다르다). 한글 `ink`는 받침·오버슛 때문에 글자마다 달라서, 정본에서
 *    유일하게 검증 가능한 `대`를 기준으로 잡는다 — 정본도 `대`가 라틴과 같은 상자를 채우고 `현`이
 *    위로 오버슛하며, 이 서체도 같은 방향으로 벗어난다.
 */
export const FONT = {
	family: '"Isamanru", var(--font-body)',
	weight: 400,
	ascender: 0.85,
	descender: 0.315,
	ink: {
		latin: { top: 0.715, bottom: -0.073 },
		hangul: { top: 0.748, bottom: -0.134 },
	},
} as const

export type Script = 'latin' | 'hangul'

/** 잉크 높이를 `cap × H`로 만드는 font-size. 경우마다 잉크 비율이 달라 나누는 값이 다르다. */
export function fontSizeFor(cap: number, h: number, script: Script) {
	const { top, bottom } = FONT.ink[script]
	return (cap * h) / (top - bottom)
}

/**
 * `line-height: 1`인 줄상자에서 잉크 상자만 남기고 잘라낼 여백(em).
 * 줄상자(1em) 안에 글자상자(asc+desc)가 가운데 놓이므로 베이스라인 위치가 정해지고,
 * 거기서 잉크 위/아래로 남는 만큼을 음수 마진으로 걷어낸다.
 * 🔴 이게 있어야 "간격 0.25H"가 **글자의 눈에 보이는 위아래**를 기준으로 성립한다. 안 걷어내면
 *    폰트의 어센더·디센더 여백까지 간격에 포함돼 정본보다 벌어진다.
 * 🔑 경우별 잉크 상자를 각각 걷어내는 것이 곧 높이·위치를 맞추는 방법이다 — 남는 상자가
 *    양쪽 다 `cap × H`가 되므로 한 줄에 나란히 놓으면 위아래 끝이 정본처럼 일치한다.
 */
/** 줄상자(`line-height: 1`) 위에서 베이스라인까지의 거리(em). 🔑 SVG 내보내기도 이 값을 쓴다. */
export const INK_BASELINE = FONT.ascender + (1 - (FONT.ascender + FONT.descender)) / 2
export function trimFor(script: Script) {
	const { top, bottom } = FONT.ink[script]
	return { top: -(INK_BASELINE - top), bottom: -(1 - INK_BASELINE + bottom) }
}

/**
 * 글자별 좌우 사이드베어링(em) — **위아래 트림의 좌우판이다.** 폰트는 글자 좌우에 여백을 두는데
 * 정본 레터링에는 그런 여백이 없다.
 * 🔴 정본은 심볼–워드마크 간격 0.25H를 **잉크 기준**으로 잰다 — `ko-horizontal-default.svg`에서
 *    심볼 우단 77.93 → `H` 잉크 좌단 100.43 = 22.5 = 정확히 0.25×90H. 글자상자 기준으로 두면
 *    `H`의 LSB 0.065em이 그대로 더해져 규정 간격이 21% 틀어진다(H=100에서 25px → 30.4px).
 * 줄의 **첫 글자 left**와 **마지막 글자 right**만 쓰이므로 그 글자들만 담는다.
 * 🔴 표에 없는 글자는 fallback으로 떨어진다(오차 최대 0.05em). 계열사 이름을 자유입력으로 받으면
 *    대부분 그렇게 되지만, **규정 간격이 걸린 자리는 항상 `HD`로 시작**하므로 그것만은 정확하다.
 *    정확히 맞추려면 브라우저에서 글자마다 실측해야 하고 그건 클라이언트 계산이 필요하다.
 */
const BEARING: Record<string, { left: number; right: number }> = {
	D: { left: 0.065, right: 0.057 },
	E: { left: 0.059, right: 0.049 },
	H: { left: 0.065, right: 0.065 },
	I: { left: 0.065, right: 0.065 },
	R: { left: 0.065, right: 0.008 },
	S: { left: 0.047, right: 0.057 },
	대: { left: 0.063, right: 0.045 },
	업: { left: 0.047, right: 0.087 },
	현: { left: 0.042, right: 0.066 },
}
const BEARING_FALLBACK: Record<Script, { left: number; right: number }> = {
	latin: { left: 0.06, right: 0.06 },
	hangul: { left: 0.04, right: 0.04 },
}
export function bearingOf(char: string | undefined, script: Script) {
	return (char && BEARING[char]) || BEARING_FALLBACK[script]
}

/** 한 줄을 스크립트가 바뀌는 자리에서 끊는다. `HD현대` → `HD`(라틴) + `현대`(한글). */
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/
export function splitScripts(text: string) {
	const runs: { script: Script; text: string }[] = []
	for (const char of text) {
		const script: Script = HANGUL.test(char) ? 'hangul' : 'latin'
		const last = runs.at(-1)
		if (last?.script === script) last.text += char
		else runs.push({ script, text: char })
	}
	return runs
}

export type Orientation = 'horizontal' | 'vertical'

/**
 * 워드마크 한 행.
 * 🔴 `cap`은 **명목 cap 상자**(베이스라인↔cap 라인) 높이다 — 잉크 bbox가 아니다. 정본 도판 6개에서
 *    치수 라벨은 예외 없이 하이라이트 밴드(= 명목 상자)에 붙고, 잉크는 둥근 글자에서 그것을 벗어난다
 *    (한글 `ㅎ`·`ㅇ`, 라틴 `U`·`S`). p28 국문은 잉크로 재면 0.7155H인데 라벨은 0.65H다.
 *    그래서 렌더는 잉크를 상자에 맞추지 않고 **평평한 기준 글자의 상자**를 맞춘다(FONT.ink 주석).
 */
/**
 * 행의 **의미 역할**. 🔑 치수 도판이 꼴을 넘어 같은 요소를 같은 것으로 알아보는 근거다 —
 * 위치(몇 번째 열·행)는 꼴마다 바뀌지만 역할은 바뀌지 않는다. 그래서 꼴을 갈아도 도판의
 * 주석 요소가 새로 생기지 않고 **이동**한다(`diagramSpec`).
 */
export type RowRole = 'wordmark' | 'hd' | 'name' | 'branch'

export type Row = {
	text: string
	cap: number
	/** 의미 역할. 도판이 이것으로 요소의 정체를 잡는다. */
	role: RowRole
	/** 이 행 위의 간격(H 배수). 없으면 락업의 rowGap을 쓴다. 첫 행에서는 무시된다. */
	gapBefore?: number
	/** 🔴 스펙에 없어 추정한 값. 화면에 표시해 브랜드팀 확인 대상임을 드러낸다. */
	assumed?: boolean
}

/**
 * 워드마크 한 열. 🔑 **열이 있어야 가로형A를 표현할 수 있다** — 그 꼴에서 `HD`는 위가 아니라
 * 왼쪽에 서고 계열사명 2행이 오른쪽 열에 쌓인다(정본 실측: 0.65H 밴드 우단이 `D` 우단과 일치).
 * 계층 누적이 "행이 뒤에 쌓인다"가 아니라 **꼴마다 다른 축으로 자란다**는 것이 이 타입의 이유다.
 */
export type Column = {
	rows: Row[]
	/** 앞 열과의 간격(H 배수). 첫 열에서는 무시된다. */
	gapBefore?: number
	/** 행이 열 아래쪽에 붙는다. 2행 그리드에 1행만 들어갈 때 쓴다(해외지사 지역명 1개). */
	align?: 'bottom'
	/** 글자가 아니라 세로 구분바인 열. 값은 폭(H 배수)이고 높이는 열 영역 전체다. */
	bar?: number
}

export type Lockup = {
	key: string
	label: string
	/** 계층: 본사 → 자회사 → 해외지사. */
	tier: Tier
	/** 꼴. 본사는 `horizontal`·`vertical`, 자회사·해외지사는 `FORM_KEYS`다(계층이 가진 세트가 다르다). */
	form: string
	/** 워드마크 언어. 본사만 `hd`(심볼+HD)를 갖고, 해외지사는 `en`뿐이다. */
	language: Language
	orientation: Orientation
	/** 심볼–워드마크 간격(H 배수). */
	gap: number
	/** 열 안 행 사이 기본 간격(H 배수). */
	rowGap: number
	columns: Column[]
	/**
	 * 스펙이 명시한 **로고타입 영역 높이**(H 배수). 🔑 열이 여럿이면 **모든 열이 이 높이를 공유**하고
	 * 열마다 따로 닫혀야 한다 — 그것이 규칙이 맞다는 검산이다(`rules.test.ts`).
	 * 🔴 라벨이 없거나, 라벨이 총합이 아니라 부분 블록을 가리키면 비운다(해외지사 가로형B).
	 */
	area?: number
	/**
	 * 라벨이 **앞 몇 행만** 가리킬 때의 부분 검산. 해외지사 가로형B가 그렇다 —
	 * 0.9H가 앞 3행(자회사에서 물려받은 로고타입 영역)만이고 지역명은 그 밖에 매달린다.
	 */
	partialArea?: { rows: number; value: number }
	/**
	 * 심볼이 **앞 몇 행에** 수직 중앙정렬되는지. 비우면 열 전체에 맞춘다.
	 *
	 * 🔑 해외지사 가로형B가 이것을 필요로 한다. 그 꼴은 자회사 락업을 **건드리지 않고** 지역명을
	 * 오른쪽 열의 아래 행에 매다는 **2×2 그리드**다(사용자 지정) — 즉 심볼은 자회사 블록과 짝을
	 * 이루고 지역명은 그 짝 밖으로 흘러내린다. 정본 실측이 그것이다: 심볼 470–610의 중심 540이
	 * 앞 3행 블록 477–603의 중심과 같고, 지역명을 포함한 전체(477–633.8)의 중심 555.4가 아니다.
	 * 🔴 전체에 맞추면 심볼이 0.11H 내려앉는다.
	 */
	baseRows?: number
	/** 스펙 원문 근거. 화면과 코드가 같은 출처를 가리키게 한다. */
	source: string
	/** 추정이 섞였을 때 그 이유. */
	note?: string
}

/**
 * 본사 CI 배치 비율(01-specs A). 언어와 무관하게 같다.
 * 🔴 본사 비율의 정본은 여기 하나다 — 분리형 조립 샘플(separated-logo-application)도 이 값을 읽는다.
 */
export const LAYOUT: Record<Orientation, { wordmark: number; gap: number }> = {
	horizontal: { wordmark: 0.65, gap: 0.25 },
	vertical: { wordmark: 0.3, gap: 0.2 },
}

/** 계층. 슬라이더가 고르는 단계이고, 뒤로 갈수록 워드마크 줄이 쌓인다. */
export type Language = 'ko' | 'en' | 'hd'

export const TIERS = ['ci', 'subsidiary', 'overseas'] as const
export type Tier = (typeof TIERS)[number]

/**
 * 자회사 — `HD` 뒤에 붙는 것만 담는다. 대문자화는 렌더가 한다(데이터는 기업명 원형을 지킨다).
 * `en`이 두 줄이면 워드마크가 2행으로 쌓인다.
 * 🔴 **첫 줄이 항상 `Hyundai`인 것은 아니다** — 영문에 Hyundai가 없는 회사가 있어서 줄 배분을 데이터가
 *    직접 명시한다. 로직으로 나누면 그 회사에서 틀린다.
 */
export type Subsidiary = {
	ko: string
	en: readonly [string] | readonly [string, string]
	/**
	 * 실존 계열사가 아니라 **조판 실험용 자리표시**. 이름을 무난하게 두기로 했으므로(사용자 지정
	 * 2026-08-21) 화면만 보고는 실존과 구별되지 않는다 — 그래서 플래그로 가른다.
	 * 🔴 자회사 히어로는 이 항목을 **회전에서 뺀다**(`ci-lockup-hero/view.tsx`). 실존 18개 사이에
	 *    섞이면 구별할 길이 없고, 해외지사 히어로에서는 반대로 이것이 고정 자리다.
	 */
	placeholder?: boolean
}

/**
 * 🔴 **기억으로 고치지 말 것.** 18개 전부 각 회사 공식 사이트·HD현대 그룹 영문 페이지에서 확인한 값이고
 *    (2026-08-14, 회사마다 조회 + 독립 반증 2회), 추측이 실제로 빗나가는 자리가 넷 있다:
 *    - `사이트솔루션` = `XiteSolution` — `Site`가 아니고 한 단어다
 *    - `쉘베이스오일` = `Hyundai and Shell Base Oil` — 국문에 없는 `and`가 영문에 들어간다
 *    - `하이드로젠`·`한국조선해양`·`건설기계` = **국문에도 `현대`가 없다**(`HD하이드로젠`). 그래서 `ko`에 `현대`를 담는다
 *    - `이엔티` = 표기 3종이 공존한다(아래 주석)
 */
export const SUBSIDIARIES: readonly Subsidiary[] = [
	{ ko: '현대중공업', en: ['Hyundai', 'Heavy Industries'] },
	{ ko: '현대삼호', en: ['Hyundai', 'Samho'] },
	{ ko: '현대마린솔루션', en: ['Hyundai', 'Marine Solution'] },
	{ ko: '현대마린엔진', en: ['Hyundai', 'Marine Engine'] },
	// 🔴 미확정 — 그룹 영문 페이지는 `HD Hyundai E&T`, 회사 자기 영문 사이트 개요표는 `HD Hyundai ENT`,
	//    로고·copyright는 `HD HYUNDAI ENGINEERING&TECHNOLOGY`다. 사내 CI 기준 표기를 브랜드팀에 확인할 것.
	{ ko: '현대이엔티', en: ['Hyundai', 'E&T'] },
	{ ko: '현대오일뱅크', en: ['Hyundai', 'Oilbank'] },
	{ ko: '현대케미칼', en: ['Hyundai', 'Chemical'] },
	// 🔴 줄 배분 미확정 — 영문 정식명은 `HD Hyundai and Shell Base Oil`이 맞지만, 2행으로 쪼갤 때
	//    `and`가 어느 줄에 붙는지는 정본 락업이 없어 확인 불가. 지금은 "첫 줄은 Hyundai 단독" 규칙을 따랐다.
	{ ko: '현대쉘베이스오일', en: ['Hyundai', 'and Shell Base Oil'] },
	{ ko: '현대오씨아이', en: ['Hyundai', 'OCI'] },
	{ ko: '현대이앤에프', en: ['Hyundai', 'E&F'] },
	{ ko: '현대일렉트릭', en: ['Hyundai', 'Electric'] },
	{ ko: '현대에너지솔루션', en: ['Hyundai', 'Energy Solutions'] },
	{ ko: '현대사이트솔루션', en: ['Hyundai', 'XiteSolution'] },
	{ ko: '현대로보틱스', en: ['Hyundai', 'Robotics'] },
	{ ko: '현대스포츠', en: ['Hyundai', 'Sports'] },
	{ ko: '하이드로젠', en: ['Hydrogen'] },
	{ ko: '건설기계', en: ['Construction', 'Equipment'] },
	{ ko: '한국조선해양', en: ['Korea Shipbuilding &', 'Offshore Engineering'] },

	/*
	 * 🔑 **자리표시 계열사**(사용자 지정 2026-08-21). 실존 계열사 이름을 쓰면 그 조합이 승인된 CI
	 *    표기로 오해된다. 일반명사(`SUBSIDIARY`·`AFFILIATE`)도 후보였지만 그것은 모회사 관점의
	 *    분류어라 락업 안에서 자기소개가 되지 않아, **무난한 업종어**로 정했다.
	 * 🔴 그 선택의 대가는 「실존과 구별이 안 된다」다 — `placeholder` 플래그가 그 구별을 코드에 남긴다.
	 * 🔴 **목록 맨 끝이다.** `SUBSIDIARIES[0]`은 정본 도판 값(현대중공업)이고 매니페스트 기본값이라
	 *    앞에 끼우면 모든 판의 초기 계열사가 바뀐다.
	 */
	{ ko: '현대테크놀로지', en: ['Hyundai', 'Technology'], placeholder: true },
]

/**
 * 해외지사 — 영문 고정. **모든 자회사가 같은 목록을 공유한다**(사용자 결정 2026-08-14) —
 * 계열사별 대응이 아니라 그룹 전체 거점의 합집합이다.
 *
 * 🔴 **18개 전부 실제 거점이다**(2026-08-18 조사: 계열사 8곳의 공식 글로벌 네트워크·사업장 페이지,
 *    법인 등기, 그룹 ESG 뉴스룸). 지어낸 값을 넣지 말 것 — 이 목록이 화면에 나가면 정본으로 오해된다.
 *
 * 🔑 **`business`는 그 거점의 실제 이름이 기능 라벨을 품을 때만 붙인다**(2026-08-21 재조사).
 *    정본 표기체계는 `HD+계열사명+지역명+세부사업명`이지만(B.3 p26·28·30), 기능을 내가 분류해 붙이면
 *    그것이 곧 발명이 된다. 그래서 기준은 하나다 — **법인·센터 이름에 그 말이 들어 있는가.**
 *    예: `HD HYUNDAI EUROPE R&D CENTER GmbH`는 이름 자체가 그렇고, `DUBAI`는 5개 계열사의 기능이
 *    섞여 있어 하나로 못 고른다.
 *
 * 🔑 **한 지역이 두 꼴로 다 나올 수 있다** — 정본 p26이 `EUROPE`와 `EUROPE R&D CENTER`를 같은
 *    페이지에 나란히 싣는다(가로형A 「지역명」/「지역명·사업명」). 그래서 같은 region이 두 항목으로 있다.
 *
 * 도시·국가가 섞인 것은 원본이 그렇다 — 한 나라에 거점이 흩어져 있으면 국가로, 한 도시에 몰려 있으면
 * 도시로 적었다. 락업에서 줄이 넘치지 않게 2~3 단어 안으로 줄인 결과이기도 하다.
 */
export type OverseasBranch = { region: string; business?: string }

export const OVERSEAS_BRANCHES: readonly OverseasBranch[] = [
	// 🔴 도판(p35)에 나온 유일한 값이고 실존 법인이다 —
	//    HD Hyundai Europe Research and Development Center GmbH (뒤셀도르프, HD한국조선해양)
	// ── 지역명 + 세부사업명 — 거점 **이름 자체**에 기능 라벨이 들어 있는 곳만 ──
	// 🔴 도판(p35)에 인쇄된 유일한 값이고 실존 법인이다 —
	//    HD HYUNDAI EUROPE R&D CENTER GmbH (뒤셀도르프 HRB 100284, HD한국조선해양)
	{ region: 'EUROPE', business: 'R&D CENTER' },
	{ region: 'INDIA', business: 'R&D CENTER' }, // 건설기계 India R&D Center (푸네) — 공장·PDC와 별 거점
	{ region: 'CHINA', business: 'R&D CENTER' }, // 건설기계 China R&D Center (장쑤)
	{ region: 'SWITZERLAND', business: 'R&D CENTER' }, // HD Hyundai Electric Switzerland Ltd. (취리히, 2017)
	// Hyundai Technologies Center Hungary Ltd. (부다페스트) — 이름이 곧 `TECHNOLOGIES CENTER`다
	{ region: 'HUNGARY', business: 'TECHNOLOGIES CENTER' },
	/*
	 * 🔑 아래 넷은 **우리가 정한 값**(사용자 지정 2026-08-21). 정본 도판이 예시를 둘밖에 안 실어서
	 *    조판 케이스가 부족했다 — 짧은 사업명(`SHIPYARD`)부터 두 단어까지 폭을 훑는다.
	 * 🔴 실제 거점의 승인된 표기가 아니다. 지역은 실제 거점 그대로 두고 사업명만 정했다 —
	 *    지역명까지 지어내면 화면에 남은 값이 승인 문제와 무관하게 그냥 오류로 읽힌다.
	 */
	{ region: 'SINGAPORE', business: 'SERVICE CENTER' },
	{ region: 'HOUSTON', business: 'TRAINING CENTER' },
	{ region: 'VIETNAM', business: 'SHIPYARD' },
	{ region: 'ATLANTA', business: 'PARTS CENTER' },

	// ── 지역명만 — 기능 라벨 없이 지역으로만 불리는 곳 ──
	// 🔑 앞 다섯 줄은 HD현대중공업 공식 해외지사 목록 그대로다(hd-hhi.com Contact Us).
	//    그 페이지는 기능어를 하나도 쓰지 않고 지역으로만 적는다 — 「지역명」 꼴의 근거다.
	{ region: 'EUROPE' }, // 🔑 p26 첫 도판이 인쇄한 값. 같은 지역이 두 꼴로 다 나온다
	{ region: 'LONDON' }, // 중공업·일렉트릭·오일뱅크 런던지사
	{ region: 'ATHENS' }, // 중공업 아테네지사 · 마린솔루션 아테네지점
	{ region: 'OSLO' }, // 중공업 오슬로지사 (건설기계 Elnesvågen 공장 병합)
	{ region: 'SINGAPORE' }, // 중공업·마린솔루션·오일뱅크·건설기계 + HD Hyundai Asia Holdings
	{ region: 'TOKYO' }, // 중공업 도쿄지사 · 마린솔루션 도쿄지점 (일렉트릭 오사카지사 병합)
	{ region: 'HOUSTON' }, // 중공업·오일뱅크 휴스턴지사 · 마린솔루션 Americas
	{ region: 'NEW JERSEY' }, // 중공업 뉴저지지사 — 공식 목록에 있는데 빠져 있었다
	{ region: 'PANAMA' }, // 중공업 파나마지사 · 마린솔루션 파나마지점
	{ region: 'DUBAI' }, // 중공업·일렉트릭·오일뱅크·마린솔루션·건설기계 5사
	{ region: 'GERMANY' }, // 일렉트릭 Eschborn · 건설기계 Mannheim · 로보틱스 Munich · 마린솔루션 Hamburg
	{ region: 'CHINA' }, // 창저우·옌타이·톈진·양중 공장, 상하이·베이징 판매·지주
	{ region: 'VIETNAM' }, // HD현대베트남조선(닌호아) · 에코비나(둥꾸엇), 하노이·호치민 지사
	{ region: 'INDIA' }, // 건설기계 Pune 공장·PDC, 인프라코어 Chennai
	{ region: 'PHILIPPINES' }, // HD Hyundai Heavy Industries Philippines (수빅베이 조선소)
	{ region: 'SAUDI ARABIA' }, // 일렉트릭 Arabia L.L.C. + 리야드지사
	{ region: 'ATLANTA' }, // 일렉트릭 America · 로보틱스 USA · 건설기계 North America (GA)
	{ region: 'BRAZIL' }, // 건설기계 Itatiaia 공장 · South America 판매
	{ region: 'SOUTH AFRICA' }, // 건설기계 남아공지사(요하네스버그)
]

/** 가로형B·세로형은 지부명을 한 줄로 쓴다(도판 `EUROPE R&D CENTER`). */
export function branchLabel(branch: OverseasBranch) {
	return branch.business ? `${branch.region} ${branch.business}` : branch.region
}

/** 데이터는 기업명 원형을 지키고 대문자화는 여기서 한다. */
const caps = (t: string) => t.toUpperCase()

/** 본사 CI — 워드마크 한 줄, 한 열. */
function ciLockups(): Lockup[] {
	return (
		[
			['ko', '국문형', 'HD현대'],
			['en', '영문형', 'HD HYUNDAI'],
			['hd', 'HD형', 'HD'],
		] as const
	).flatMap(([key, label, text]) =>
		(['horizontal', 'vertical'] as const).map((orientation) => ({
			key: `ci-${key}-${orientation[0]}`,
			label: `본사 ${label} ${orientation === 'horizontal' ? '가로' : '세로'}`,
			tier: 'ci' as const,
			form: orientation,
			language: key,
			orientation,
			gap: LAYOUT[orientation].gap,
			rowGap: 0,
			columns: [{ rows: [{ text, cap: LAYOUT[orientation].wordmark, role: 'wordmark' }] }],
			source: `01-specs A · ${orientation === 'horizontal' ? '가로형 워드마크 0.65H · 간격 0.25H' : '세로형 워드마크 0.3H · 간격 0.2H'}`,
		})),
	)
}

/**
 * 꼴 3종의 배치 비율. 🔴 스펙이 도판으로 정한 **세트**다 — 정본은 꼴마다 다른 페이지로 제시하고
 * 고르는 대안으로 두지 않는다. 위젯은 화면을 하나로 유지하려고 컨트롤로 열었지만, 그래서
 * **최상위 단독 행**에 두어 다른 축과 섞지 않는다(다른 축은 값이 바뀌어 이어지고, 꼴은 구조가 바뀐다).
 *
 * `hdCap`/`enCap`은 각 행의 명목 cap 상자 높이(H 배수)다. **가로형A만 열이 갈린다** —
 * `HD`가 왼쪽 열에 서고 계열사명 2행이 오른쪽 열에 쌓이며, 두 열이 같은 영역 높이(0.65H)를 공유한다.
 */
const FORMS = {
	horizontalA: {
		label: '가로형A',
		orientation: 'horizontal' as const,
		gap: 0.25,
		/** 열 사이 간격. 가로형A는 이것이 `HD`와 계열사명 열 사이다. */
		columnGap: 0.2,
		koSingleCap: 0.65,
		hdCap: 0.65,
		enCap: 0.28,
		/** 영문 2행 사이 간격 — [역산: 0.65 − 0.28 − 0.28] + [실측 8.13pt = 0.0902H] */
		enRow2Gap: 0.09,
		area: 0.65,
		source: 'B.2 p28 · 심볼 간격 0.25H · HD 0.65H · 열 간격 0.2H · 영문 각 행 0.28H · 행간 0.09H',
	},
	horizontalB: {
		label: '가로형B',
		orientation: 'horizontal' as const,
		gap: 0.2,
		columnGap: 0,
		koSingleCap: undefined,
		hdCap: 0.4,
		enCap: 0.17,
		/** [역산: 0.4(하단 2행 묶음 라벨) − 0.17 − 0.17] + [실측 5.40pt = 0.0600H] */
		enRow2Gap: 0.06,
		area: 0.9,
		source: 'B.2 p30 · 심볼 간격 0.2H · 글자영역 0.9H · HD 0.4H · 영문 각 행 0.17H · 행간 0.06H',
	},
	vertical: {
		label: '세로형',
		orientation: 'vertical' as const,
		gap: 0.2,
		columnGap: 0,
		koSingleCap: undefined,
		hdCap: 0.3,
		enCap: 0.125,
		/** [역산: 0.3(2·3행 묶음 라벨) − 0.125 − 0.125] + [실측 5.50pt = 0.0500H] */
		enRow2Gap: 0.05,
		area: 0.7,
		source: 'B.2 p32 · 심볼 간격 0.2H · 로고타입영역 0.7H · HD 0.3H · 영문 각 행 0.125H · 행간 0.05H',
	},
} as const

export type FormKey = keyof typeof FORMS
export const FORM_KEYS = ['horizontalA', 'horizontalB', 'vertical'] as const

/** 영문 1행 회사의 조판 근거. 화면에 노출해 스펙 판정이 아니라는 것을 드러낸다. */
const ONE_LINE_EN_NOTE =
	'영문이 한 줄인 회사라 국문과 같은 구조로 조판했다(회사명 높이 = HD 높이). 정본에 1행 영문 예시가 없어 영역 검산이 닫히는 것만이 근거다.'

/** `HD` 다음 행들 사이의 기본 간격(H 배수). 세 꼴 모두 0.1H로 실측된다. */
const HD_ROW_GAP = 0.1

/**
 * 계열사명 행들. 영문이 두 줄이면 두 번째 행에 꼴별 행간이 붙는다.
 *
 * 🔑 **영문이 한 줄인 회사(`HD Hydrogen`)는 국문과 같은 구조로 조판한다**(사용자 지정 2026-08-14) —
 * 회사명 행이 영문 2행용 작은 높이(0.28/0.17/0.125H)가 아니라 **`HD`와 같은 높이**를 받는다.
 * 정본에 1행 영문 예시가 없어 스펙으로는 판정할 수 없는데, 이 해석을 택하면 **세 꼴의 영역 검산이
 * 전부 닫힌다**(가로형A 0.65 · 가로형B 0.4+0.1+0.4=0.9 · 세로형 0.3+0.1+0.3=0.7). 2행용 높이로 두면
 * 어느 꼴도 닫히지 않는다 — 그 정합성이 이 해석의 유일한 근거다.
 */
function nameRows(sub: Subsidiary, lang: 'ko' | 'en', form: (typeof FORMS)[FormKey]): Row[] {
	if (lang === 'ko' || sub.en.length === 1) {
		const text = lang === 'ko' ? sub.ko : caps(sub.en[0])
		return [{ text, cap: form.hdCap, role: 'name' }]
	}
	return sub.en.map((text, i) => ({
		text: caps(text),
		cap: form.enCap,
		role: 'name' as const,
		...(i === 1 ? { gapBefore: form.enRow2Gap } : {}),
	}))
}

/** 자회사 CI — 꼴 3종 × 국문·영문. */
function subsidiaryLockups(sub: Subsidiary): Lockup[] {
	return FORM_KEYS.flatMap((formKey) => {
		const form = FORMS[formKey]
		return (['ko', 'en'] as const).map((lang) => {
			const names = nameRows(sub, lang, form)
			// 🔴 가로형A 국문만 `HD` + 회사명이 한 행으로 붙는다. 나머지는 `HD`가 자기 행/열을 갖는다.
			const singleRow = lang === 'ko' && form.koSingleCap !== undefined
			const columns: Column[] = singleRow
				? [{ rows: [{ text: `HD${sub.ko}`, cap: form.koSingleCap, role: 'name' }] }]
				: formKey === 'horizontalA'
					? [
							{ rows: [{ text: 'HD', cap: form.hdCap, role: 'hd' }] },
							{ gapBefore: form.columnGap, rows: names },
						]
					: [{ rows: [{ text: 'HD', cap: form.hdCap, role: 'hd' }, ...withHdGap(names)] }]

			return {
				key: `sub-${lang}-${formKey}`,
				label: `자회사 ${lang === 'ko' ? '국문' : '영문'} ${form.label}`,
				tier: 'subsidiary' as const,
				form: formKey,
				language: lang,
				orientation: form.orientation,
				gap: form.gap,
				rowGap: HD_ROW_GAP,
				columns,
				...(singleRow ? {} : { area: form.area }),
				source: form.source,
				...(lang === 'en' && sub.en.length === 1 ? { note: ONE_LINE_EN_NOTE } : {}),
			}
		})
	})
}

/** 첫 계열사명 행에 `HD`와의 간격을 붙인다(이미 gapBefore가 있으면 그것을 지킨다). */
function withHdGap(rows: Row[]): Row[] {
	return rows.map((row, i) => (i === 0 ? { ...row, gapBefore: HD_ROW_GAP } : row))
}

/**
 * 해외지사 CI — 🔴 **영문 전용이다.** B.3 도판 9개(p35·37·39 + 색변형 p36·38·40)가 전부 영문이고
 * 국문 해외지사 락업은 존재하지 않는다. 예전 구현이 만들던 국문 3종은 도판에 없는 것이었다.
 *
 * 지부명이 붙는 축이 꼴마다 다르다:
 * - **가로형A**: 오른쪽에 새 열. 그 앞에 0.04H 폭 세로 구분바가 0.2H 간격 양쪽으로 끼인다.
 * - **가로형B**: 아래에 0.12H 행. 🔴 로고타입 영역 0.9H는 **자라지 않는다** — 앞 3행이 그대로
 *   0.9H를 채우고 지역명이 그 밖에 매달려 총 높이가 1.12H가 된다(총합 라벨은 없다).
 * - **세로형**: 아래에 0.1H 행. 영역이 0.7H → **0.9H로 자란다**(늘어난 0.2H = 간격 0.1H + 행 0.1H).
 */
function overseasLockups(sub: Subsidiary, branch: OverseasBranch): Lockup[] {
	const label = branchLabel(branch)

	return FORM_KEYS.map((formKey) => {
		const form = FORMS[formKey]
		const names = nameRows(sub, 'en', form)
		const base = {
			key: `ovs-${formKey}`,
			label: `해외지사 영문 ${form.label}`,
			tier: 'overseas' as const,
			form: formKey,
			language: 'en' as const,
			orientation: form.orientation,
			gap: form.gap,
			rowGap: HD_ROW_GAP,
			source: form.source,
		}

		if (formKey === 'horizontalA') {
			// 지역명만이면 2행 그리드의 아래 행에 붙는다(실측 확정, 라벨 없음).
			const branchRows: Row[] = branch.business
				? [
						{ text: caps(branch.region), cap: form.enCap, role: 'branch' },
						{
							text: caps(branch.business),
							cap: form.enCap,
							role: 'branch',
							gapBefore: form.enRow2Gap,
						},
					]
				: [{ text: caps(branch.region), cap: form.enCap, role: 'branch' as const }]
			return {
				...base,
				columns: [
					{ rows: [{ text: 'HD', cap: form.hdCap, role: 'hd' }] },
					{ gapBefore: form.columnGap, rows: names },
					{ gapBefore: form.columnGap, bar: BAR_WIDTH, rows: [] },
					{
						gapBefore: form.columnGap,
						rows: branchRows,
						...(branch.business ? {} : { align: 'bottom' as const }),
					},
				],
				area: form.area,
				source: `${form.source} / B.3 p35 · 구분바 폭 ${BAR_WIDTH}H · 열 간격 0.2H`,
				note: `구분바 폭은 라벨 ${BAR_WIDTH}H와 실측 0.0344H가 14% 어긋난다. 지역명 1개일 때 아래 행 하단정렬도 라벨 없이 실측으로 정한 것이다.`,
			}
		}

		const branchCap = formKey === 'horizontalB' ? 0.12 : 0.1
		return {
			...base,
			columns: [
				{
					rows: [
						{ text: 'HD', cap: form.hdCap, role: 'hd' },
						...withHdGap(names),
						{ text: label, cap: branchCap, role: 'branch', gapBefore: HD_ROW_GAP },
					],
				},
			],
			// 🔴 가로형B의 0.9H는 총합이 아니라 앞 3행(= 자회사 블록)이다. 총합 라벨이 없어
			//    area를 비우고 부분 검산만 남기고, **심볼은 그 블록에 정렬한다**(2×2 그리드).
			...(formKey === 'horizontalB'
				? {
						baseRows: 1 + sub.en.length,
						...(sub.en.length === 2
							? { partialArea: { rows: 3, value: form.area } }
							: {}),
					}
				: { area: 0.9 }),
			source: `${form.source} / B.3 ${formKey === 'horizontalB' ? 'p37 · 지역명 0.12H · 심볼은 앞 3행에 정렬' : 'p39 · 지역명 0.1H · 영역 0.7H→0.9H'}`,
			...(formKey === 'horizontalB'
				? {
						note: `심볼 간격은 라벨 0.25H를 실측 0.2H가 뒤집은 값이다. 총 높이 1.12H에는 라벨이 없다.${
							sub.en.length === 1 ? ` ${ONE_LINE_EN_NOTE}` : ''
						}`,
					}
				: {
						note: '지역명 앞 간격 0.1H는 라벨이 없고 실측(13.98pt)과 계열 정합성만 근거다.',
					}),
		}
	})
}

/** 🔴 p35 라벨은 0.04H인데 실측은 0.0344H다(14% 차). 라벨을 정본으로 두고 차이를 note에 남긴다. */
const BAR_WIDTH = 0.04

/**
 * 판 높이(H 배수). 🔴 **고정이다** — 선택에 따라 판이 커졌다 작아지면 위젯 전체가 위아래로 튀어
 * 락업이 아니라 화면이 움직이는 것처럼 보인다. 판은 그대로 두고 안의 락업만 변해야 한다.
 *
 * 가장 높은 경우는 **해외지사 세로형 + 클리어스페이스** = 2.1H + 2×0.4H = **2.9H**다
 * (락업 2.1H = 심볼 1 + 간격 0.2 + 영역 0.9). 그 위로 여유를 둔 값이고, 스펙 값이 바뀌어
 * 3.2H를 넘으면 `rules.test.ts`가 떨어진다.
 * 🔴 클리어스페이스를 끈 상태에서도 이 높이를 유지한다 — 켜고 끌 때 판이 변하면 안 되므로.
 */
export const STAGE_HEIGHT = 3.2

/**
 * 락업이 세로로 차지하는 높이(H 배수). 판 높이 가드가 이것을 쓴다.
 * 🔴 가로형B 해외지사는 심볼이 **앞 몇 행에만** 정렬돼서(2×2 그리드) 심볼이 위로 삐져나온다 —
 *    그 삐져나온 만큼도 높이에 든다.
 */
export function lockupHeight(lockup: Lockup, clearSpace = 0) {
	const columns = lockup.columns.filter((c) => c.bar === undefined)
	const stack = Math.max(...columns.map((c) => columnArea(lockup, c)))
	const margin = 2 * clearSpace
	if (lockup.orientation === 'vertical') return 1 + lockup.gap + stack + margin
	if (lockup.baseRows === undefined) return Math.max(1, stack) + margin
	// 심볼은 앞 baseRows 블록에 중앙정렬된다 — 블록보다 크면 위아래로 삐져나온다.
	const overhang = (1 - partialColumnArea(lockup, lockup.columns[0], lockup.baseRows)) / 2
	return Math.max(stack + Math.max(0, overhang), 1) + Math.max(0, overhang) + margin
}

/** 열 하나의 높이(H 배수). 행 cap 합 + 행 사이 간격 합. */
export function columnArea(lockup: Lockup, column: Column) {
	return column.rows.reduce(
		(sum, row, i) => sum + row.cap + (i === 0 ? 0 : (row.gapBefore ?? lockup.rowGap)),
		0,
	)
}

/** 앞 `count`개 행까지의 높이 — 라벨이 부분 블록을 가리킬 때의 검산용. */
export function partialColumnArea(lockup: Lockup, column: Column, count: number) {
	return columnArea(lockup, { ...column, rows: column.rows.slice(0, count) })
}

/** 위젯이 고르는 상태. 단계를 내려도 상위 입력은 보관한다(컨트롤이 그것을 소유한다). */
export type LockupState = { tier: Tier; subsidiary: Subsidiary; branch: OverseasBranch }

/**
 * 단계 + 선택으로 락업을 파생한다. 🔑 열거를 지운 자리다 — 미리 정한 13개를 나열하는 대신
 * 단계가 꼴 세트를 고르고 선택이 글자를 채운다.
 */
export function deriveLockups({ tier, subsidiary, branch }: LockupState): Lockup[] {
	if (tier === 'ci') return ciLockups()
	return tier === 'subsidiary'
		? subsidiaryLockups(subsidiary)
		: overseasLockups(subsidiary, branch)
}

/**
 * 단계마다 고를 수 있는 꼴·언어. 🔴 계층이 가진 세트가 다르다 — 본사는 꼴이 가로·세로 둘이고
 * 언어가 셋(국문·영문·HD)이지만, 자회사·해외지사는 꼴이 셋이고 해외지사는 **영문뿐**이다(B.3 도판).
 * 그래서 컨트롤의 선택지를 여기서 내려 준다 — 화면이 없는 조합을 고를 수 없게 한다.
 */
export function lockupOptions(tier: Tier): {
	forms: { key: string; label: string }[]
	languages: { key: Language; label: string }[]
} {
	if (tier === 'ci') {
		return {
			forms: [
				{ key: 'horizontal', label: '가로형' },
				{ key: 'vertical', label: '세로형' },
			],
			// 🔑 본사 워드마크는 **HD가 base고 거기에 글자가 더해진다** — `ciLockups()`의 실제
			//    텍스트가 그렇다: hd=`HD` · ko=`HD현대` · en=`HD HYUNDAI`. 그래서 `국문/영문/HD`가
			//    아니라 base와 덧붙임으로 적는다. 🔴 영문은 `Hyundai`가 아니라 대문자 `HYUNDAI`다.
			//    🔴 이 프레이밍은 본사에서만 성립한다 — 자회사·해외지사의 ko/en은 계열사 이름이다.
			languages: [
				{ key: 'hd', label: 'HD' },
				{ key: 'ko', label: '+현대' },
				{ key: 'en', label: '+HYUNDAI' },
			],
		}
	}
	const forms = FORM_KEYS.map((k) => ({ key: k as string, label: FORMS[k].label }))
	return tier === 'overseas'
		? { forms, languages: [{ key: 'en', label: '영문' }] }
		: {
				forms,
				languages: [
					{ key: 'ko', label: '국문' },
					{ key: 'en', label: '영문' },
				],
			}
}

/**
 * 계층은 **고르는 축이 아니라 파생값이다.** 「본사」는 항목이 아니라 *아무것도 켜지 않은 상태*다.
 *
 * 🔴 해외지사는 자회사명 **위에** 지부명이 붙는 형태라(`overseasLockups`가 둘을 다 쓴다) 자회사를
 *    끄면 성립하지 않는다. 그래서 지사 켜짐은 자회사 켜짐에 종속된다 — 켜짐 자체는 보관하고
 *    효력만 끊으므로, 자회사를 다시 켜면 지사까지 그대로 돌아온다.
 */
export function tierFor(subsidiaryOn: boolean, branchOn: boolean): Tier {
	if (!subsidiaryOn) return 'ci'
	return branchOn ? 'overseas' : 'subsidiary'
}

export const TIER_LABEL: Record<Tier, string> = {
	ci: 'CI (본사)',
	subsidiary: '자회사 CI',
	overseas: '해외지사 CI',
}

/** 클리어스페이스·최소 크기 — 락업 조립과 별개의 규정이라 여기 값만 둔다. */
/**
 * 클리어스페이스 표시 축. `off`는 안 그리고, `normal`·`exception`이 규정 두 값이다.
 * 🔴 `exception`은 「공간 제약이 있을 때」만 허용되는 값이다 — 더 좁게 쓸 수 있다는 뜻이 아니다.
 */
export const CLEAR_SPACE_MODES = ['off', 'normal', 'exception'] as const
export type ClearSpaceMode = (typeof CLEAR_SPACE_MODES)[number]

export const CLEAR_SPACE_MODE_LABEL: Record<ClearSpaceMode, string> = {
	off: '없음',
	normal: '기본',
	exception: '예외',
}

/**
 * 여백 비율(H 배수). 🔴 **기준은 로고 바운딩박스 사방 균일**이다 — 심볼이나 워드마크 개별이 아니다.
 * 정본 6개 파일(`scripts/assets/ci/*-clearSpace.svg`)을 벡터로 실측해 확인했다: 안쪽 구멍이
 * 로고 bbox와 정확히 일치하고, 가로형은 사방 0.4999H·세로형은 0.4000H다(상단만 0.4953H로
 * 0.5% 작은데 그건 아트워크 드로잉 오차다).
 * 🔑 우리는 잉크로 트림해 두었으므로 조립된 락업의 박스가 곧 로고 bbox다 — `padding`이면 성립한다.
 */
export function clearSpaceFor(orientation: Orientation, mode: ClearSpaceMode) {
	return mode === 'off' ? 0 : CLEAR_SPACE[orientation][mode]
}

export const CLEAR_SPACE: Record<Orientation, { normal: number; exception: number }> = {
	horizontal: { normal: 0.5, exception: 0.25 },
	vertical: { normal: 0.4, exception: 0.2 },
}
export const MIN_SIZE = { digitalPx: 16, printMm: 4 } as const

/**
 * 심볼 **형상**. 🔑 파일이 아니라 규칙이다 — 심볼은 정삼각 격자 위의 삼각형 3개이고, 정점 9개가
 * 전부 격자 정수점에 놓인다(실측 확인 2026-08-18):
 *
 *     u = √3/6 ≈ 0.2887   v = 1/2      (H = 1로 정규화. 폭 3u = √3/2 = 0.866)
 *     밝은초록 (0,0) (2u,0) (3u,v)  ·  중간초록 (0,0) (3u,v) (2u,2v)  ·  어두운초록 (u,v) (0,2v) (2u,2v)
 *
 * 🔴 이미지가 아니라 좌표로 두는 이유: 브랜드 에셋이 정한 것은 **형상**이고 `.svg`는 그 한 가지
 *    직렬화다. 좌표로 두면 두 표현 사이를 보간할 수 있고, 우리 코드가 형상을 측정·검산할 수 있다.
 *    `rules.test.ts`가 정본 SVG 두 개를 파싱해 아래 값과 대조하므로 사본이 조용히 어긋나지 않는다.
 *
 * `joined`는 기본형(조각이 맞닿음), `separated`는 단색형(이음선이 0.0282H 벌어짐)이다.
 * 🔑 두 상태의 **정점 개수와 순서가 같아서** 선형 보간만으로 형태가 연속적으로 변한다 —
 *    path mapper도 배리어블 폰트도 필요 없다.
 * 🔴 밝은초록 조각은 축을 움직여도 **형태가 변하지 않는다**(정본이 그렇다).
 */
/* ── 치수 도판 ────────────────────────────────────────────────────────────
 * 🔑 도판을 꼴마다 손으로 적지 않는다 — `Lockup`에서 **파생**한다. 그래서 본사·자회사·해외지사 ×
 *    국문·영문 × 꼴 3종이 데이터 추가 없이 전부 도판을 갖는다.
 * 🔑 모든 정체 id는 **역할 기반**이다(`role`). 위치는 꼴마다 바뀌지만 역할은 안 바뀌므로,
 *    꼴을 갈면 도판의 주석 요소가 새로 생기지 않고 이동한다(사용자 요구 2026-08-18).
 * 🔴 정본 도판과 의도적으로 다른 점: 「영역 게이지」(0.65H·0.9H)를 **항상 왼쪽 depth 1**에 둔다.
 *    정본은 가로형B에서만 오른쪽에 두는데, 꼴을 바꿀 때 게이지가 좌↔우로 날아가는 궤적이
 *    생겨 이동 전환이 오히려 읽히지 않는다. 편차를 감수하고 자리를 고정했다.
 * 🔴 클리어스페이스(여백)는 이 스펙에 넣지 않는다 — 간격과 아예 다른 규정이고 범위 밖이다.
 */

export type DiagramTrackKind = 'sym' | 'gap' | 'bar' | 'el' | 'pad'

export type DiagramTrack = {
	/**
	 * 트랙의 정체. 🔴 **축을 담지 않는다** — 같은 글자가 꼴에 따라 열에도 행에도 놓이므로,
	 * id에 축을 박으면(`col:hd` / `row:hd:0`) 같은 것이 두 정체가 되어 도판이 이동하지 못하고
	 * 한쪽이 사라지며 다른 쪽이 나타난다(실측으로 잡은 결함).
	 */
	id?: string
	kind: DiagramTrackKind
	/** H 배수. 없으면 `max-content`(글자 폭을 폰트에 맡긴다). */
	v?: number
	/** 라벨에 적을 값. 트랙 크기가 규정값과 다를 때만 쓴다(매달린 간격). */
	labelValue?: number
}

/** 도판이 그리는 글자 하나. 어느 열·행 트랙에 앉는지를 **트랙 id로** 가리킨다. */
export type DiagramGlyph = {
	id: string
	text: string
	cap: number
	role: RowRole
	/** 앉을 열 트랙 id. */
	col: string
	/** 앉을 행 트랙 id. 없으면 영역 전체에 걸쳐 중앙에 놓인다(가로형A의 HD). */
	row?: string
}

export type DiagramSpan = {
	id: string
	side: 'left' | 'right'
	/** 0이 락업에 가장 가까운 게이지 열. */
	depth: number
	/** 시작·끝 트랙 id. `env`는 봉투(심볼 위·아래). */
	from: string
	to: string
	label: string
}

export type DiagramSpec = {
	cols: DiagramTrack[]
	rows: DiagramTrack[]
	glyphs: DiagramGlyph[]
	/** 영역(로고타입 높이) 행 트랙 인덱스 범위. 그 뒤 트랙은 매달린 것이다. */
	areaRows: readonly [number, number]
	/** 봉투(실선) 행 트랙 인덱스 범위 — **심볼의 위·아래**다. */
	envRows: readonly [number, number]
	spans: DiagramSpan[]
	/** 라벨을 하단으로 내릴 트랙 id(트랙이 좁아 위에 안 들어간다). */
	labelBelow: string[]
	gaugeLeft: number
	gaugeRight: number
	/** 글자가 기본으로 앉는 열 트랙 id. */
	textCol: string
}

/** 라벨을 위에 못 넣는 트랙 폭(H 배수). 정본에서 그렇게 된 것은 구분바 0.04H뿐이다. */
const LABEL_BELOW_UNDER = 0.1

/**
 * 🔴 게이지 열 수는 **상수**다. 꼴에 따라 늘렸다 줄이면 도판 폭이 변한다.
 * 좌: 0=H · 1=영역과 세로형 심볼 간격(세로로 겹치지 않아 한 열을 나눠 쓴다). 우: 0=묶음 · 1=행별.
 */
const GAUGE_LEFT = 2
const GAUGE_RIGHT = 2

/**
 * 🔑 간격은 **뒤에 오는 것으로만** 이름 짓는다. 쌍으로 이름 지으면(`gap:bar-branch`) 사이에 무엇이
 *    끼는 꼴에서 이름이 바뀌어 같은 간격이 다른 정체가 된다 — 구분바가 정확히 그 경우다.
 *
 * 🔴 **축을 이름에 넣는다**(`gapX`/`gapY`). 글자와 달리 간격은 **방향이 곧 성격**이라, 맥락이 같아도
 *    수평 간격과 수직 간격은 시각적으로 다른 것이다(사용자 지정 2026-08-19: 「요소의 방향이 다르다면
 *    그 둘은 각기 다른 요소로 존재해야 함」). 한 정체로 묶으면 꼴 전환에서 그 요소가 축을 가로질러
 *    날아가 정신없어진다.
 */
const gapId = (axis: 'X' | 'Y', after: RowRole | 'bar', index: number) =>
	after === 'bar' ? `gap${axis}:bar` : `gap${axis}:${after}:${index}`

const hLabel = (v: number) => `${Number(v.toFixed(4))}H`

/**
 * 락업 하나의 치수 도판 스펙. 순수 함수 — 브라우저가 필요 없어 테스트로 검산된다.
 */
export function diagramSpec(lockup: Lockup): DiagramSpec {
	/* 행을 정의하는 열 = 행이 가장 많은 열. 가로형A는 계열사명 열, 나머지는 유일한 열이다. */
	const textColumn = lockup.columns.reduce(
		(best, column) => (column.rows.length > best.rows.length ? column : best),
		lockup.columns[0],
	)
	const textCol = 'col:text'

	/** 역할 안 서수를 **열·행을 가로질러 한 카운터로** 센다(읽는 순서 = 열 순서). */
	const seen: Partial<Record<RowRole, number>> = {}
	const nextId = (role: RowRole) => {
		const index = (seen[role] ?? -1) + 1
		seen[role] = index
		return `el:${role}:${index}`
	}

	const glyphs: DiagramGlyph[] = []

	/* ── 행 트랙: 행 정의 열의 행과 행간 ── */
	const rows: DiagramTrack[] = []
	const textRowIds: string[] = []
	textColumn.rows.forEach((row, i) => {
		if (i > 0) {
			const v = row.gapBefore ?? lockup.rowGap
			/* 간격의 서수 = 그 간격이 여는 글자의 서수(뒤 이웃 규칙). */
			const ordinal = (seen[row.role] ?? -1) + 1
			if (v > 0) rows.push({ id: gapId('Y', row.role, ordinal), kind: 'gap', v })
		}
		const id = nextId(row.role)
		textRowIds.push(id)
		rows.push({ id, kind: 'el', v: row.cap })
		glyphs.push({ id, text: row.text, cap: row.cap, role: row.role, col: textCol, row: id })
	})

	/* 🔴 `baseRows`가 있으면 그 개수까지만 봉투 안이고 나머지는 매달린 것이다(해외지사 가로형B). */
	const areaRowCount = lockup.baseRows ?? textColumn.rows.length
	const lastAreaIndex = rows.indexOf(rows.filter((t) => t.kind === 'el')[areaRowCount - 1])
	const areaH = rows.slice(0, lastAreaIndex + 1).reduce((sum, t) => sum + (t.v ?? 0), 0)

	const horizontal = lockup.orientation === 'horizontal'
	/* 가로형은 영역이 심볼 높이(1H) 안에 중앙으로 놓인다. 세로형은 심볼이 위에 따로 선다. */
	const pad = horizontal ? Math.max(0, (1 - areaH) / 2) : 0

	const finalRows: DiagramTrack[] = []
	let envStart = 0
	let envEnd = 0
	if (!horizontal) {
		/* 🔴 세로형 봉투는 **심볼 행**이다 — 텍스트 블록을 감싸면 `span:H`가 H라고 적힌 채 0.9H를 잰다. */
		envStart = finalRows.length
		finalRows.push({ id: 'sym', kind: 'sym', v: 1 })
		envEnd = finalRows.length - 1
		finalRows.push({ id: gapId('Y', textColumn.rows[0].role, 0), kind: 'gap', v: lockup.gap })
	}
	if (pad > 0) {
		envStart = finalRows.length
		finalRows.push({ kind: 'pad', v: pad })
	}
	const areaStart = finalRows.length
	finalRows.push(...rows.slice(0, lastAreaIndex + 1))
	const areaEnd = finalRows.length - 1
	if (pad > 0) {
		finalRows.push({ kind: 'pad', v: pad })
		envEnd = finalRows.length - 1
	} else if (horizontal) {
		envStart = areaStart
		envEnd = areaEnd
	}
	/* 🔴 매달린 행의 간격은 **영역 하단** 기준이다 — 봉투 패딩이 이미 내려와 있으니 그만큼 뺀다.
	   안 빼면 해외지사 가로형B 총높이가 1.12H가 아니라 1.17H가 된다. */
	let firstHanging = true
	for (const track of rows.slice(lastAreaIndex + 1)) {
		if (track.kind === 'gap' && firstHanging) {
			firstHanging = false
			/* 부동소수점 찌꺼기를 남기지 않는다(0.1 - 0.05 = 0.05000000000000002). */
			const remaining = Number(Math.max(0, (track.v ?? 0) - pad).toFixed(6))
			finalRows.push({ ...track, v: remaining, labelValue: track.v })
		} else finalRows.push(track)
	}

	/* ── 열 트랙 ── */
	const cols: DiagramTrack[] = []
	if (horizontal) {
		cols.push({ id: 'sym', kind: 'sym', v: SYMBOL_ASPECT })
		cols.push({
			id: gapId('X', lockup.columns[0]?.rows[0]?.role ?? 'name', 0),
			kind: 'gap',
			v: lockup.gap,
		})
	}
	lockup.columns.forEach((column, i) => {
		const isText = column === textColumn
		const role = column.bar !== undefined ? 'bar' : (column.rows[0]?.role ?? 'name')
		const id = column.bar !== undefined ? 'bar' : isText ? textCol : `col:${role}`
		if (i > 0 && (column.gapBefore ?? 0) > 0) {
			cols.push({ id: gapId('X', role, 0), kind: 'gap', v: column.gapBefore })
		}
		cols.push({ id, kind: column.bar !== undefined ? 'bar' : 'el', v: column.bar })
		if (isText || column.bar !== undefined) return
		/* 🔑 행을 갖지 않는 열의 글자. 행이 하나면 영역 전체에 걸쳐 중앙에 놓이고(가로형A의 HD),
		      여럿이면 **글자 열의 행 리듬에 k→k로 앉는다**(가로형A의 지역명 2행). 아래에서 붙인다.
		   🔴 여기서 `rows[0]`만 읽으면 둘째 줄이 통째로 사라진다 — 실제로 그랬다(`R&D CENTER`). */
		const bottomAligned = column.align === 'bottom'
		column.rows.forEach((row, k) => {
			const target =
				column.rows.length === 1 && !bottomAligned
					? undefined
					: bottomAligned
						? textRowIds[textRowIds.length - column.rows.length + k]
						: textRowIds[k]
			glyphs.push({
				id: nextId(row.role),
				text: row.text,
				cap: row.cap,
				role: row.role,
				col: id,
				row: target,
			})
		})
	})

	/* 🔴 **열** 간격만 대상이다 — 행 축 간격의 라벨은 좌측 게이지 열에 앉으므로 위/아래가 없다. */
	const labelBelow = cols
		.filter((t) => (t.kind === 'gap' || t.kind === 'bar') && (t.v ?? 1) < LABEL_BELOW_UNDER)
		.map((t) => t.id as string)

	/* ── 게이지(Span) ── */
	const spans: DiagramSpan[] = []
	spans.push({ id: 'span:H', side: 'left', depth: 0, from: 'env', to: 'env', label: 'H' })
	spans.push({
		id: 'span:area',
		side: 'left',
		depth: 1,
		from: finalRows[areaStart]?.id ?? 'env',
		to: finalRows[areaEnd]?.id ?? 'env',
		label: hLabel(areaH),
	})

	/* 🔑 **행 간격에는 치수를 적지 않는다** — 정본 도판이 그렇다. 딱 하나 예외가 세로형의
	      심볼↔워드마크 간격이고, 그것은 좌측 게이지에 Span으로 온다(도판 실측).
	   🔴 그래서 이 스펙이 내는 치수는 **정본 도판에 적힌 것과 개수까지 같다**. 파생이 낼 수 있는
	      모든 수치를 적으면 도판이 아니라 계측기가 된다(사용자 지정 2026-08-19). */
	if (!horizontal) {
		const symbolGap = finalRows.find((t) => t.kind === 'gap')
		if (symbolGap?.id) {
			spans.push({
				id: `span:${symbolGap.id}`,
				side: 'left',
				depth: 1,
				from: symbolGap.id,
				to: symbolGap.id,
				label: hLabel(symbolGap.v ?? 0),
			})
		}
	}

	/* 🔑 `hd` 행이 있는 꼴에서는 「HD」와 「계열사명 묶음」이 각각 게이지를 갖는다(정본 도판).
	      가로형A는 HD가 행이 아니라 열이므로 이 게이지가 없다 — 파생이 그것을 알아서 맞춘다. */
	const hdRow = finalRows.find((t) => t.kind === 'el' && t.id?.startsWith('el:hd:'))
	const nameRows = finalRows.filter((t) => t.kind === 'el' && t.id?.startsWith('el:name:'))
	const hasGroups = Boolean(hdRow) && nameRows.length > 0
	if (hasGroups && hdRow) {
		spans.push({
			id: 'span:group:hd',
			side: 'right',
			depth: 0,
			from: hdRow.id ?? '',
			to: hdRow.id ?? '',
			label: hLabel(hdRow.v ?? 0),
		})
		const first = nameRows[0]
		const last = nameRows[nameRows.length - 1]
		const groupH = finalRows
			.slice(finalRows.indexOf(first), finalRows.indexOf(last) + 1)
			.reduce((sum, t) => sum + (t.v ?? 0), 0)
		spans.push({
			id: 'span:group:name',
			side: 'right',
			depth: 0,
			from: first.id ?? '',
			to: last.id ?? '',
			label: hLabel(groupH),
		})
	}

	/* 🔴 영역이 이 행 하나뿐이면 좌측 `span:area`가 **같은 수치**를 이미 적었다. 두 번 적으면 같은
	      값의 라벨이 좌·우에 하나씩 생겨, 꼴·언어를 바꿀 때 어느 쪽을 보고 있었는지 눈이 잃는다
	      (사용자 지적 2026-08-19: 같은 라벨이 「3번씩이나 이동」한다). 정본 도판도 한 번만 적는다. */
	const areaIsSingleRow = areaStart === areaEnd
	for (const [index, track] of finalRows.entries()) {
		if (track.kind !== 'el' || !track.id) continue
		if (hasGroups && track.id.startsWith('el:hd:')) continue
		if (areaIsSingleRow && index === areaStart) continue
		spans.push({
			id: `span:${track.id}`,
			side: 'right',
			depth: hasGroups ? 1 : 0,
			from: track.id,
			to: track.id,
			label: hLabel(track.v ?? 0),
		})
	}

	return {
		cols,
		rows: finalRows,
		glyphs,
		areaRows: [areaStart, areaEnd] as const,
		envRows: [envStart, envEnd] as const,
		spans,
		labelBelow,
		gaugeLeft: GAUGE_LEFT,
		gaugeRight: GAUGE_RIGHT,
		textCol,
	}
}

export const SYMBOL_CONTOURS = [
	{
		/** 밝은초록 — 위쪽 조각. 두 표현에서 형태 동일. */
		colorName: 'HD ECO GREEN',
		joined: [
			[0, 0],
			[0.5773333, 0],
			[0.866, 0.5],
		],
		separated: [
			[0, 0],
			[0.5773333, 0],
			[0.866, 0.5],
		],
	},
	{
		/** 중간초록 — 큰 삼각형. 밝은초록과의 이음선이 열린다. */
		colorName: 'HD HERITAGE GREEN',
		joined: [
			[0, 0],
			[0.866, 0.5],
			[0.5773333, 1],
		],
		separated: [
			[0.0281667, 0.0488333],
			[0.8518333, 0.5245],
			[0.5773333, 1],
		],
	},
	{
		/** 어두운초록 — 아래쪽 조각. 중간초록과의 이음선이 열린다. */
		colorName: 'HD PROSPERITY GREEN',
		joined: [
			[0.2886667, 0.5],
			[0, 1],
			[0.5773333, 1],
		],
		separated: [
			[0.2723333, 0.5281667],
			[0, 1],
			[0.5446667, 1],
		],
	},
] as const

/** 심볼 종횡비(폭÷높이) = √3/2. 위 격자에서 나온 값이고 정본 viewBox 51.96×60과 같다. */
export const SYMBOL_ASPECT = 0.866

/**
 * 심볼 표현. `fullColor`는 3색 기본형, `mono`는 단색형이다.
 * 🔴 이산이 아니다 — 형태(이음선)와 색이 **같은 파라미터 하나**로 연속 변한다.
 */
export type SymbolType = 'fullColor' | 'mono'

/**
 * 단색형의 색. 🔴 정본 단색 락업 파일에는 fill 선언이 아예 없어서(검정 폴백) 파일에서 읽을 수 없다.
 * 단색형은 심볼과 워드마크가 **한 색**이라는 규정이므로 워드마크 색을 그대로 쓴다 — 발명이 아니라
 * 규정에서 나온 값이지만, 배경마다 어느 색을 쓰는지는 B.5 색상 규정이 확정돼야 한다.
 */
export const SYMBOL_MONO_COLOR_NAME = 'HD DISCOVERY BLUE'

/** 보간된 정점. `t`=0이면 기본형 형상, 1이면 단색형 형상. 좌표는 H=1 정규화값이다. */
export function symbolPoints(t: number) {
	return SYMBOL_CONTOURS.map((c) =>
		c.joined.map(([x, y], i) => {
			const [sx, sy] = c.separated[i]
			return [x + (sx - x) * t, y + (sy - y) * t] as const
		}),
	)
}

/**
 * 워드마크 색. 🔴 hex를 박지 않는다 — brand-colors가 소유하고 이름으로 찾는다.
 * 정본 락업 파일 사이에 `#002f87` / `#003087` 불일치가 있고, 컬렉션에 등재된 쪽이 후자다.
 */
export const WORDMARK_COLOR_NAME = 'HD DISCOVERY BLUE'

/**
 * 락업을 얹는 판 색. 🔴 취향이 아니라 규정이다 — 기본형(Full Color)은 흰색 혹은 밝은색 배경
 * 전용이고(01-specs C), 어두운 면 위에 얹으면 그 자체가 규정 위반 예시가 된다.
 * 다크 모드에서도 이 판만은 밝아야 한다.
 */
export const STAGE_COLOR_NAME = 'WHITE'

/**
 * CI 색상 표현 3종. 🔑 **구체적인 색보다 이것이 먼저다** — 표현을 고르면 심볼 색·텍스트 색·판 색이
 * 함께 정해지고, 단색형에서만 그 한 색을 고른다(사용자 결정 2026-08-18).
 *
 * - `fullColor` 기본형 — 심볼 3색 + 워드마크는 정본 색
 * - `whiteWordmark` WHITE 워드마크 — 워드마크가 흰색. 🔴 심볼이 3색을 유지하는지는 미확정(B.1 색상변형 정독 대기)
 * - `mono` 단색형 — 심볼과 워드마크가 **한 색**
 */
export const COLOR_TYPES = ['fullColor', 'whiteWordmark', 'mono'] as const
export type ColorType = (typeof COLOR_TYPES)[number]

export const COLOR_TYPE_LABEL: Record<ColorType, string> = {
	fullColor: '기본형',
	whiteWordmark: 'WHITE 워드마크',
	mono: '단색형',
}

/** 🔴 단색형에 허용된 색은 **BLACK·WHITE 둘뿐이다**(사용자 지정). 다른 색을 열지 말 것. */
export const MONO_COLORS = ['BLACK', 'WHITE'] as const
export type MonoColor = (typeof MONO_COLORS)[number]

/**
 * 텍스트(워드마크) 색 이름. 🔴 **따로 고르지 않는다 — 표현에 종속된다**(사용자 결정).
 * 단색형에서는 심볼 색을 그대로 따라간다.
 */
export function textColorName(type: ColorType, mono: MonoColor): string {
	if (type === 'fullColor') return WORDMARK_COLOR_NAME
	if (type === 'whiteWordmark') return 'WHITE'
	return mono
}

/**
 * 락업을 얹는 판의 밝고 어두움. 실제 값은 `widgets/surface.ts`가 갖는다(그 파일이 브랜드 면의
 * 유일한 예외 자리다, `docs/11` §8).
 * 🔴 판은 취향이 아니라 규정이다 — 단색형도 BLACK이면 밝은 면, WHITE면 검은 면에 얹힌다.
 *    다크 모드에서도 이 판은 테마를 따르지 않는다.
 */
export function stageTone(type: ColorType, mono: MonoColor): 'light' | 'dark' {
	if (type === 'whiteWordmark') return 'dark'
	if (type === 'mono') return mono === 'WHITE' ? 'dark' : 'light'
	return 'light'
}
/**
 * 🔴 글자꼴은 정본이 아니다 — 배치 비율만 정본이고 서체는 임시 대체다(FONT 주석).
 *
 * 정본 서체를 특정하려던 조사의 결론(2026-08-14): 정본 라틴 글자꼴은 브랜드팀이 준 로고 전용 서체
 * `HDHyundai_Logo`와 같다(`~/Downloads/브랜드 가이드/2. 서체/230317_HDHyundaiLogo_Font/`, 정점 환산
 * 대조 + 사용자 육안 겹침). 그전에 의심했던 "수작업 레터링"은 근거가 없어졌다 — 비교 대상이 **HD
 * 배포체였던 것이 문제**였다(같은 높이에서 정본보다 10% 좁고, 3종 어느 웨이트도 닿지 못한다).
 * 🔴 **그런데 그 로고 서체를 쓰지 않는다.** 한글이 없는 반쪽짜리라서, 락업 하나를 두 서체로 그리게
 *    된다 — 그것보다 한 서체로 통일하는 쪽이 낫다는 것이 사용자 결정이다.
 * 🔴 자간은 손으로 좁히지 않는다(letter-spacing: normal). 차이를 없애면 판정을 못 한다.
 */
export const FIDELITY_CAVEAT =
	'글자꼴은 정본 서체가 아니라 임시 대체 서체입니다. 배치 비율만 정본 규정을 따릅니다.'
