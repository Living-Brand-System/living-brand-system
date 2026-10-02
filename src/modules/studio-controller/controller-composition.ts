import type {
	ControllerControlDefinition,
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerValues,
} from './controller-definition'

/**
 * 패널 컴포지션 계약의 어휘(docs/10 §3.7). 매니페스트는 **무엇이 있나**와 값끼리의 노출 조건만,
 * 패널은 **역할 → 자리**를 갖는다. 이 파일은 둘이 공유하는 어휘와 순수 계산만 소유한다 — 화면을 모른다.
 */

/** 컨트롤이 무엇을 뜻하나 — 위치가 아니다. 같은 역할도 스튜디오마다 다른 자리에 선다(패널 정책). */
export const CONTROLLER_ROLES = [
	'content',
	'source',
	'form',
	'preset',
	'palette',
	'placement',
	'view',
	'overlay',
	'tuning',
	'output',
] as const
export type ControllerRole = (typeof CONTROLLER_ROLES)[number]

/** 컨트롤 여러 개를 위젯 하나로 세우는 묶음 종류. 무엇을 그릴지는 레지스트리(화면)가 정한다. */
export const CONTROLLER_WIDGETS = [
	'color-pair',
	'colorway',
	'position',
	'compound',
	'camera',
	'reference',
	'asset-browser',
] as const
export type ControllerWidget = (typeof CONTROLLER_WIDGETS)[number]

/**
 * 노출 조건 — 같은 매니페스트의 컨트롤 **값**으로 평가한다.
 * 🔑 값으로 평가하므로 참조한 컨트롤이 숨어 있어도 그 값을 쓴다. 그래서 조건끼리의 순환이 성립하지 않는다.
 */
export type ControllerCondition =
	| { control: string; equals: ControllerControlValue }
	| { control: string; in: readonly ControllerControlValue[] }
	| { control: string; not: ControllerControlValue }
	| { all: readonly ControllerCondition[] }
	| { any: readonly ControllerCondition[] }

/**
 * 묶음 — 멤버 이름(위젯이 정한다: `foreground`·`background`·`mode`·`gate` …)에서 컨트롤 id로.
 * 값 계약을 복제하지 않고 멤버 컨트롤의 값을 쓴다. 묶음이 가리킨 컨트롤은 그룹 행으로 다시 그려지지 않는다.
 */
export type ControllerCluster = {
	id: string
	title: string
	role: ControllerRole
	widget: ControllerWidget
	members: Readonly<Record<string, string>>
	visibleWhen?: ControllerCondition
}

/** 패널이 소유하는 자리. 왼쪽 `settings`는 편집 오버레이의 설정 카드다. Output 카드는 이 계약 밖이다. */
export const STUDIO_PANEL_SLOTS = ['settings', 'fixed', 'presets', 'basic', 'adjustment'] as const
export type StudioPanelSlot = (typeof STUDIO_PANEL_SLOTS)[number]

/** 역할 → 자리. 목록 순서가 슬롯 안 순서이고, 같은 역할 안에서는 매니페스트 순서다. */
export type StudioPanelPolicy = Partial<Record<StudioPanelSlot, readonly ControllerRole[]>>

/** 슬롯에 서는 한 덩어리 — 그룹(보이는 컨트롤만) 또는 묶음. */
export type StudioPanelEntry =
	| { type: 'group'; group: ControllerGroupDefinition & { role: ControllerRole } }
	| { type: 'cluster'; cluster: ControllerCluster }

type ComposableGroup = ControllerGroupDefinition & {
	role?: ControllerRole
	visibleWhen?: ControllerCondition
}
type ComposableControl = ControllerControlDefinition & { visibleWhen?: ControllerCondition }

export function evaluateControllerCondition(
	condition: ControllerCondition,
	values: ControllerValues,
): boolean {
	if ('all' in condition)
		return condition.all.every((c) => evaluateControllerCondition(c, values))
	if ('any' in condition) return condition.any.some((c) => evaluateControllerCondition(c, values))
	const value = values[condition.control]
	if ('equals' in condition) return sameValue(value, condition.equals)
	if ('in' in condition) return condition.in.some((candidate) => sameValue(value, candidate))
	return !sameValue(value, condition.not)
}

// 조건에 쓰는 값은 원시값(문자열·불리언·숫자·null)이다. pad 같은 객체 값은 조건 대상이 아니다.
function sameValue(left: ControllerControlValue | undefined, right: ControllerControlValue) {
	return left === right
}

/** 조건이 가리키는 컨트롤 id들. 검증(미지 id·자기 참조)이 쓴다. */
export function conditionControlIds(condition: ControllerCondition): string[] {
	if ('all' in condition) return condition.all.flatMap(conditionControlIds)
	if ('any' in condition) return condition.any.flatMap(conditionControlIds)
	return [condition.control]
}

/**
 * 역할 정책대로 슬롯을 채운다. 숨은 그룹·묶음·컨트롤은 빠지고, 묶음이 가리킨 컨트롤은 그룹에서 빠진다.
 * 🔴 정책에 없는 역할·역할이 없는 그룹은 어느 슬롯에도 서지 않는다 — 지금의 「left/right 어디에도 없으면
 *    그리지 않는다」 규칙과 같다(선언은 남아 manager가 조정할 수 있다).
 */
export function arrangeStudioPanel(
	controller: {
		groups: readonly ComposableGroup[]
		clusters?: readonly ControllerCluster[]
	},
	policy: StudioPanelPolicy,
	values: ControllerValues,
): Record<StudioPanelSlot, StudioPanelEntry[]> {
	const visible = (condition?: ControllerCondition) =>
		!condition || evaluateControllerCondition(condition, values)
	const clusters = (controller.clusters ?? []).filter((cluster) => visible(cluster.visibleWhen))
	const clustered = new Set(
		(controller.clusters ?? []).flatMap((cluster) => Object.values(cluster.members)),
	)
	const groups = controller.groups.flatMap((group) => {
		if (!group.role || !visible(group.visibleWhen)) return []
		const controls = group.controls.filter(
			(control) =>
				!clustered.has(control.id) && visible((control as ComposableControl).visibleWhen),
		)
		return controls.length ? [{ ...group, role: group.role, controls }] : []
	})
	const slots = Object.fromEntries(
		STUDIO_PANEL_SLOTS.map((slot) => [slot, [] as StudioPanelEntry[]]),
	) as Record<StudioPanelSlot, StudioPanelEntry[]>
	for (const slot of STUDIO_PANEL_SLOTS) {
		for (const role of policy[slot] ?? []) {
			// 같은 역할 안에서는 매니페스트 순서 — 그룹이 먼저, 그다음 묶음(둘 다 선언 순서).
			for (const group of groups)
				if (group.role === role) slots[slot].push({ type: 'group', group })
			for (const cluster of clusters)
				if (cluster.role === role) slots[slot].push({ type: 'cluster', cluster })
		}
	}
	return slots
}

/**
 * 슬롯의 보이는 구조 서명 — 패널 렌더가 언제 다시 그릴지의 키다. 값이 아니라 **무엇이 서 있나**만 본다.
 * 🔑 배경 방식만 바뀌어도 Dimming 슬롯은 같은 컨트롤이 그대로 서 있어 서명이 같다 — 다시 그리지 않는다.
 */
export function controllerStructureSignature(entries: readonly StudioPanelEntry[]): string {
	return entries
		.map((entry) =>
			entry.type === 'group'
				? `${entry.group.id}(${entry.group.controls.map((control) => control.id).join(',')})`
				: `${entry.cluster.id}<${entry.cluster.widget}>`,
		)
		.join('|')
}
