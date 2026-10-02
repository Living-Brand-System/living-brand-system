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
	'preset-list',
	'swatches',
	'text-field',
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
	/**
	 * 묶음이 그 그룹 **안**, 그룹 컨트롤 뒤에 선다(Figma 529:19999 — Generate 안의 Reference Image).
	 * 자리가 아니라 소속이다 — 그룹이 어느 슬롯에 서든 따라간다. 그룹이 보이지 않으면 자기 역할대로 선다.
	 */
	group?: string
}

/**
 * 패널이 소유하는 자리. 왼쪽 `settings`는 편집 오버레이의 설정 카드, `basicPresets`는 Basic 탭 위 목록 카드다.
 * Output 카드는 이 계약 밖이다.
 */
export const STUDIO_PANEL_SLOTS = [
	'settings',
	'fixed',
	'basicPresets',
	'presets',
	'basic',
	'adjustment',
] as const
export type StudioPanelSlot = (typeof STUDIO_PANEL_SLOTS)[number]

/** 역할 → 자리. 목록 순서가 슬롯 안 순서이고, 같은 역할 안에서는 매니페스트 순서다. */
export type StudioPanelPolicy = Partial<Record<StudioPanelSlot, readonly ControllerRole[]>>

/**
 * 슬롯에 서는 한 덩어리 — 그룹(보이는 컨트롤만) 또는 묶음.
 * 묶음은 멤버 이름 → 지금 계약의 컨트롤 정의를 함께 싣는다(런타임 제한이 좁힌 선택지 그대로). 없는 멤버는 빠진다.
 */
export type StudioPanelClusterEntry = {
	type: 'cluster'
	cluster: ControllerCluster
	controls: Readonly<Record<string, ControllerControlDefinition>>
}
export type StudioPanelEntry =
	| {
			type: 'group'
			group: ControllerGroupDefinition & { role: ControllerRole }
			/** 그룹 안에 서는 묶음(`cluster.group`). */
			clusters?: readonly StudioPanelClusterEntry[]
	  }
	| StudioPanelClusterEntry

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
		/**
		 * 컨트롤 단위 역할 — 그룹 역할보다 앞선다. 한 그룹 안에 창작자용·어드민 전용 컨트롤이 섞인 런타임이 쓴다
		 * (지금의 `left/right`처럼 id → 의미). 역할이 갈리면 같은 그룹 제목 아래 따로 선다.
		 */
		roles?: Readonly<Record<string, ControllerRole>>
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
	const roleOf = (control: ControllerControlDefinition, group: ComposableGroup) =>
		controller.roles?.[control.id] ?? group.role
	// 안에 묶음을 품는 그룹은 자기 행이 없어도 선다 — 제목과 섹션이 묶음의 자리다(텍스트 슬롯 목록).
	const hosts = new Set(
		clusters.flatMap((cluster) => (cluster.group === undefined ? [] : [cluster.group])),
	)
	const groups = controller.groups.flatMap((group) => {
		if (!visible(group.visibleWhen)) return []
		const controls = group.controls.filter(
			(control) =>
				!clustered.has(control.id) &&
				roleOf(control, group) !== undefined &&
				visible((control as ComposableControl).visibleWhen),
		)
		// 역할마다 한 덩어리 — 그룹 순서·컨트롤 순서는 그대로다.
		const roles = [
			...new Set(controls.map((control) => roleOf(control, group) as ControllerRole)),
		]
		if (!roles.length && group.role && hosts.has(group.id)) roles.push(group.role)
		return roles.map((role) => ({
			...group,
			role,
			controls: controls.filter((control) => roleOf(control, group) === role),
		}))
	})
	const definitions = new Map(
		controller.groups.flatMap((group) =>
			group.controls.map((control) => [control.id, control] as const),
		),
	)
	const memberControls = (cluster: ControllerCluster) =>
		Object.fromEntries(
			Object.entries(cluster.members).flatMap(([member, id]) => {
				const control = definitions.get(id)
				return control ? [[member, control] as const] : []
			}),
		)
	const clusterEntry = (cluster: ControllerCluster): StudioPanelClusterEntry => ({
		type: 'cluster',
		cluster,
		controls: memberControls(cluster),
	})
	// 그룹 소속 묶음은 그 그룹의 첫 덩어리에 붙는다. 그룹이 보이지 않으면 자기 역할대로 선다.
	const nested = new Map<(typeof groups)[number], StudioPanelClusterEntry[]>()
	const free = clusters.filter((cluster) => {
		const host = groups.find((group) => group.id === cluster.group)
		if (!host) return true
		nested.set(host, [...(nested.get(host) ?? []), clusterEntry(cluster)])
		return false
	})
	const slots = Object.fromEntries(
		STUDIO_PANEL_SLOTS.map((slot) => [slot, [] as StudioPanelEntry[]]),
	) as Record<StudioPanelSlot, StudioPanelEntry[]>
	for (const slot of STUDIO_PANEL_SLOTS) {
		for (const role of policy[slot] ?? []) {
			// 같은 역할 안에서는 매니페스트 순서 — 그룹이 먼저, 그다음 묶음(둘 다 선언 순서).
			for (const group of groups)
				if (group.role === role)
					slots[slot].push({
						type: 'group',
						group,
						...(nested.has(group) ? { clusters: nested.get(group) } : {}),
					})
			for (const cluster of free)
				if (cluster.role === role) slots[slot].push(clusterEntry(cluster))
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
				? `${entry.group.id}(${entry.group.controls.map((control) => control.id).join(',')})${
						entry.clusters ? `[${controllerStructureSignature(entry.clusters)}]` : ''
					}`
				: `${entry.cluster.id}<${entry.cluster.widget}>`,
		)
		.join('|')
}
