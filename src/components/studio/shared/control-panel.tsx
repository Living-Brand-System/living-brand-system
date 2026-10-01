'use client'

import { type ReactNode, useId, useState } from 'react'
import { ControllerRoot } from '@/components/shared/controller/layout'
import { StudioRail, StudioRailIcon } from './studio-rail'

/**
 * 고정 영역은 탭 스크롤 밖에, 목록과 조정 내용은 각각 남은 높이 안에 둔다.
 * 고정 영역은 최대 절반 높이까지 자라고 넘치면 자체 스크롤한다.
 */
export function ControlPanel({
	fixed,
	basic,
	presets,
	adjustment,
	basicPresets,
}: {
	fixed?: ReactNode
	basic?: ReactNode
	presets?: ReactNode
	adjustment?: ReactNode
	basicPresets?: ReactNode
}) {
	const [selected, setSelected] = useState('basic')
	const id = useId()
	const tabs = [
		{ id: 'basic' as const, label: 'Basic', content: basic, list: basicPresets },
		{ id: 'presets' as const, label: 'Presets', content: presets, list: undefined },
		{
			id: 'adjustment' as const,
			label: 'Adjustment',
			content: adjustment,
			list: undefined,
		},
	].filter((tab) => tab.content || tab.list)
	const active = tabs.find((tab) => tab.id === selected)?.id ?? tabs[0]?.id
	return (
		<aside
			aria-label="편집 도구"
			data-slot="studio-control-panel"
			className="flex h-full min-h-0 w-102 gap-3 p-4"
		>
			<div className="flex min-h-0 w-80 flex-col gap-3">
				{fixed && (
					<ControllerRoot
						data-slot="studio-control-fixed"
						className="shrink-0 lg:h-auto lg:max-h-[50%]"
					>
						<div className="scrollbar-none min-h-0 overflow-y-auto p-4">{fixed}</div>
					</ControllerRoot>
				)}
				{tabs.map((tab) => (
					<div
						key={tab.id}
						id={`${id}-${tab.id}`}
						hidden={active !== tab.id}
						className="min-h-0 flex-1"
					>
						<div className="flex h-full min-h-0 flex-col gap-3">
							{tab.list && (
								<ControllerRoot
									data-slot="studio-preset-list"
									className="min-h-0 shrink lg:h-auto"
								>
									<div className="scrollbar-none min-h-0 overflow-y-auto p-4">
										{tab.list}
									</div>
								</ControllerRoot>
							)}
							{tab.content && (
								<ControllerRoot
									className={
										tab.list
											? 'min-h-0 shrink-0 lg:h-auto max-h-[60%]'
											: 'min-h-0 flex-1 lg:h-auto'
									}
								>
									<div className="scrollbar-none min-h-0 overflow-y-auto">
										{tab.content}
									</div>
								</ControllerRoot>
							)}
						</div>
					</div>
				))}
			</div>
			<StudioRail>
				{tabs.length === 0 && (
					<StudioRailIcon icon="basic" label="Basic" state="disabled" />
				)}
				{tabs.map(({ id: tabId, label }) => (
					<StudioRailIcon
						key={tabId}
						icon={tabId}
						label={label}
						state={active === tabId ? 'active' : 'idle'}
						aria-controls={`${id}-${tabId}`}
						onClick={() => setSelected(tabId)}
					/>
				))}
			</StudioRail>
		</aside>
	)
}
