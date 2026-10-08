'use client'

import type { ReactNode } from 'react'
import type { ControllerGroupSectionProps } from '@/components/shared/controller'
import { Controller } from '@/components/shared/controller'
import {
	type ControllerControlValue,
	type ControllerGroupDefinition,
	type ControllerGroupPresentation,
	type ControllerRuntimeBindings,
	type ControllerValues,
	resolveColorCombinationGroup,
	resolveControlValue,
} from '@/modules/studio-controller/controller-definition'
import { ColorStripGroup } from './color-strip'
import { type ControllerAssetSources, ControllerControlRenderer } from './control'

type ControllerRendererProps = {
	className?: string
	groups: readonly ControllerGroupDefinition[]
	presentation?: { groups: readonly ControllerGroupPresentation[] }
	values: ControllerValues
	bindings?: ControllerRuntimeBindings
	onChange: (controlId: string, value: ControllerControlValue) => void
	assetSources?: ControllerAssetSources
}

/** 직렬화된 Definition과 세션 값을 도메인 지식 없이 Controller primitive로 투영한다. */
export function ControllerRenderer({ className, groups, ...props }: ControllerRendererProps) {
	return (
		<Controller.GroupList className={className}>
			{groups.map((group) => (
				<ControllerDefinitionGroup key={group.id} group={group} {...props} />
			))}
		</Controller.GroupList>
	)
}

export type ControllerDefinitionGroupProps = Omit<
	ControllerRendererProps,
	'className' | 'groups'
> & {
	group: ControllerGroupDefinition
	/** 섹션 활성화 배선(캔버스 포커스 등) — 화면이 그룹마다 붙인다. */
	section?: ControllerGroupSectionProps
	/** 그룹 컨트롤 뒤에 같은 그룹 안으로 잇는 것(패널 슬롯의 그룹 소속 묶음). */
	children?: ReactNode
}

/**
 * 그룹 하나를 제목과 컨트롤로 그린다 — `ControllerRenderer`와 패널 슬롯 렌더러가 같은 결과를 내도록
 * 이 한 곳을 함께 쓴다(docs/10 §3.7).
 */
export function ControllerDefinitionGroup({
	group,
	presentation,
	values,
	bindings,
	onChange,
	assetSources,
	section,
	children,
}: ControllerDefinitionGroupProps) {
	const combination = resolveColorCombinationGroup(group)
	const content = combination ? (
		<ColorStripGroup
			palette={combination.palette}
			colors={combination.colors}
			title={group.title}
			values={values}
			bindings={bindings}
			onChange={onChange}
		/>
	) : (
		group.controls.map((control) => (
			<ControllerControlRenderer
				key={control.id}
				definition={control}
				value={resolveControlValue(control, values)}
				binding={bindings?.[control.id]}
				assetSources={assetSources}
				onChange={(value) => onChange(control.id, value)}
			/>
		))
	)
	return (
		<ControllerGroupRenderer
			definition={group}
			presentation={presentation?.groups.find(({ groupId }) => groupId === group.id)}
			section={section}
		>
			{content}
			{children}
		</ControllerGroupRenderer>
	)
}

/** bespoke slot/feature layout에서도 Definition의 그룹 제목·접힘 정책을 그대로 투영한다. */
export function ControllerGroupRenderer({
	definition,
	presentation,
	children,
	attached = false,
	section,
}: {
	definition: ControllerGroupDefinition
	presentation?: ControllerGroupPresentation
	children: ReactNode
	/**
	 * 앞 컨트롤을 소유하는 접이식 하위 그룹에 12px 간격을 확보한다.
	 */
	attached?: boolean
	/** 섹션 활성화 배선 — `Controller.Group`에 그대로 얹힌다(계약은 그쪽이 갖는다). */
	section?: ControllerGroupSectionProps
}) {
	return (presentation?.collapsible ?? true) ? (
		<Controller.Group
			title={definition.title}
			collapsible
			defaultOpen={presentation?.defaultOpen ?? true}
			attached={attached}
			{...section}
		>
			{children}
		</Controller.Group>
	) : (
		<Controller.Group title={definition.title} collapsible={false} {...section}>
			{children}
		</Controller.Group>
	)
}
