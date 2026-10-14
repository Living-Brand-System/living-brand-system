/**
 * AI 검수 기준의 어휘 — Rules 컬렉션 select·검수 결과 타입·관측값 검증(evaluator·MCP)이 이 목록을 읽는다.
 * 🔴 값과 순서는 DB enum(enum_heuristic_criterion_*)과 같다. 바꾸면 마이그레이션이 필요하다.
 */
export const HEURISTIC_CRITERION_KIND_OPTIONS = [
	{ label: '관찰형', value: 'presence' },
	{ label: '수치형', value: 'measure' },
] as const

export const PRESENCE_EXPECTED_OPTIONS = [
	{ label: '있어야 함', value: 'present' },
	{ label: '없어야 함', value: 'absent' },
] as const
export type PresenceExpected = (typeof PRESENCE_EXPECTED_OPTIONS)[number]['value']

export const MEASURE_OPERATOR_OPTIONS = [
	{ label: '이상 (≥)', value: 'gte' },
	{ label: '이하 (≤)', value: 'lte' },
	{ label: '범위', value: 'between' },
] as const
export type MeasureOperator = (typeof MEASURE_OPERATOR_OPTIONS)[number]['value']

/** AI가 기준 하나에 내는 관측값(관찰형). 수치형은 숫자이거나 뒤의 둘이다. */
export const OBSERVATION_VALUES = ['present', 'absent', 'uncertain', 'not_applicable'] as const
export type ObservationValue = (typeof OBSERVATION_VALUES)[number]
