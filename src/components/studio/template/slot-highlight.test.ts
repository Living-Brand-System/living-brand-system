import { describe, expect, it } from 'vitest'
import { clampSlotBox, slotHighlightStyle, slotHoverStyle } from './slot-highlight'

const CANVAS = { width: 1920, height: 1080 }
/** 총배율 0.287(실측값)로 놓인 캔버스 — 화면 폭 551px. */
const ROOT = { left: 565, top: 552, width: 551, height: 310 }
/** CI 심볼의 중간초록 — 서비스가 `brand-colors`에서 이름으로 찾아 내리는 값이다. */
const HD_GREEN = '#00AF41'

/** 캔버스 좌표를 ROOT 기준 화면 사각형으로 되돌린다 — 테스트가 배율 산수를 두 번 적지 않게. */
function onScreen(box: { left: number; top: number; width: number; height: number }) {
	const factor = ROOT.width / CANVAS.width
	return {
		left: ROOT.left + box.left * factor,
		top: ROOT.top + box.top * factor,
		width: box.width * factor,
		height: box.height * factor,
	}
}

describe('clampSlotBox', () => {
	it('화면 사각형을 캔버스 좌표로 되돌린다 — 배율은 두 폭의 비로 구한다', () => {
		const box = { left: 100, top: 200, width: 400, height: 300 }
		const clamped = clampSlotBox(onScreen(box), ROOT, CANVAS)
		expect(clamped?.left).toBeCloseTo(100, 6)
		expect(clamped?.top).toBeCloseTo(200, 6)
		expect(clamped?.width).toBeCloseTo(400, 6)
		expect(clamped?.height).toBeCloseTo(300, 6)
	})

	it('🔴 캔버스를 넘는 슬롯을 잘라 넣는다 — 이것이 테두리가 잘려 보인 원인이었다', () => {
		// 오른쪽으로 200, 아래로 80 넘치는 슬롯.
		const box = { left: 1500, top: 1000, width: 620, height: 160 }
		const clamped = clampSlotBox(onScreen(box), ROOT, CANVAS)
		expect(clamped?.left).toBeCloseTo(1500, 6)
		expect(clamped?.width).toBeCloseTo(420, 6)
		expect(clamped?.height).toBeCloseTo(80, 6)
	})

	it('왼쪽·위로 넘치는 쪽도 자른다', () => {
		const clamped = clampSlotBox(
			onScreen({ left: -300, top: -100, width: 800, height: 400 }),
			ROOT,
			CANVAS,
		)
		expect(clamped?.left).toBe(0)
		expect(clamped?.top).toBe(0)
		expect(clamped?.width).toBeCloseTo(500, 6)
		expect(clamped?.height).toBeCloseTo(300, 6)
	})

	it('캔버스와 겹치지 않으면 null이다', () => {
		expect(
			clampSlotBox(onScreen({ left: 2000, top: 0, width: 100, height: 100 }), ROOT, CANVAS),
		).toBeNull()
		expect(
			clampSlotBox(onScreen({ left: 0, top: 1200, width: 100, height: 100 }), ROOT, CANVAS),
		).toBeNull()
	})

	it('숨겨진 슬롯(크기 0)은 null이다 — display:none이 여기로 떨어진다', () => {
		expect(clampSlotBox({ left: 600, top: 600, width: 0, height: 0 }, ROOT, CANVAS)).toBeNull()
	})

	it('배율을 구할 수 없으면 null이다 — 측정 전 첫 프레임', () => {
		expect(
			clampSlotBox({ left: 0, top: 0, width: 10, height: 10 }, { ...ROOT, width: 0 }, CANVAS),
		).toBeNull()
	})

	it('Preview Size 전환 중에도 캔버스 좌표는 같다 — 배율이 약분된다', () => {
		const box = { left: 300, top: 400, width: 500, height: 200 }
		const half = { left: 100, top: 100, width: ROOT.width / 2, height: ROOT.height / 2 }
		const factor = half.width / CANVAS.width
		const mid = {
			left: half.left + box.left * factor,
			top: half.top + box.top * factor,
			width: box.width * factor,
			height: box.height * factor,
		}
		const settled = clampSlotBox(onScreen(box), ROOT, CANVAS)
		const during = clampSlotBox(mid, half, CANVAS)
		expect(during?.left).toBeCloseTo(settled?.left ?? -1, 6)
		expect(during?.width).toBeCloseTo(settled?.width ?? -1, 6)
	})
})

describe('slotHighlightStyle', () => {
	it('테두리는 진하게, 면은 같은 색의 반투명으로 낸다', () => {
		const style = slotHighlightStyle(1, HD_GREEN)
		expect(style.border).toContain(`solid ${HD_GREEN}`)
		expect(style.backgroundColor).toBe(`color-mix(in srgb, ${HD_GREEN} 18%, transparent)`)
	})

	it('총배율의 두 번째 몫(--preview-scale)을 CSS에 남긴다 — 한쪽만 보정하면 선이 절반이 된다', () => {
		expect(slotHighlightStyle(0.5, HD_GREEN).border).toBe(
			'max(1px, calc(2 * calc(1px / (0.5 * var(--preview-scale, 1))))) solid #00AF41',
		)
	})

	it('측정 전(scale 0)에도 유효한 배율을 낸다', () => {
		expect(slotHighlightStyle(0, HD_GREEN).border).toContain('(1 * var(--preview-scale, 1))')
	})

	it('레이아웃을 건드리지 않고 클릭을 가로채지 않는다', () => {
		const style = slotHighlightStyle(1, HD_GREEN)
		expect(style.position).toBe('absolute')
		expect(style.boxSizing).toBe('border-box')
		expect(style.pointerEvents).toBe('none')
	})

	it('도화지 전체를 집을 때는 면을 깔지 않는다 — 구별할 형제가 없다', () => {
		expect(slotHighlightStyle(1, HD_GREEN, false).backgroundColor).toBeUndefined()
		expect(slotHighlightStyle(1, HD_GREEN, false).border).toContain(`solid ${HD_GREEN}`)
	})

	it('색을 못 받으면 브랜드 주입을 받는 토큰으로 폴백한다', () => {
		for (const missing of [null, undefined, '']) {
			const style = slotHighlightStyle(1, missing)
			expect(style.border).toContain('solid var(--primary)')
			expect(style.backgroundColor).toContain('var(--primary)')
		}
	})

	it('hex 형태가 아닌 값은 선언에 넣지 않는다 — 값은 brand-colors에서 온다', () => {
		for (const hostile of ['red;display:none', '#12', 'var(--x)', '#gggggg']) {
			const style = slotHighlightStyle(1, hostile)
			expect(style.border).not.toContain(hostile)
			expect(style.border).toContain('solid var(--primary)')
		}
	})
})

describe('slotHoverStyle', () => {
	it('테두리도 반투명으로 낸다 — 고른 것의 실선과 섞이지 않게', () => {
		const style = slotHoverStyle(1, HD_GREEN)
		expect(style.border).toContain(`color-mix(in srgb, ${HD_GREEN} 45%, transparent)`)
		expect(style.backgroundColor).toBe(`color-mix(in srgb, ${HD_GREEN} 10%, transparent)`)
	})

	it('테두리 굵기는 고른 것과 같다 — 잡히는 순간 상자가 흔들리면 안 된다', () => {
		const widthOf = (border: string | number | undefined) => String(border).split(' solid ')[0]
		expect(widthOf(slotHoverStyle(0.5, HD_GREEN).border)).toBe(
			widthOf(slotHighlightStyle(0.5, HD_GREEN).border),
		)
	})

	it('테두리가 상자를 키우지 않고 클릭을 가로채지 않는다', () => {
		const style = slotHoverStyle(1, HD_GREEN)
		expect(style.boxSizing).toBe('border-box')
		expect(style.pointerEvents).toBe('none')
	})

	it('hex 형태가 아닌 값은 선언에 넣지 않는다', () => {
		const style = slotHoverStyle(1, 'red;display:none')
		expect(style.border).not.toContain('display:none')
		expect(style.border).toContain('var(--primary)')
	})
})
