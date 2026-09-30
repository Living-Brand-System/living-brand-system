/**
 * 표본이 얹히는 판은 두 종류이고, 위젯은 **어느 쪽인지 선언한다**(`docs/11` §8).
 *
 * 🔴 위젯이 생 팔레트(`bg-white`·`bg-neutral-*`)를 직접 쓰지 않는 이유는 토큰 규칙 때문만이 아니다.
 *    어느 쪽인지 이름이 없으면 다음 사람이 그걸 토큰 위반으로 보고 시맨틱 토큰으로 "고친다" — 그러면
 *    다크 모드에서 표본이 거짓이 된다(어두운 판 위의 WHITE 워드마크가 어두운 판을 잃는 식).
 *    그래서 `docs/09` §4가 말하는 "색을 데이터로 다루는" 예외를 이 파일 하나로 모아 둔다.
 */

/** 테마 면 — 위젯 UI의 배경·패널. 앱 테마를 따라간다. */
export const THEME_PANEL = 'bg-muted'

/**
 * 브랜드 면 — 로고·서체 표본이 얹히는 판. **테마를 따르지 않는다.**
 *
 * 밝은 판/어두운 판 자체가 규정의 일부다. 예를 들어 WHITE 워드마크는 어두운 판에서만 성립하므로,
 * 그 판이 앱 테마를 따라 밝아지면 화면은 규정이 금지하는 조합을 보여 주게 된다.
 */
export const BRAND_PANEL_LIGHT = 'bg-neutral-100'
export const BRAND_PANEL_DARK = 'bg-neutral-900'

/**
 * CI 락업 표본 판 — 표현마다 규정이 정한 면이다(사용자 지정 2026-08-18).
 * 기본형·단색형(BLACK)은 밝은 면, WHITE 워드마크·단색형(WHITE)은 검은 면에 얹는다.
 *
 * 🔴 위 `BRAND_PANEL_*`와 **값이 다르다**(#f5f5f5 · #171717). 저쪽은 서체 표본 등이 쓰는 판이고
 *    여기 두 값은 CI 규정이 정한 판이다. 같아 보여도 섞지 말 것 — 하나로 합치면 어느 쪽이 규정인지
 *    구별이 사라진다.
 * 🔴 클래스가 아니라 hex인 이유: 표현이 바뀔 때 판도 **연속으로** 물들어야 해서 inline style로
 *    transition을 걸어야 한다(클래스 전환은 이산이다).
 */
export const CI_STAGE_LIGHT = '#f2f2f2'
export const CI_STAGE_DARK = '#000000'

/**
 * 단색형 로고의 fill. 배경(`brand-background.ts`의 `monoFill`)이 정하는 규정 값이라 테마를 따르지 않는다.
 * inline style·mask에 넣는 값이므로 클래스가 아니라 hex다.
 */
export const MONO_FILL = { black: '#000000', white: '#ffffff' } as const

/**
 * 브랜드 판 **위에 얹히는 컨트롤**(CI 락업의 SVG 내보내기 버튼).
 *
 * 🔴 판이 테마를 따르지 않으므로 그 위의 컨트롤도 따르면 안 된다. `outline` 버튼의 기본값은
 *    `border-foreground`·`text-foreground`라, 다크 모드에서 **흰 판 위에 흰 아이콘**이 놓여
 *    사라진다(사용자 지적 2026-08-20). 판의 tone이 정해야 하는 값이다.
 * 🔑 판 색이 둘뿐이라(`CI_STAGE_LIGHT`·`CI_STAGE_DARK`) 짝도 둘이면 된다 — 판을 뒤집은 면에
 *    그 면의 전경을 얹는다. 알파를 조금 남기는 것은 버튼이 아트워크가 아니라 UI로 읽히게 하려는 것이고,
 *    hover에서 불투명해진다.
 */
export const CI_STAGE_CONTROL_LIGHT =
	'border-neutral-900 bg-neutral-900/85 text-neutral-50 hover:bg-neutral-900 hover:text-neutral-50'
export const CI_STAGE_CONTROL_DARK =
	'border-neutral-100 bg-neutral-100/85 text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900'

/** 디스플레이 다운로드 버튼: 테마·판 색과 무관한 고정 배경과 아이콘 색. */
export const DISPLAY_DOWNLOAD_BUTTON = 'bg-[#e0e0e0] text-black/60 hover:bg-[#e0e0e0]'

/** 가이드 문서의 앱 테마 배경과 색상 비교 셀 구분선. */
export const GUIDELINE_DOCUMENT_SURFACE = 'bg-background text-foreground'
export const LOGO_BACKGROUND_DIVIDER = 'divide-white/30'
