import { describe, expect, it } from 'vitest'
import {
	getCanvasStudioRoute,
	getStudioGraphicRoute,
	getStudioImageRoute,
	getStudioTemplateRoute,
	legacyPageRedirects,
	loginHref,
	routes,
	safeRedirectPath,
} from './routes'

describe('로그인 이동', () => {
	it('로그인 문은 앱 안이다 — Payload Admin으로 보내지 않는다', () => {
		// 🔴 이 단언이 깨지면 worker가 CMS 로그인 화면을 보게 된다(docs/07 #14).
		expect(loginHref('/account')).toBe('/login?redirect=%2Faccount')
		expect(loginHref('/account')).not.toContain('/admin')
	})

	it('돌아갈 곳은 내부 경로만 통과시킨다', () => {
		expect(safeRedirectPath('/studio/image', '/account')).toBe('/studio/image')
		expect(safeRedirectPath(undefined, '/account')).toBe('/account')
		// 🔴 바깥으로 보내는 모양들 — 하나라도 통과하면 로그인 링크가 피싱 통로가 된다.
		expect(safeRedirectPath('https://evil.test', '/account')).toBe('/account')
		expect(safeRedirectPath('//evil.test', '/account')).toBe('/account')
		expect(safeRedirectPath('/\\evil.test', '/account')).toBe('/account')
		expect(safeRedirectPath('javascript:alert(1)', '/account')).toBe('/account')
	})

	it('🔴 탭·개행으로 감춘 외부 주소도 막는다', () => {
		// 브라우저 파서는 읽기 전에 이 문자들을 지운다 — `/<TAB>//evil`이 파서 안에서 `//evil`이 된다.
		// 접두사 검사만 하던 시절 이 줄들이 전부 통과했고, 검증 넷은 초록이었다.
		expect(safeRedirectPath('/\t//evil.test', '/account')).toBe('/account')
		expect(safeRedirectPath('/\n//evil.test', '/account')).toBe('/account')
		expect(safeRedirectPath('/\r//evil.test', '/account')).toBe('/account')
		expect(safeRedirectPath('/\t/evil.test', '/account')).toBe('/account')
		// 내부 경로는 쿼리까지 살아서 돌아온다 — 기간·필터를 들고 로그인해도 잃지 않는다.
		expect(safeRedirectPath('/account?days=7', '/login')).toBe('/account?days=7')
	})
})

describe('routes', () => {
	it('세 스튜디오가 /studio/<kind>/<slug> 한 모양으로 대상을 지목한다', () => {
		expect(routes.studio.assets).toBe('/studio/assets')
		expect(routes.studio.image).toBe('/studio/image')
		expect(routes.studio.graphic).toBe('/studio/graphic')
		expect(routes.studio.template).toBe('/studio/template')

		expect(getStudioImageRoute('illustration')).toBe('/studio/image/illustration')
		expect(getStudioGraphicRoute('forward-straight')).toBe('/studio/graphic/forward-straight')
		expect(getStudioTemplateRoute('summer-poster')).toBe('/studio/template/summer-poster')

		// 같은 Provider가 둘을 굴리므로 kind가 주소를 가른다.
		expect(getCanvasStudioRoute('graphic', 'forward-straight')).toBe(
			'/studio/graphic/forward-straight',
		)
		expect(getCanvasStudioRoute('graph', 'bar-race')).toBe('/studio/graph/bar-race')
	})

	it('템플릿 주소에 분류 세그먼트를 넣지 않는다 — 분류가 바뀌어도 링크가 유지된다', () => {
		// 같은 템플릿은 어느 카테고리에 있든 같은 주소다.
		expect(getStudioTemplateRoute('summer-poster')).toBe(
			getStudioTemplateRoute('summer-poster'),
		)
		expect(getStudioTemplateRoute('summer-poster').split('/')).toHaveLength(4)
	})

	it('이전 경로를 canonical 경로로 옮긴다', () => {
		expect(legacyPageRedirects).toEqual([
			{
				source: '/studio',
				destination: '/studio/assets',
				permanent: true,
			},
			{
				source: '/create',
				destination: '/studio/template',
				permanent: true,
			},
			{
				source: '/generate',
				destination: '/studio/image',
				permanent: true,
			},
			{
				source: '/review',
				destination: '/studio/review',
				permanent: true,
			},
			// MCP는 계정 화면으로 옮겼다. 🔴 permanent가 아니다 — 아직 바뀔 수 있는 배치라
			// 308로 굳히면 브라우저 캐시 때문에 되돌리기 어려워진다.
			{
				source: '/settings/mcp',
				destination: '/account',
				permanent: false,
			},
			{
				source: '/studio/mcp',
				destination: '/account',
				permanent: false,
			},
			{
				source: '/studio/usage',
				destination: '/account',
				permanent: false,
			},
		])
	})
})
