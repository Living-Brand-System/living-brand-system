'use client'

import { domAnimation, LazyMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useId, useState } from 'react'
import { ControllerRoot } from '@/components/shared/controller/layout'
import { PANEL_RENDER, useMotionTransition } from '@/lib/motion'
import {
	controllerStructureSignature,
	type StudioPanelEntry,
	type StudioPanelSlot,
} from '@/modules/studio-controller/controller-composition'
import { PanelRenderScope, PanelRenderTarget, useHasPanelRenderScope } from './panel-render'
import { StudioPanelSlot as Slot, type StudioPanelSlotRenderProps } from './studio-panel-slot'
import { StudioRail, StudioRailIcon } from './studio-rail'

/**
 * 카드 본문 여백(Figma 529:19501·529:27179). 기본 16px이고, 그룹 제목으로 시작하면 위만 줄인다 —
 * 제목 행(36px)이 자기 여백을 갖고, GroupList는 시작 4px을 더한다. 둘 다 카드 상단에서 8px이 된다.
 */
const CARD_BODY =
	'scrollbar-none min-h-0 overflow-y-auto p-4 has-[>[data-slot=controller-group-list]:first-child]:pt-1 has-[>[data-slot=controller-group]:first-child]:pt-2 has-[>:first-child>[data-slot=controller-group-list]:first-child]:pt-1'

/**
 * 패널 컴포지션 입력(docs/10 §3.7) — 화면이 `arrangeStudioPanel`로 역할을 슬롯에 놓은 결과와 그릴 값.
 * 슬롯은 같은 자리의 JSX 입력이 없을 때만 쓴다(이행 기간 동안 두 길이 함께 돈다).
 */
export type ControlPanelComposition = StudioPanelSlotRenderProps & {
	slots: Readonly<Record<StudioPanelSlot, readonly StudioPanelEntry[]>>
}

type ControlPanelProps = {
	fixed?: ReactNode
	basic?: ReactNode
	presets?: ReactNode
	adjustment?: ReactNode
	basicPresets?: ReactNode
	composition?: ControlPanelComposition
}

/**
 * 고정 영역은 탭 스크롤 밖에, 목록과 조정 내용은 각각 남은 높이 안에 둔다.
 * 고정 영역은 최대 절반 높이까지 자라고 넘치면 자체 스크롤한다.
 */
export function ControlPanel(props: ControlPanelProps) {
	// 컴포지션으로 그리면 영역 키를 스스로 안다 — 위에 범위가 없으면 직접 깔아 켜짐·마지막 키를 갖게 한다.
	const hasScope = useHasPanelRenderScope()
	if (props.composition && !hasScope)
		return (
			<PanelRenderScope>
				<ControlPanelView {...props} />
			</PanelRenderScope>
		)
	return <ControlPanelView {...props} />
}

function ControlPanelView({ composition, ...explicit }: ControlPanelProps) {
	const slot = (name: Exclude<StudioPanelSlot, 'settings'>) => {
		if (!composition) return undefined
		const { slots, ...render } = composition
		return slots[name].length ? <Slot entries={slots[name]} {...render} /> : undefined
	}
	const fixed = explicit.fixed ?? slot('fixed')
	const basic = explicit.basic ?? slot('basic')
	const presets = explicit.presets ?? slot('presets')
	const adjustment = explicit.adjustment ?? slot('adjustment')
	const basicPresets = explicit.basicPresets
	// 구조 서명 — 보이는 것이 바뀐 영역만 다시 그린다. JSX로 꽂은 영역은 범위의 키를 따른다.
	const signature = (names: readonly StudioPanelSlot[]) =>
		composition
			? names.map((name) => controllerStructureSignature(composition.slots[name])).join('/')
			: undefined
	const fixedKey = explicit.fixed === undefined ? signature(['fixed']) : undefined
	const contentKey =
		explicit.basic === undefined &&
		explicit.presets === undefined &&
		explicit.adjustment === undefined
			? signature(['basic', 'presets', 'adjustment'])
			: undefined
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
	const transition = useMotionTransition('tight')
	return (
		<LazyMotion features={domAnimation}>
			<aside
				aria-label="편집 도구"
				data-slot="studio-control-panel"
				className="flex h-full min-h-0 w-102 gap-3 p-4"
			>
				{/* 레일은 고정 크롬이라 움직이지 않는다. 고정 영역과 내용 영역은 바뀌는 때가 달라
				    따로 다시 그린다 — 내용만 바뀌었는데 그대로인 위 카드가 움직이지 않게. */}
				<div className="flex min-h-0 w-80 flex-col gap-3">
					{fixed && (
						<PanelRenderTarget
							side="right"
							region="fixed"
							renderKey={fixedKey}
							className="flex min-h-0 shrink-0 flex-col lg:max-h-[50%]"
						>
							<ControllerRoot data-slot="studio-control-fixed" className="lg:h-auto">
								<div className={CARD_BODY}>{fixed}</div>
							</ControllerRoot>
						</PanelRenderTarget>
					)}
					<PanelRenderTarget
						side="right"
						region="content"
						renderKey={contentKey}
						className="flex min-h-0 flex-1 flex-col"
					>
						{tabs.map((tab) => (
							// 탭은 상태를 지키려고 모두 띄워 둔다 — 다시 그리지 않고, 보이게 될 때 패널 렌더를 재생한다.
							// 숨을 때는 즉시 숨김 값으로 돌려 두고(첫 렌더는 제자리에서 시작), 나타날 때만 움직인다.
							<m.div
								key={tab.id}
								id={`${id}-${tab.id}`}
								hidden={active !== tab.id}
								className="min-h-0 flex-1"
								style={{ transformOrigin: PANEL_RENDER.right.origin }}
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
											<div className={`${CARD_BODY} pb-16`}>
												{tab.content}
											</div>
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
		</LazyMotion>
	)
}
