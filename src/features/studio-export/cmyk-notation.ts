import type { CmykColor } from './adapters/rgb-to-cmyk.sharp'

/**
 * 브랜드 정본 표의 CMYK 표기를 잉크량으로 읽는다. 예: `"C 80 M 0 Y 100 K 0"` → `{c:.8,m:0,y:1,k:0}`.
 *
 * 🔴 이 값이 인쇄에 그대로 나가므로 형식이 조금이라도 어긋나면 읽지 않는다(`null`) — 반쯤 읽어
 *    0으로 메우면 잉크 하나가 조용히 빠진 인쇄물이 나가고, 인쇄물은 되돌릴 수 없다.
 * 🔑 정본이 총 잉크량 상한을 넘기든 순수 검정을 안 쓰든 여기서 고치지 않는다. 값의 정본은
 *    브랜드 가이드라인이고 인쇄 사고가 나면 고칠 곳은 가이드라인이다(사용자 지시, 2026-09-09).
 */
export function parseCmykNotation(notation: string): CmykColor | null {
	const match = notation
		.trim()
		.match(/^C\s*(\d{1,3})\s+M\s*(\d{1,3})\s+Y\s*(\d{1,3})\s+K\s*(\d{1,3})$/i)
	if (!match) return null
	const [c, m, y, k] = match.slice(1, 5).map(Number)
	if ([c, m, y, k].some((value) => value > 100)) return null
	return { c: c / 100, k: k / 100, m: m / 100, y: y / 100 }
}
