'use client'

import type { ReactNode } from 'react'
import type { ControllerGroupSectionProps } from '@/components/shared/controller'
import { Controller } from '@/components/shared/controller'
import {
	type ControllerAssetSources,
	ControllerControlRenderer,
	ControllerDefinitionGroup,
} from '@/components/shared/controller-renderer'
import type {
	ControllerCluster,
	ControllerWidget,
	StudioPanelClusterEntry,
	StudioPanelEntry,
} from '@/modules/studio-controller/controller-composition'
import {
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerGroupDefinition,
	type ControllerGroupPresentation,
	type ControllerRuntimeBindings,
	type ControllerValues,
	resolveControlValue,
} from '@/modules/studio-controller/controller-definition'

export type ControllerWidgetProps = {
	cluster: ControllerCluster
	/** 멤버 이름 → 지금 계약의 컨트롤 정의(`arrangeStudioPanel`이 푼다). */
	controls: Readonly<Record<string, ControllerControlDefinition>>
	values: ControllerValues
	bindings?: ControllerRuntimeBindings
	onChange: (controlId: string, value: ControllerControlValue) => void
	/**
	 * 위젯이 읽는 화면 데이터(그래픽 config 등) — 컴포지션이 함께 싣는다. 위젯은 자기 레지스트리가 아는 모양으로 읽는다.
	 * 🔑 context로 내리지 않는다 — 그러면 provider가 패널 안쪽 화면 갈래에 묶여 패널을 하나로 둘 수 없다.
	 */
	scope?: unknown
}

/**
 * 묶음 위젯 레지스트리 — 위젯 종류 → 그리는 컴포넌트. 화면(스튜디오)이 넘긴다. 매니페스트는 종류만 적는다.
 * 🔴 레지스트리에 없는 위젯은 그리지 않고 개발 중 경고한다 — 빈 자리로 조용히 두면 컨트롤이 사라진 줄 모른다.
 */
export type ControllerWidgetRegistry = Partial<
	Record<ControllerWidget, (props: ControllerWidgetProps) => ReactNode>
>

export type StudioPanelSlotRenderProps = {
	values: ControllerValues
	/** 그룹마다 붙일 섹션 활성화 배선(캔버스 포커스 등). 화면이 정한다 — 계약은 모른다. */
	groupSection?: (group: ControllerGroupDefinition) => ControllerGroupSectionProps | undefined
	bindings?: ControllerRuntimeBindings
	presentation?: { groups: readonly ControllerGroupPresentation[] }
	onChange: (controlId: string, value: ControllerControlValue) => void
	widgets?: ControllerWidgetRegistry
	assetSources?: ControllerAssetSources
	/** 위젯에 그대로 넘기는 화면 데이터 — `ControllerWidgetProps.scope`. */
	scope?: unknown
}

/**
 * 패널 슬롯 하나를 그린다(docs/10 §3.7) — 그룹은 `ControllerRenderer`와 같은 컴포넌트로, 묶음은 레지스트리 위젯으로.
 * 그룹·묶음 무리는 각각 패널 섹션 하나이고, 섹션은 생기고 빠질 때 높이로 펼친다(`Controller.Sections`).
 */
export function StudioPanelSlot({
	entries,
	widgets,
	groupSection,
	flat = false,
	children,
	...props
}: StudioPanelSlotRenderProps & {
	entries: readonly StudioPanelEntry[]
	/**
	 * 그룹 제목 없이 행만 쌓는다 — 제목을 카드가 이미 가진 자리(왼쪽 편집 설정 카드)에 쓴다.
	 * 행 사이 4px, 생기고 빠지는 행은 같은 펼침이다.
	 */
	flat?: boolean
	/** 계약 슬롯 뒤에 이어 붙이는 화면 고유 섹션(예: 생성 버튼) — `Controller.Section`으로 감싸 넘긴다. 선·펼침이 같다. */
	children?: ReactNode
}) {
	if (flat)
		return (
			<Controller.Reveal gap={1}>
				{entries.flatMap((entry) =>
					entry.type === 'group'
						? [
								...entry.group.controls.map((control) => (
									<ControllerControlRenderer
										key={control.id}
										definition={control}
										value={resolveControlValue(control, props.values)}
										binding={props.bindings?.[control.id]}
										assetSources={props.assetSources}
										onChange={(value) => props.onChange(control.id, value)}
									/>
								)),
								...(entry.clusters ?? []).map((cluster) =>
									renderWidget(cluster, widgets, props),
								),
							]
						: [renderWidget(entry, widgets, props)],
				)}
				{children}
			</Controller.Reveal>
		)
	// 패널 규칙(docs/features/studio.md) — 그룹 하나가 섹션 하나다. 섹션 사이 선은 패널이 긋는다(`Controller.Sections`).
	// 연이은 묶음 위젯은 한 섹션에 6px 간격으로 쌓는다(Figma 345:17104·350:2664 — 표면끼리 붙는 컴파운드).
	const runs = entries.reduce<StudioPanelEntry[][]>((all, entry) => {
		const last = all.at(-1)
		if (entry.type === 'cluster' && last?.[0].type === 'cluster') last.push(entry)
		else all.push([entry])
		return all
	}, [])
	return (
		<Controller.Sections>
			{runs.map((run) => {
				const first = run[0]
				if (first.type === 'group')
					return (
						<Controller.Section
							key={`group:${first.group.id}:${first.group.role}`}
							start="title"
						>
							<ControllerDefinitionGroup
								group={first.group}
								section={groupSection?.(first.group)}
								{...props}
							>
								{first.clusters?.map((cluster) =>
									renderWidget(cluster, widgets, props),
								)}
							</ControllerDefinitionGroup>
						</Controller.Section>
					)
				return (
					<Controller.Section
						key={`cluster:${first.cluster.id}`}
						start={TITLED_WIDGETS.has(first.cluster.widget) ? 'title' : 'content'}
					>
						<Controller.Reveal gap={1.5}>
							{run.map((entry) =>
								entry.type === 'cluster'
									? renderWidget(entry, widgets, props)
									: null,
							)}
						</Controller.Reveal>
					</Controller.Section>
				)
			})}
			{/* 계약 밖의 것(생성 버튼·안내) — 소비처가 `Controller.Section`으로 감싸 넘긴다. */}
			{children}
		</Controller.Sections>
	)
}

/**
 * 스스로 그룹 제목 행을 그리는 위젯 — 그 위젯으로 시작하는 섹션은 제목으로 시작한다(위 4px).
 * ponytail: 위젯 종류로 판정한다. 제목을 그리는 위젯이 늘면 여기 더한다(패널 규칙 검사가 첫 제목 높이로 잡는다).
 */
const TITLED_WIDGETS: ReadonlySet<ControllerWidget> = new Set(['preset-list', 'transform'])

function renderWidget(
	{ cluster, controls }: StudioPanelClusterEntry,
	widgets: ControllerWidgetRegistry | undefined,
	props: Omit<StudioPanelSlotRenderProps, 'widgets' | 'groupSection'>,
) {
	const Widget = widgets?.[cluster.widget]
	if (!Widget) {
		if (process.env.NODE_ENV !== 'production')
			console.warn(`등록되지 않은 묶음 위젯입니다: ${cluster.widget} (${cluster.id})`)
		return null
	}
	return (
		<Widget
			key={`cluster:${cluster.id}`}
			cluster={cluster}
			controls={controls}
			values={props.values}
			bindings={props.bindings}
			onChange={props.onChange}
			scope={props.scope}
		/>
	)
}
