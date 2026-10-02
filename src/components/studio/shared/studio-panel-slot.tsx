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
	StudioPanelEntry,
} from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerGroupPresentation,
	ControllerRuntimeBindings,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

export type ControllerWidgetProps = {
	cluster: ControllerCluster
	values: ControllerValues
	bindings?: ControllerRuntimeBindings
	onChange: (controlId: string, value: ControllerControlValue) => void
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
						? entry.group.controls.map((control) => (
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
							))
						: [renderWidget(entry.cluster, widgets, props)],
				)}
				{children}
			</Controller.Reveal>
		)
	return (
		<Controller.GroupList>
			{entries.map((entry) => {
				if (entry.type === 'group')
					return (
						<ControllerDefinitionGroup
							key={`group:${entry.group.id}`}
							group={entry.group}
							section={groupSection?.(entry.group)}
							{...props}
						/>
					)
				return renderWidget(entry.cluster, widgets, props)
			})}
			{children}
		</Controller.GroupList>
	)
}

function renderWidget(
	cluster: ControllerCluster,
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
			values={props.values}
			bindings={props.bindings}
			onChange={props.onChange}
		/>
	)
}
