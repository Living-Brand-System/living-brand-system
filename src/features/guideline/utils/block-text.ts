/** 빈/공백 문자열을 제거한다. agent 평문 조립용. */
export function compact(values: (string | null | undefined)[]): string[] {
	return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))
}

export { relationshipId } from '@/features/quality-rule/relationship-id'
