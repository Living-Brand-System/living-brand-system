// 조합(샘플) 키와 라벨. 🔴 에셋을 import하지 않는다 — Payload schema(Node)와 위젯(Next) 양쪽에서
// 안전하게 참조되어야 한다. webp/svg import가 섞이면 Payload 설정 로딩이 깨진다.
// 조합을 추가할 때: 여기에 키·라벨을 넣고 compositions.ts에 데이터를 채운다(둘 다 안 하면 타입에서 걸린다).

export const SAMPLE_OPTIONS = [
	{ value: 'a', label: '예시 A — 밝은 배경' },
	{ value: 'b', label: '예시 B — 어두운 배경' },
	{ value: 'c', label: '예시 C — 타이틀형' },
	{ value: 'grid-labels', label: '그리드 설명 — 1A·2A·3A' },
] as const

export type LayoutGridSample = (typeof SAMPLE_OPTIONS)[number]['value']
