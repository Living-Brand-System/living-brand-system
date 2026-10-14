/** 규칙 실행 방식 — Rules·RuleCheckers 컬렉션 select와 도메인 타입이 이 목록 하나를 읽는다. */
export const RULE_EXECUTOR_OPTIONS = [
	{ label: 'Deterministic', value: 'deterministic' },
	{ label: 'Heuristic (AI)', value: 'heuristic' },
	{ label: 'Advisory (AI)', value: 'manual' },
] as const
export type RuleExecutor = (typeof RULE_EXECUTOR_OPTIONS)[number]['value']
