'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useEffect, useRef } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import {
	ControlPanel,
	type ControlPanelComposition,
	type ControlPanelExtras,
} from '@/components/studio/panel/control-panel'
import { PANEL_RENDER, useMotionTransition } from '@/lib/motion'

/**
 * 플로팅 층 — 켜지면 셸의 **모든 것 위에** 새 층을 연다(사용자 2026-10-16).
 * 🔑 공간이 모자라 위에 얹는 것이 아니라 위계다. 아래 층(기본 패널 둘)은 뒤로 밀려 잠기고, 이 층의 내용만 만질 수 있다.
 *    아래 층의 내용을 이 층으로 옮기거나 섞지 않는다 — 이 층에 서는 것은 이 층이 연 일뿐이다.
 */
export type StudioFloating = {
	/** 층의 이름 — 왼쪽 카드와 오른쪽 패널의 접근 이름. */
	label: string
	/** 무엇을 띄웠나 — 바뀌면 층이 다시 들어온다. */
	identity: string
	/** 왼쪽 카드 자리. */
	left: ReactNode
	/** 오른쪽 패널 자리 — 기본 패널과 같은 모양(레일·고정 카드·탭)이다. 없으면 오른쪽은 비운다. */
	panel?: {
		compositions: readonly ControlPanelComposition[]
		extras?: ControlPanelExtras
		target?: string
	}
}

// 아래 층은 놓인 쪽 아래 대각선(16px)으로 밀리며 반투명·흐려진다(blur 4px). 두 쪽이 같은 시간(`MOTION.tight`)으로 움직인다.
const RECEDED = {
	left: { x: -16, y: 16, opacity: 0.5, filter: 'blur(4px)' },
	right: { x: 16, y: 16, opacity: 0.5, filter: 'blur(4px)' },
} as const
// 🔴 끝나면 filter를 걷는다 — blur(0px)도 필터라서 남겨 두면 안쪽 backdrop-blur·fixed 배치가 깨진다.
const IN_PLACE = {
	x: 0,
	y: 0,
	opacity: 1,
	filter: 'blur(0px)',
	transitionEnd: { filter: 'none' },
} as const

/** 아래 층 한 쪽 — 플로팅 층이 열려 있으면 뒤로 밀리고 잠긴다. */
export function StudioFloatingRecede({
	side,
	floating,
	children,
}: {
	side: 'left' | 'right'
	floating: boolean
	children: ReactNode
}) {
	const transition = useMotionTransition('tight')
	return (
		<LazyMotion features={domAnimation}>
			<m.div
				inert={floating}
				className="h-full min-h-0"
				initial={false}
				animate={floating ? RECEDED[side] : IN_PLACE}
				transition={transition}
			>
				{children}
			</m.div>
		</LazyMotion>
	)
}

/** 플로팅 층 자체 — 작업 영역 전체를 덮는 자리에 왼쪽 카드·오른쪽 패널을 기본 패널과 같은 자리에 세운다. */
export function StudioFloatingLayer({ floating }: { floating: StudioFloating | null }) {
	const left = useRef<HTMLElement>(null)
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('tight')
	const identity = floating?.identity
	// 열리면 층으로 포커스를 옮기고, 닫히면 연 자리로 돌려준다.
	useEffect(() => {
		if (!identity) return
		const previous =
			document.activeElement instanceof HTMLElement ? document.activeElement : null
		left.current?.focus()
		return () => previous?.focus()
	}, [identity])
	const enter = (side: 'left' | 'right') => ({
		style: { transformOrigin: PANEL_RENDER[side].origin },
		initial: reducedMotion ? false : PANEL_RENDER[side].hidden,
		animate: PANEL_RENDER[side].shown,
		// 퇴장 중에는 마지막 화면이 남아 있으므로 클릭을 받지 않는다.
		exit: reducedMotion ? undefined : { ...PANEL_RENDER[side].hidden, pointerEvents: 'none' },
		transition,
	})
	return (
		<LazyMotion features={domAnimation}>
			<div
				data-slot="studio-floating-layer"
				className="pointer-events-none absolute inset-0 z-30 flex flex-col lg:flex-row lg:justify-between"
			>
				<AnimatePresence initial={false}>
					{floating && (
						<m.div
							key={`left:${floating.identity}`}
							className="pointer-events-auto min-h-0 lg:h-full lg:w-88"
							{...enter('left')}
						>
							{/* 자산 브라우저는 스크롤 상자 밖(Root)으로 옮겨 붙는다 — 안에 두면 잘린다. */}
							<ControllerBrowser.Root className="min-h-0">
								<section
									ref={left}
									tabIndex={-1}
									aria-label={floating.label}
									className="scrollbar-none flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 outline-none"
								>
									{floating.left}
								</section>
							</ControllerBrowser.Root>
						</m.div>
					)}
				</AnimatePresence>
				<AnimatePresence initial={false}>
					{floating?.panel && (
						<m.div
							key={`right:${floating.identity}`}
							className="pointer-events-auto h-full min-h-0"
							{...enter('right')}
						>
							<ControllerBrowser.Root className="h-full min-h-0">
								<ControlPanel
									label={floating.label}
									compositions={floating.panel.compositions}
									extras={floating.panel.extras}
									target={floating.panel.target}
								/>
							</ControllerBrowser.Root>
						</m.div>
					)}
				</AnimatePresence>
			</div>
		</LazyMotion>
	)
}
