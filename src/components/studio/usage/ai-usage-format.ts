/** 숫자 서식 한 자리 — 세 조각이 같은 자릿수·같은 정렬을 쓰게 한다. */
export function formatTokens(value: number): string {
	return value.toLocaleString('ko-KR')
}

export const HEAD_CLASS = 'font-semibold text-muted-foreground text-sm'
export const NUMBER_CLASS = 'text-right tabular-nums'
