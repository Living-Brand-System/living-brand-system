export const routes = {
	account: '/account',
	accountPassword: '/account/password',
	admin: '/admin',
	guideline: '/guideline',
	home: '/',
	login: '/login',
	studio: {
		assets: '/studio/assets',
		graph: '/studio/graph',
		graphic: '/studio/graphic',
		image: '/studio/image',
		review: '/studio/review',
		template: '/studio/template',
	},
} as const

/**
 * 세 스튜디오는 대상을 같은 모양으로 지목한다 — `/studio/<kind>/<slug>`.
 *
 * 🔴 세그먼트는 **slug만** 쓴다. DB의 숫자 id는 환경마다 달라 링크가 환경을 넘지 못하고
 * (스냅샷 규약이 관계를 사람이 읽는 키로 적는 것과 같은 이유), 분류는 세그먼트에 두지 않는다 —
 * 분류는 표현이라 바뀌는데 URL은 정체성이어야 한다. 템플릿의 카테고리를 URL에서 뺀 근거다.
 */
export function getStudioImageRoute(profileSlug: string) {
	return `${routes.studio.image}/${profileSlug}`
}

export function getStudioGraphicRoute(profileSlug: string) {
	return `${routes.studio.graphic}/${profileSlug}`
}

export function getStudioGraphRoute(profileSlug: string) {
	return `${routes.studio.graph}/${profileSlug}`
}

/**
 * Graphic·Graph는 한 Provider가 굴리므로 주소도 한 자리에서 고른다 —
 * 호출부에서 kind를 갈라 적으면 Graph 세션이 `/studio/graphic/...`으로 주소를 바꾼다.
 */
export function getCanvasStudioRoute(studio: 'graphic' | 'graph', profileSlug: string) {
	return studio === 'graph'
		? getStudioGraphRoute(profileSlug)
		: getStudioGraphicRoute(profileSlug)
}

export function getStudioTemplateRoute(templateSlug: string) {
	return `${routes.studio.template}/${templateSlug}`
}

/**
 * 로그인으로 보내는 주소. 🔴 **문자열을 호출부마다 적지 않는다** — 목적지를 옮길 때 한쪽만 고치면
 * 남은 자리가 조용히 옛 주소를 들고 있다(실제로 `/admin/login`이 세 곳에 흩어져 있었다).
 */
export function loginHref(returnTo: string) {
	return `${routes.login}?redirect=${encodeURIComponent(returnTo)}`
}

/** 어느 호스트에도 없는 기준 주소 — 상대 경로를 파싱하려고만 쓰고 밖으로 나가지 않는다. */
const INTERNAL_BASE = 'https://internal.invalid'

/**
 * `?redirect=`로 돌아갈 곳. 🔴 **주소창은 사용자가 손댈 수 있는 입력이다** — 검사 없이 쓰면
 * 로그인 링크에 외부 주소를 실어 보내는 통로(open redirect)가 된다. 내부 경로만 통과시킨다.
 *
 * 🔴 **금지 문자열을 열거하지 않는다.** 브라우저 URL 파서는 읽기 전에 ASCII 탭·개행을 통째로
 *    지우므로 `/<TAB>//evil.test`가 파서 안에서 `//evil.test`로 되살아난다 — 접두사 검사로는
 *    그 부류를 영영 못 잡는다. 같은 파서에 물어보고 **출신지가 안쪽인지**만 본다.
 */
export function safeRedirectPath(value: string | undefined, fallback: string) {
	if (value === undefined || !value.startsWith('/')) return fallback

	let parsed: URL
	try {
		parsed = new URL(value, INTERNAL_BASE)
	} catch {
		return fallback
	}
	if (parsed.origin !== INTERNAL_BASE) return fallback
	// 원본이 아니라 **파서가 정규화한 값**을 돌려준다 — 원본을 돌려주면 제어문자가 그대로 따라간다.
	return parsed.pathname + parsed.search + parsed.hash
}

export const legacyPageRedirects = [
	{
		source: '/studio',
		destination: routes.studio.assets,
		permanent: true,
	},
	{
		// 카테고리 세그먼트가 사라져 하위 경로를 옮길 수 없다 — 목록으로 보낸다.
		source: '/create',
		destination: routes.studio.template,
		permanent: true,
	},
	{
		source: '/generate',
		destination: routes.studio.image,
		permanent: true,
	},
	{
		source: '/review',
		destination: routes.studio.review,
		permanent: true,
	},
	{
		// MCP 키는 계정당 하나라 스튜디오 도구가 아니라 개인 설정이다 — 계정 화면이 갖는다.
		// 🔴 permanent가 아니다. 이 배치는 아직 바뀔 수 있는데 308은 브라우저가 오래 캐시한다.
		source: '/settings/mcp',
		destination: routes.account,
		permanent: false,
	},
	{
		source: '/studio/mcp',
		destination: routes.account,
		permanent: false,
	},
	{
		source: '/studio/usage',
		destination: routes.account,
		permanent: false,
	},
] as const
