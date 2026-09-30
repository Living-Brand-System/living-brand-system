import type { VectorPrimitive } from '@/modules/studio-artifact/studio-artifact'
import { HD_INFOGRAPHIC_COLORS } from './palette'

/**
 * 표현과 판이 **함께 쓰는** 조각. 여기 있는 것은 어느 차트에도 속하지 않는다 — 글자 하나를
 * 앉히는 법, 칸에 드는 크기를 어림하는 법, 사람이 읽는 눈금 간격을 고르는 법.
 *
 * 🔴 `model.ts`와 `plot-frame.ts`가 서로를 import하면 순환이 된다. 둘 다 이 파일만 본다.
 */

export type Box = { x: number; y: number; width: number; height: number }

/**
 * 지정 서체. 오남용 ②「지정 서체 외의 다른 서체를 사용하지 않습니다」를 축으로 두지 않는 것으로
 * 지킨다 — 고를 수 없으면 어길 수 없다. 정본은 `theme.css`의 `HD OTF` @font-face다.
 * 🔴 `var(--font-body)`를 쓰지 않는다. 이 값은 SVG·PDF attribute로 그대로 나가 CSS 변수가 풀리지 않는다.
 */
export const INFOGRAPHIC_FONT_FAMILY = '"HD OTF", "Pretendard", sans-serif'

/**
 * 글자 굵기.
 *
 * 🔴 HD OTF가 실제로 가진 것은 **300·500·700 셋뿐**이다 — 그 밖의 값을 주면 브라우저가
 *    합성해 원본과 다른 모양이 된다(`brand-typeface.ts`의 `AVAILABLE_WEIGHTS`).
 * 🔑 흰 글자는 Medium, 어두운 글자는 Light다. 같은 굵기라도 **흰 바탕의 어두운 글자가 더
 *    굵어 보이므로**, 한 단계 더 내려야 두 경우의 무게가 같게 읽힌다.
 */
function labelWeight(fill: string): 300 | 500 {
	return fill === HD_INFOGRAPHIC_COLORS.white ? 500 : 300
}

/** 면 위에 얹는 글자 하나. y는 baseline이 아니라 **글자 상자의 세로 중앙**을 받는다. */
export function label(
	text: string,
	x: number,
	y: number,
	fontSize: number,
	fill: string,
	anchor: 'start' | 'middle' | 'end' = 'middle',
): VectorPrimitive {
	return {
		kind: 'text',
		x,
		// 글자 상자의 세로 중앙을 받아 baseline으로 옮긴다 — cap height 대략 0.35em.
		y: y + fontSize * 0.35,
		text,
		fontFamily: INFOGRAPHIC_FONT_FAMILY,
		fontSize,
		fontWeight: labelWeight(fill),
		fill,
		textAnchor: anchor,
	}
}

/**
 * 칸 안에 들어가는 글자 크기. 🔴 글자 수 × 고정 배수로는 안 된다 — 한글은 라틴·숫자의 두 배 가까이
 * 넓어서 같은 글자 수라도 「Group A」는 들어가고 「서울특별시」는 칸을 넘는다(실제로 넘었다).
 * 정확한 폭은 폰트가 알지만 model은 순수 함수라 측정할 수 없으므로, 글자 종류로 어림한다.
 *
 * 🔴 실측기가 레포에 있지만(`outline-text.service.ts`) 서버·비동기라 여기서 못 부른다.
 *    어림이 유일한 수단이고, 그래서 **여백은 넉넉히 잡는다**.
 */
export function textEms(text: string): number {
	return [...text].reduce(
		(total, character) =>
			total +
			(/[\u1100-\u11FF\u3000-\u9FFF\uAC00-\uD7AF\uFF00-\uFF60]/.test(character) ? 1 : 0.55),
		0,
	)
}

export function fitFontSize(text: string, boxWidth: number, max: number): number {
	const ems = textEms(text)
	return ems > 0 ? Math.min(max, boxWidth / ems) : max
}

/**
 * 여럿이 함께 설 때의 글자 크기. 🔴 각자 칸에 맞춰 줄이면 같은 층위의 것이 크기로 갈려
 * 순서가 있는 것처럼 읽힌다 — 가장 빡빡한 칸이 전체 크기를 정한다.
 */
export function sharedFontSize(
	entries: readonly { text: string; width: number }[],
	max: number,
): number {
	return entries.reduce(
		(size, entry) => Math.min(size, fitFontSize(entry.text, entry.width, max)),
		max,
	)
}

export function round(value: number): number {
	return Math.round(value * 100) / 100
}

/** 1·2·5의 10의 거듭제곱 배수로 올린다 — 사람이 읽는 눈금은 늘 그 셋 중 하나다. */
export function niceStep(rough: number): number {
	if (!Number.isFinite(rough) || rough <= 0) return 1
	const magnitude = 10 ** Math.floor(Math.log10(rough))
	const normalized = rough / magnitude
	const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
	return step * magnitude
}
