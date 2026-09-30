// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { svgAssetToPrimitives } from './svg-asset-to-primitives.client'

/** 자산을 네트워크 없이 먹인다 — 이 파일이 검증하는 것은 fetch가 아니라 도형 변환이다. */
function serveSvg(body: string) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response(body, { headers: { 'content-type': 'image/svg+xml' } })),
	)
}

const BOX = { x: 0, y: 0, width: 91, height: 24 }
/** 🔴 캐시가 url로 잡히므로 테스트마다 다른 url을 쓴다 — 안 그러면 첫 자산이 계속 재사용된다. */
let seq = 0
const url = () => `/api/application-images/file/test-${seq++}.svg`

afterEach(() => vi.unstubAllGlobals())

describe('svgAssetToPrimitives — 컴파운드 패스', () => {
	/**
	 * 🔴 실측(2026-09-10): HD현대 CI SVG는 `<path>` 8개가 전부 `fill="black"`인데, 그것이 PDF에
	 * 칠 연산자 8번으로 나가 Illustrator에서 **패스 8개로 쪼개져** 열렸다(사용자 지적).
	 * 같은 칠을 쓰는 연이은 도형은 **하나의 컴파운드 패스**여야 한다.
	 */
	it('같은 칠을 쓰는 연이은 path를 하나로 합친다', async () => {
		serveSvg(
			'<svg width="91" height="24" viewBox="0 0 91 24">' +
				'<path d="M0 0H10V10H0Z" fill="black"/>' +
				'<path d="M20 0H30V10H20Z" fill="black"/>' +
				'<path d="M40 0H50V10H40Z" fill="black"/>' +
				'</svg>',
		)

		const primitives = await svgAssetToPrimitives(url(), BOX, { fit: 'contain' })

		expect(primitives).toHaveLength(1)
		expect(primitives?.[0]).toMatchObject({
			kind: 'path',
			d: 'M0 0H10V10H0Z M20 0H30V10H20Z M40 0H50V10H40Z',
		})
	})

	it('🔴 색이 다르면 합치지 않는다 — 합치면 색이 하나로 뭉개진다', async () => {
		serveSvg(
			'<svg width="10" height="10" viewBox="0 0 10 10">' +
				'<path d="M0 0H4V4H0Z" fill="black"/>' +
				'<path d="M5 0H9V4H5Z" fill="red"/>' +
				'</svg>',
		)

		const primitives = await svgAssetToPrimitives(url(), BOX, { fit: 'contain' })

		expect(primitives).toHaveLength(2)
	})

	/**
	 * 🔴 사이에 다른 색이 끼면 **연이은 것만** 합쳐야 한다. 색으로 묶어 버리면 그 도형이
	 * 위아래로 뒤집혀 그림이 달라진다(같은 색 둘 사이에 낀 도형이 위로 올라온다).
	 */
	it('사이에 다른 색이 끼면 순서를 지킨다', async () => {
		serveSvg(
			'<svg width="10" height="10" viewBox="0 0 10 10">' +
				'<path d="M0 0H1V1H0Z" fill="black"/>' +
				'<path d="M2 0H3V1H2Z" fill="red"/>' +
				'<path d="M4 0H5V1H4Z" fill="black"/>' +
				'</svg>',
		)

		const primitives = await svgAssetToPrimitives(url(), BOX, { fit: 'contain' })

		expect(primitives?.map((p) => ('d' in p ? p.d : null))).toEqual([
			'M0 0H1V1H0Z',
			'M2 0H3V1H2Z',
			'M4 0H5V1H4Z',
		])
	})

	it('🔴 감김 규칙이 다르면 합치지 않는다 — 한 path에 섞으면 구멍이 달라진다', async () => {
		serveSvg(
			'<svg width="10" height="10" viewBox="0 0 10 10">' +
				'<path d="M0 0H4V4H0Z" fill="black"/>' +
				'<path d="M5 0H9V4H5Z" fill="black" fill-rule="evenodd"/>' +
				'</svg>',
		)

		const primitives = await svgAssetToPrimitives(url(), BOX, { fit: 'contain' })

		expect(primitives).toHaveLength(2)
	})

	it('마스크로 얹힌 자산은 tint 하나로 칠해지므로 전부 한 패스가 된다', async () => {
		serveSvg(
			'<svg width="10" height="10" viewBox="0 0 10 10">' +
				'<path d="M0 0H1V1H0Z" fill="black"/>' +
				'<path d="M2 0H3V1H2Z" fill="red"/>' +
				'</svg>',
		)

		const primitives = await svgAssetToPrimitives(url(), BOX, {
			fit: 'contain',
			tint: '#00ff00',
		})

		expect(primitives).toHaveLength(1)
		expect(primitives?.[0]).toMatchObject({ d: 'M0 0H1V1H0Z M2 0H3V1H2Z' })
	})
})
