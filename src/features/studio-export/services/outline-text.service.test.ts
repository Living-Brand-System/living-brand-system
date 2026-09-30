import { describe, expect, it } from 'vitest'
import { outlineTextRun, resolveFontFamily } from './outline-text.service'

describe('resolveFontFamily', () => {
	it('CSS 목록에서 파일을 가진 첫 서체를 고른다', () => {
		expect(resolveFontFamily('"HD OTF", sans-serif')).toBe('hd otf')
		expect(resolveFontFamily('Inter, Pretendard, system-ui')).toBe('pretendard')
		expect(resolveFontFamily('"Comic Sans MS", cursive')).toBeNull()
	})
})

describe('outlineTextRun', () => {
	it('국문과 라틴이 섞여도 글자마다 서체를 골라 한 path로 잇는다', async () => {
		const result = await outlineTextRun({
			text: 'HD현대 HYUNDAI',
			fontFamily: '"HD OTF", sans-serif',
			fontSize: 40,
			fontWeight: 700,
		})

		expect(result.outlined).toBe(true)
		if (!result.outlined) return
		expect(result.family).toBe('hd otf')
		expect(result.width).toBeGreaterThan(0)
		// 두부(.notdef)가 나오면 국문 파일을 못 고른 것이다 — 글자 수만큼 윤곽이 있어야 한다.
		expect(result.d.split('M').length - 1).toBeGreaterThan(10)
	})

	it('굵기마다 다른 윤곽을 낸다 — 파일 선택이 실제로 먹는지', async () => {
		const outlines = await Promise.all(
			[300, 500, 700].map((fontWeight) =>
				outlineTextRun({
					text: 'HD현대',
					fontFamily: '"HD OTF"',
					fontSize: 40,
					fontWeight,
				}),
			),
		)
		const paths = outlines.flatMap((result) => (result.outlined ? [result.d] : []))

		expect(paths).toHaveLength(3)
		expect(new Set(paths).size).toBe(3)
	})

	/**
	 * 🔴 이 케이스는 **Pretendard여야** 의미가 있다. HD OTF는 CFF(3차 곡선)라 변환을 되돌려도
	 * `Q`가 0개로 나와, HD OTF에 얹으면 **되돌려도 통과하는 가짜 가드**가 된다.
	 * 실측: 같은 글자에서 pretendard의 `toSVG()`는 Q 118개, hd는 0개다.
	 *
	 * 왜 Q를 남기면 안 되는가 — pdf-lib의 `drawSvgPath`가 `Q`를 PDF `v` 연산자로 내보내는데
	 * `v`는 첫 제어점을 현재점으로 대체한다. (P0, Q, E)가 (P0, P0, Q, E)로 찍혀 곡선이 눌린다.
	 */
	it('아웃라인 path에 2차 곡선을 남기지 않는다 — pdf-lib이 Q를 잘못 내보낸다', async () => {
		const result = await outlineTextRun({
			text: '픽셀 Google',
			fontFamily: 'Pretendard',
			fontSize: 40,
		})

		expect(result.outlined).toBe(true)
		if (!result.outlined) return
		expect(result.d).not.toMatch(/[Qq]/)
		// 곡선이 통째로 사라진 것이 아니라 3차로 옮겨진 것이어야 한다.
		expect(result.d).toMatch(/C/)
	})

	it('가진 서체가 아니면 다른 서체로 대신 그리지 않고 돌려보낸다', async () => {
		const result = await outlineTextRun({
			text: '없는서체',
			fontFamily: '"Comic Sans MS"',
			fontSize: 20,
		})

		expect(result).toEqual({ outlined: false, reason: 'unknown-font' })
	})

	it('가변 서체의 기본에서 먼 굵기는 아웃라인하지 않는다', async () => {
		// fontkit이 woff2 가변 서체의 굵기 축을 못 쓴다 — Bold를 Regular 두께로 인쇄하지 않는다.
		expect(
			await outlineTextRun({
				text: 'Bold',
				fontFamily: 'Pretendard',
				fontSize: 24,
				fontWeight: 900,
			}),
		).toEqual({ outlined: false, reason: 'variable-weight' })

		const regular = await outlineTextRun({
			text: 'Regular',
			fontFamily: 'Pretendard',
			fontSize: 24,
			fontWeight: 400,
		})
		expect(regular.outlined).toBe(true)
	})
})
