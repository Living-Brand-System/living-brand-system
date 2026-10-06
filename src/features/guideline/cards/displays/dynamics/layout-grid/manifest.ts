import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'

// Key Layout 정본 규칙 + 그것을 어떤 컨트롤로 조작하는지. 이 파일이 이 블록의 **매니페스트**다.
//
// 🔴 react·에셋을 import하지 않는다 — `schema.ts`가 이 파일을 읽고 `payload.config`는 Node에서
//    로드된다. 타입만 `import type`으로 가져오므로 런타임 의존이 생기지 않는다.
//
// 🔑 컨트롤 상수를 먼저 세우고 그룹이 그것을 조합한다. 그래야 `schema.ts`의 admin 입력 검증이
//    `MARGIN.min`처럼 **같은 값**을 직접 읽는다 — 범위가 두 곳으로 갈라지지 않는다.

/** 마진 = 판형 긴 축의 3~6%. 짧은 축에도 같은 길이를 쓰므로 수직·수평 마진은 항상 같다. */
export const MARGIN = {
	id: 'marginPct',
	kind: 'range',
	label: '마진',
	defaultValue: 4.5,
	min: 3,
	max: 6,
	step: 0.1,
	display: { unit: '%' },
} as const satisfies ControllerControlDefinition

/** 거터 = 마진의 0~100%. 수직·수평 따로. 0%면 셀 사이 간격이 없다. */
export const GUTTER_X = {
	id: 'gutterX',
	kind: 'range',
	label: '수평 거터',
	defaultValue: 75,
	min: 0,
	max: 100,
	step: 1,
	display: { unit: '%' },
} as const satisfies ControllerControlDefinition

export const GUTTER_Y = {
	...GUTTER_X,
	id: 'gutterY',
	label: '수직 거터',
} as const satisfies ControllerControlDefinition

export const GUIDES = {
	id: 'guidesOn',
	kind: 'toggle',
	label: '그리드',
	defaultValue: true,
} as const satisfies ControllerControlDefinition
