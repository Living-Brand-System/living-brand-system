/**
 * 강조에 쓰는 브랜드 색 이름.
 *
 * 🔑 CI 심볼의 **중간초록**이다(`ci-lockup`의 `SYMBOL_CONTOURS` 두 번째 — 큰 삼각형을 칠하는 주색).
 *    심볼은 밝은·중간·어두운 초록 3색인데, 선 하나로 쓸 것은 면적이 가장 넓은 그 색이다.
 *    「이 브랜드의 색」으로 읽히는 자리라 임의 색을 열지 않고 하나로 못 박는다.
 * 🔴 hex를 코드에 박지 않는다 — 브랜드 색이 바뀌면 컬렉션만 고치면 되게 이름으로 찾는다
 *    (`docs/09` §4의 색-데이터 예외이고, `ci-lockup` 위젯이 같은 규칙을 쓴다).
 */
const HIGHLIGHT_COLOR_NAME = 'HD HERITAGE GREEN'

/** DB에서 온 문자열이 그대로 CSS 선언에 들어가는 자리다 — hex 형태만 통과시킨다. */
function safeHex(value: unknown): string | null {
	return typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : null
}

/** 브랜드 색 목록에서 캔버스 강조색을 고른다. 못 찾거나 hex가 아니면 `null`이고 화면이 폴백한다. */
export function pickTemplateHighlightColor(
	colors: readonly { name: string; hex: string }[],
): string | null {
	return safeHex(colors.find((color) => color.name === HIGHLIGHT_COLOR_NAME)?.hex)
}
