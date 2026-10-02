'use client'

import type { ReactNode } from 'react'
import { Controller } from '@/components/shared/controller'
import type { ControllerGroupSectionProps } from '@/components/shared/controller/group'
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
import type {
	ControllerControlDefinition,
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerGroupPresentation,
	ControllerRuntimeBindings,
	ControllerValues,
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
 * 둘을 한 `GroupList`에 담아 간격과 생기고 빠질 때의 펼침(`ControllerPresence`)이 같다.
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
	/** 계약 슬롯 뒤에 같은 목록으로 이어 붙이는 화면 고유 그룹(예: 생성 버튼) — 간격·펼침이 같다. */
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
										value={
											control.id in props.values
												? props.values[control.id]
												: control.defaultValue
										}
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
	// 연이은 묶음 위젯은 6px 간격으로 쌓고(Figma 345:17104·350:2664 — 표면끼리 붙는 컴파운드), 그룹은 목록의 12px를
	// 따른다. 그룹만 있으면 목록 하나 그대로라 지금 조립과 같은 DOM이다.
	const runs = entries.reduce<StudioPanelEntry[][]>((all, entry) => {
		const last = all.at(-1)
		if (last && last[0].type === entry.type) last.push(entry)
		else all.push([entry])
		return all
	}, [])
	const renderRun = (run: StudioPanelEntry[], index: number, extra?: ReactNode) =>
		run[0]?.type === 'cluster' ? (
			<Controller.Reveal key={`run:${index}`} gap={1.5}>
				{run.map((entry) =>
					entry.type === 'cluster' ? renderWidget(entry, widgets, props) : null,
				)}
				{extra}
			</Controller.Reveal>
		) : (
			<Controller.GroupList key={`run:${index}`}>
				{run.map((entry) =>
					entry.type === 'group' ? (
						<ControllerDefinitionGroup
							key={`group:${entry.group.id}:${entry.group.role}`}
							group={entry.group}
							section={groupSection?.(entry.group)}
							{...props}
						>
							{entry.clusters?.map((cluster) =>
								renderWidget(cluster, widgets, props),
							)}
						</ControllerDefinitionGroup>
					) : null,
				)}
				{extra}
			</Controller.GroupList>
		)
	if (runs.length <= 1) return renderRun(runs[0] ?? [], 0, children)
	return (
		<div data-slot="studio-panel-slot" className="flex flex-col gap-1.5">
			{runs.map((run, index) =>
				renderRun(run, index, index === runs.length - 1 ? children : undefined),
			)}
		</div>
	)
}

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
