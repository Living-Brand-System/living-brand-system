'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useId, useState } from 'react'
import { ControllerPresence, ControllerRoot } from '@/components/shared/controller'
import {
	floatingEnter,
	StudioFloatingRecede,
} from '@/components/studio/shared/studio-floating-layer'
import { PANEL_RENDER, useMotionTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'
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
 * 🔴 스크롤하지 않는다 — 패널은 내용 높이이고, 열을 넘는 구성은 코드가 아니라 UI/UX가 정한다(docs/features/studio.md 패널 높이 규칙).
 */
const CARD_BODY =
	'p-4 has-[>[data-slot=controller-group-list]:first-child]:pt-1 has-[>[data-slot=controller-group]:first-child]:pt-2 has-[>:first-child>[data-slot=controller-group-list]:first-child]:pt-1'

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
	/**
	 * 그릴 컴포지션 — **자리마다 앞쪽부터 먼저 채운 것이 그린다.** 템플릿 배경은 [대상 자기 것, 배경 공통(Dimming·색)].
	 * 우선순위는 이 배열 순서뿐이다.
	 */
	compositions?: readonly ControlPanelComposition[]
	/**
	 * 컴포지션 슬롯 뒤에 같은 목록으로 이어 붙이는 계약 밖의 것(생성 버튼·오류·안내).
	 * 계약 슬롯을 대체하지 않는다 — 간격과 펼침이 이어진다.
	 */
	extras?: ControlPanelExtras
	/**
	 * 지금 무엇을 편집하나(템플릿의 선택 레이어) — 바뀌면 탭 선택이 Basic으로 돌아간다.
	 * 패널 자체는 다시 마운트하지 않는다(레일·고정 카드가 그대로 남는다).
	 */
	target?: string
	/** 레일 맨 아래에 붙는 화면별 버튼(템플릿의 Manager mode 등) — 패널 탭과 상관없다. */
	railFooter?: ReactNode
	/**
	 * 플로팅 층의 오른쪽 패널(docs/10 「플로팅 층」) — 있으면 내용 열이 뒤로 밀려 잠기고 그 위에 이 열이 선다.
	 * 🔴 레일은 덮지 않는다 — 레일은 스튜디오 어느 화면에나 늘 있는 하나다. 레일 탭은 맨 위 층의 것을 가리킨다.
	 */
	floating?: {
		/** 층의 접근 이름. */
		label: string
		/** 무엇을 띄웠나 — 바뀌면 층이 다시 들어온다. */
		identity: string
		compositions: readonly ControlPanelComposition[]
		extras?: ControlPanelExtras
		target?: string
	} | null
}

/**
 * 고정 영역은 탭 스크롤 밖에, 목록과 조정 내용은 각각 남은 높이 안에 둔다.
 * 고정 영역은 최대 절반 높이까지 자라고 넘치면 자체 스크롤한다.
 */
export function ControlPanel({ compositions = [], ...props }: ControlPanelProps) {
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
	target,
	railFooter,
	floating = null,
}: ControlPanelProps & {
	compositions: readonly ControlPanelComposition[]
}) {
	const base = usePanelColumn(compositions, extras, target)
	const top = usePanelColumn(floating?.compositions ?? [], floating?.extras, floating?.target)
	// 레일은 하나뿐이다 — 맨 위 층의 탭을 가리킨다.
	const rail = floating ? top : base
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('tight')
	return (
		<LazyMotion features={domAnimation}>
			<aside
				aria-label="편집 도구"
				data-slot="studio-control-panel"
				className="flex h-full min-h-0 w-102 gap-3 p-4"
			>
				{/* 레일은 고정 크롬이라 움직이지 않는다 — 플로팅 층도 레일을 덮지 않고 내용 열만 덮는다(사용자 2026-10-16). */}
				<div data-slot="studio-control-columns" className="relative flex min-h-0 w-80">
					<StudioFloatingRecede side="right" floating={Boolean(floating)}>
						<PanelColumn column={base} transition={transition} />
					</StudioFloatingRecede>
					<AnimatePresence initial={false}>
						{floating && (
							<m.aside
								key={floating.identity}
								aria-label={floating.label}
								data-slot="studio-floating-panel"
								className="absolute inset-x-0 top-0 z-30"
								{...floatingEnter('right', reducedMotion, transition)}
							>
								{/* 층마다 패널 렌더 기록이 따로다 — 아래 층의 기록을 건드리지 않는다. */}
								<PanelRenderScope>
									<PanelColumn column={top} transition={transition} />
								</PanelRenderScope>
							</m.aside>
						)}
					</AnimatePresence>
				</div>
				<StudioRail>
					{rail.tabs.length === 0 && (
						<StudioRailIcon icon="basic" label="Basic" state="disabled" />
					)}
					{rail.tabs.map(({ id: tabId, label }) => (
						<StudioRailIcon
							key={tabId}
							icon={tabId}
							label={label}
							state={rail.active === tabId ? 'active' : 'idle'}
							aria-controls={`${rail.id}-${tabId}`}
							onClick={() => rail.select(tabId)}
						/>
					))}
					{railFooter && (
						<div
							data-slot="studio-rail-footer"
							className="mt-auto flex flex-col gap-1.5"
						>
							{railFooter}
						</div>
					)}
				</StudioRail>
			</aside>
		</LazyMotion>
	)
}

/** 한 층의 내용 열(고정 카드·탭 본문)이 그릴 것 — 탭 선택도 층마다 따로다. */
function usePanelColumn(
	compositions: readonly ControlPanelComposition[],
	extras: ControlPanelExtras | undefined,
	target: string | undefined,
) {
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
	// 탭 선택은 편집 대상마다다 — 대상이 바뀌면 Basic부터 보인다(패널은 다시 마운트하지 않는다).
	const [choice, setChoice] = useState({ target, tab: 'basic' })
	const selected = choice.target === target ? choice.tab : 'basic'
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
	const id = useId()
	return {
		id,
		fixed: slot('fixed'),
		fixedKey: signature(['fixed']),
		contentKey: signature(['basicPresets', 'basic', 'presets', 'adjustment']),
		tabs,
		active: tabs.find((tab) => tab.id === selected)?.id ?? tabs[0]?.id,
		select: (tab: string) => setChoice({ target, tab }),
	}
}

/**
 * 내용 열 — 고정 영역과 내용 영역은 바뀌는 때가 달라 따로 다시 그린다(내용만 바뀌었는데 그대로인 위 카드가 움직이지 않게).
 * 🔴 모든 패널은 내용 높이다(height:auto) — 남은 높이를 채우거나 열 안에서 스크롤하는 패널은 두지 않는다(사용자 2026-10-16).
 */
function PanelColumn({
	column: { id, fixed, fixedKey, contentKey, tabs, active },
	transition,
}: {
	column: ReturnType<typeof usePanelColumn>
	transition: ReturnType<typeof useMotionTransition>
}) {
	return (
		<div className="flex w-80 flex-col gap-3">
			{fixed && (
				<PanelRenderTarget side="right" region="fixed" renderKey={fixedKey}>
					<ControllerRoot data-slot="studio-control-fixed" className="lg:h-auto">
						<div className={CARD_BODY}>{fixed}</div>
					</ControllerRoot>
				</PanelRenderTarget>
			)}
			<PanelRenderTarget side="right" region="content" renderKey={contentKey}>
				{tabs.map((tab) => (
					// 탭은 상태를 지키려고 모두 띄워 둔다 — 다시 그리지 않고, 보이게 될 때 패널 렌더를 재생한다.
					// 숨을 때는 즉시 숨김 값으로 돌려 두고(첫 렌더는 제자리에서 시작), 나타날 때만 움직인다.
					<m.div
						key={tab.id}
						id={`${id}-${tab.id}`}
						hidden={active !== tab.id}
						style={{ transformOrigin: PANEL_RENDER.right.origin }}
						initial={false}
						animate={
							active === tab.id ? PANEL_RENDER.right.shown : PANEL_RENDER.right.hidden
						}
						transition={active === tab.id ? transition : { duration: 0 }}
					>
						{/* 목록 카드도 조건으로 생기고 빠진다(Fluted Style) — 다른 조건부 행과 같은 높이 펼침이다.
						    카드 사이 간격은 부모 gap이 아니라 펼치는 상자의 아래 여백이 갖는다(높이 0일 때 남지 않게). */}
						<ControllerPresence itemClassName="pb-3">
							{tab.list && (
								<ControllerRoot
									key="list"
									data-slot="studio-preset-list"
									className="lg:h-auto"
								>
									<div className={CARD_BODY}>{tab.list}</div>
								</ControllerRoot>
							)}
						</ControllerPresence>
						{tab.content && (
							<ControllerRoot className="lg:h-auto">
								<div className={CARD_BODY}>{tab.content}</div>
							</ControllerRoot>
						)}
					</m.div>
				))}
			</PanelRenderTarget>
		</div>
	)
}
