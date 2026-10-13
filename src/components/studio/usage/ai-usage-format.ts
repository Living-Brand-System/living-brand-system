/** 숫자 서식 한 자리 — 세 조각이 같은 자릿수·같은 정렬을 쓰게 한다. */
export function formatTokens(value: number): string {
	return value.toLocaleString('ko-KR')
}

export const HEAD_CLASS = 'font-semibold text-muted-foreground text-sm'
export const NUMBER_CLASS = 'text-right tabular-nums'

const COMPACT = new Intl.NumberFormat('ko-KR', { notation: 'compact' })

/** 축 눈금처럼 자리가 좁은 곳의 숫자 — 15만·2.5천. */
export function formatTokensCompact(value: number): string {
	return COMPACT.format(value)
}

/**
 * 막대 차트 세로축 — 최댓값을 덮는 깔끔한 눈금(1·2·2.5·5 × 10ⁿ 간격, 4칸 안팎).
 * 눈금이 최댓값보다 위에서 끝나므로 막대 높이도 이 `max`로 나눈다.
 */
export function niceTokenScale(max: number): { max: number; ticks: number[] } {
	// 사용량이 없어도 기준선의 0은 늘 선다 — 축이 비면 그래프가 덜 그려진 것처럼 읽힌다.
	if (max <= 0) return { max: 0, ticks: [0] }
	const raw = max / 4
	const magnitude = Math.max(1, 10 ** Math.floor(Math.log10(raw)))
	const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
	const top = Math.ceil(max / step) * step
	return {
		max: top,
		ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step),
	}
}
