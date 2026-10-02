'use client'

import type { ReactNode } from 'react'
import { Controller } from '@/components/shared/controller'
import {
	type ControllerAssetSources,
	ControllerDefinitionGroup,
} from '@/components/shared/controller-renderer'
import type {
	ControllerCluster,
	ControllerWidget,
	StudioPanelEntry,
} from '@/modules/studio-controller/controller-composition'
import type {
	ControllerControlValue,
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
	...props
}: StudioPanelSlotRenderProps & { entries: readonly StudioPanelEntry[] }) {
	return (
		<Controller.GroupList>
			{entries.map((entry) => {
				if (entry.type === 'group')
					return (
						<ControllerDefinitionGroup
							key={`group:${entry.group.id}`}
							group={entry.group}
							{...props}
						/>
					)
				const Widget = widgets?.[entry.cluster.widget]
				if (!Widget) {
					if (process.env.NODE_ENV !== 'production')
						console.warn(
							`등록되지 않은 묶음 위젯입니다: ${entry.cluster.widget} (${entry.cluster.id})`,
						)
					return null
				}
				return (
					<Widget
						key={`cluster:${entry.cluster.id}`}
						cluster={entry.cluster}
						values={props.values}
						bindings={props.bindings}
						onChange={props.onChange}
					/>
				)
			})}
		</Controller.GroupList>
	)
}
