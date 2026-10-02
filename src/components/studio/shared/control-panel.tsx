'use client'

import { domAnimation, LazyMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useId, useState } from 'react'
import { ControllerRoot } from '@/components/shared/controller/layout'
import { PANEL_RENDER, useMotionTransition } from '@/lib/motion'
import { PanelRenderTarget } from './panel-render'
import { StudioRail, StudioRailIcon } from './studio-rail'

/**
 * 카드 본문 여백(Figma 529:19501·529:27179). 기본 16px이고, 그룹 제목으로 시작하면 위만 줄인다 —
 * 제목 행(36px)이 자기 여백을 갖고, GroupList는 시작 4px을 더한다. 둘 다 카드 상단에서 8px이 된다.
 */
const CARD_BODY =
	'scrollbar-none min-h-0 overflow-y-auto p-4 has-[>[data-slot=controller-group-list]:first-child]:pt-1 has-[>[data-slot=controller-group]:first-child]:pt-2 has-[>:first-child>[data-slot=controller-group-list]:first-child]:pt-1'

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
	const transition = useMotionTransition('overlay')
	return (
		<LazyMotion features={domAnimation}>
			<aside
				aria-label="편집 도구"
				data-slot="studio-control-panel"
				className="flex h-full min-h-0 w-102 gap-3 p-4"
			>
				{/* 레일은 고정 크롬이라 움직이지 않는다 — 내용 열만 패널 렌더로 다시 그린다. */}
				<PanelRenderTarget side="right" className="flex min-h-0 w-80 flex-col gap-3">
					{fixed && (
						<ControllerRoot
							data-slot="studio-control-fixed"
							className="shrink-0 lg:h-auto lg:max-h-[50%]"
						>
							<div className={CARD_BODY}>{fixed}</div>
						</ControllerRoot>
					)}
					{tabs.map((tab) => (
						// 탭은 상태를 지키려고 모두 띄워 둔다 — 다시 그리지 않고, 보이게 될 때 패널 렌더를 재생한다.
						// 숨을 때는 즉시 숨김 값으로 돌려 두고(첫 렌더는 제자리에서 시작), 나타날 때만 움직인다.
						<m.div
							key={tab.id}
							id={`${id}-${tab.id}`}
							hidden={active !== tab.id}
							className="min-h-0 flex-1"
							initial={false}
							animate={
								active === tab.id
									? PANEL_RENDER.right.shown
									: PANEL_RENDER.right.hidden
							}
							transition={active === tab.id ? transition : { duration: 0 }}
						>
							<div className="flex h-full min-h-0 flex-col gap-3">
								{tab.list && (
									<ControllerRoot
										data-slot="studio-preset-list"
										className="min-h-0 shrink lg:h-auto"
									>
										<div className={CARD_BODY}>{tab.list}</div>
									</ControllerRoot>
								)}
								{tab.content && (
									<ControllerRoot
										className={
											tab.list
												? 'relative min-h-0 shrink-0 lg:h-auto max-h-[60%]'
												: 'relative min-h-0 flex-1 lg:h-auto'
										}
									>
										{/* 끝까지 내리면 마지막 컨트롤이 흐림 위로 올라오도록 아래 여백을 흐림 높이만큼 둔다. */}
										<div className={`${CARD_BODY} pb-16`}>{tab.content}</div>
										{/* Figma 529:19501·529:25146 — 스크롤 본문 아래 64px 흐림. */}
										<div
											aria-hidden="true"
											data-slot="studio-control-fade"
											className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-transparent to-background to-75%"
										/>
									</ControllerRoot>
								)}
							</div>
						</m.div>
					))}
				</PanelRenderTarget>
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
		</LazyMotion>
	)
}
