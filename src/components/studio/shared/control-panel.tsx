'use client'

import { domAnimation, LazyMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { createContext, type ReactNode, useContext, useId, useState } from 'react'
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
 * 패널에 무엇이 서는지는 이것뿐이다 — 화면이 자리마다 JSX를 꽂는 길은 없다.
 */
export type ControlPanelComposition = StudioPanelSlotRenderProps & {
	slots: Readonly<Record<StudioPanelSlot, readonly StudioPanelEntry[]>>
}

/** 컴포지션 슬롯 뒤에 잇는 계약 밖의 것(생성 버튼·오류·안내) — 자리마다 하나. */
export type ControlPanelExtras = Partial<Record<Exclude<StudioPanelSlot, 'settings'>, ReactNode>>

type ControlPanelProps = {
	composition?: ControlPanelComposition
	/**
	 * 컴포지션 슬롯 뒤에 같은 목록으로 이어 붙이는 계약 밖의 것(생성 버튼·오류·안내).
	 * 계약 슬롯을 대체하지 않는다 — 간격과 펼침이 이어진다.
	 */
	extras?: ControlPanelExtras
}

const ControlPanelCompositionContext = createContext<ControlPanelComposition | null>(null)

/**
 * 패널 주인(스튜디오 셸)이 안쪽 화면에 컴포지션을 공급한다 — 안쪽 화면(이미지·그래픽 컨트롤)이 몇 겹이든
 * prop을 뚫지 않고 `ControlPanel`이 읽는다. 배치는 패널이 소유한다는 계약(docs/10 §3.7)의 배선이다.
 */
export function ControlPanelCompositionProvider({
	value,
	children,
}: {
	value: ControlPanelComposition | null
	children: ReactNode
}) {
	return (
		<ControlPanelCompositionContext.Provider value={value}>
			{children}
		</ControlPanelCompositionContext.Provider>
	)
}

/**
 * 고정 영역은 탭 스크롤 밖에, 목록과 조정 내용은 각각 남은 높이 안에 둔다.
 * 고정 영역은 최대 절반 높이까지 자라고 넘치면 자체 스크롤한다.
 */
export function ControlPanel(props: ControlPanelProps) {
	const provided = useContext(ControlPanelCompositionContext)
	// 자리마다 먼저 채운 쪽이 그린다 — 화면 자기 컴포지션(그래픽 편집) 다음 공급받은 것(템플릿 배경의 Dimming).
	const compositions = [props.composition, provided].filter(
		(item): item is ControlPanelComposition => Boolean(item),
	)
	// 컴포지션으로 그리면 영역 키를 스스로 안다 — 위에 범위가 없으면 직접 깔아 켜짐·마지막 키를 갖게 한다.
	const hasScope = useHasPanelRenderScope()
	if (compositions.length && !hasScope)
		return (
			<PanelRenderScope>
				<ControlPanelView {...props} compositions={compositions} />
			</PanelRenderScope>
		)
	return <ControlPanelView {...props} compositions={compositions} />
}

function ControlPanelView({
	compositions,
	extras,
}: Omit<ControlPanelProps, 'composition'> & {
	compositions: readonly ControlPanelComposition[]
}) {
	const pick = (name: StudioPanelSlot) =>
		compositions.find((item) => item.slots[name].length) ?? compositions[0]
	const slot = (name: Exclude<StudioPanelSlot, 'settings'>) => {
		const extra = extras?.[name]
		const composition = pick(name)
		if (!composition) return extra || undefined
		const { slots, ...render } = composition
		return slots[name].length || extra ? (
			<Slot entries={slots[name]} {...render}>
				{extra}
			</Slot>
		) : undefined
	}
	const fixed = slot('fixed')
	const basic = slot('basic')
	const presets = slot('presets')
	const adjustment = slot('adjustment')
	const basicPresets = slot('basicPresets')
	// 구조 서명 — 보이는 것이 바뀐 영역만 다시 그린다. 손으로 정한 키는 없다.
	const signature = (names: readonly StudioPanelSlot[]) =>
		compositions.length
			? names
					.map((name) => controllerStructureSignature(pick(name)?.slots[name] ?? []))
					.join('/')
			: undefined
	const fixedKey = signature(['fixed'])
	const contentKey = signature(['basicPresets', 'basic', 'presets', 'adjustment'])
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
