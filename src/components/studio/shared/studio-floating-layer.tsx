'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useEffect, useRef } from 'react'
import { ControllerBrowser } from '@/components/shared/controller'
import type {
	ControlPanelComposition,
	ControlPanelExtras,
} from '@/components/studio/panel/control-panel'
import { PANEL_RENDER, type PanelSide, useMotionTransition } from '@/lib/motion'

/**
 * 플로팅 층 — 켜지면 왼쪽·오른쪽 패널 **위에** 새 층을 연다(사용자 2026-10-16).
 * 🔑 공간이 모자라 위에 얹는 것이 아니라 위계다. 아래 층(왼쪽 카드 묶음·오른쪽 내용 열)은 뒤로 밀려 잠기고, 이 층만 만질 수 있다.
 *    아래 층의 내용을 이 층으로 옮기거나 섞지 않는다 — 이 층에 서는 것은 이 층이 연 일뿐이다.
 * 🔴 레일은 층에 들지 않는다 — 스튜디오 어느 화면에나 늘 있는 하나이고, 맨 위 층의 탭을 가리킬 뿐이다.
 */
export type StudioFloating = {
	/** 층의 이름 — 왼쪽 카드와 오른쪽 열의 접근 이름. */
	label: string
	/** 무엇을 띄웠나 — 바뀌면 층이 다시 들어온다. */
	identity: string
	/** 층 밖의 빈 곳을 누르면 부른다 — 층을 닫는다(사용자 2026-10-16). */
	onDismiss?: () => void
	/** 왼쪽 카드 자리. */
	left: ReactNode
	/** 오른쪽 내용 열 자리 — 기본 패널의 내용 열과 같은 모양(고정 카드·탭)이다(`ControlPanel`의 `floating`). 없으면 비운다. */
	panel?: {
		compositions: readonly ControlPanelComposition[]
		extras?: ControlPanelExtras
		target?: string
	}
}

// 아래 층은 놓인 쪽 아래 대각선(16px)으로 밀리며 반투명·흐려진다(blur 4px). 두 쪽이 같은 시간(`MOTION.tight`)으로 움직인다.
// 🔑 오른쪽은 레일 쪽으로 밀려 레일 아래로 들어간다 — 레일은 배경 없이 그 위에 선다(사용자 2026-10-16).
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

/** 누르면 층을 닫지 않는 자리 — 층의 두 쪽, 레일, 포털로 뜬 고르기 창(셀렉트·대화상자), Manager mode 층. */
const INSIDE_FLOATING =
	'[data-floating-part], [data-slot="studio-rail"], [data-radix-popper-content-wrapper], [role="dialog"], [data-slot="manager-overlay"]'

/** 아래 층 한 쪽 — 플로팅 층이 열려 있으면 뒤로 밀리고 잠긴다. */
export function StudioFloatingRecede({
	side,
	floating,
	children,
}: {
	side: PanelSide
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

/** 층의 한 쪽이 들어오고 나가는 모양 — 공용 패널 렌더(`PANEL_RENDER`). 퇴장 중에는 클릭을 받지 않는다. */
export function floatingEnter(
	side: PanelSide,
	reducedMotion: boolean | null,
	transition: ReturnType<typeof useMotionTransition>,
) {
	return {
		style: { transformOrigin: PANEL_RENDER[side].origin },
		initial: reducedMotion ? false : PANEL_RENDER[side].hidden,
		animate: PANEL_RENDER[side].shown,
		exit: reducedMotion
			? undefined
			: { ...PANEL_RENDER[side].hidden, pointerEvents: 'none' as const },
		transition,
	}
}

/** 플로팅 층의 왼쪽 — 작업 영역 위에 겹쳐 왼쪽 카드 묶음과 같은 자리·폭에 선다. 오른쪽 열은 `ControlPanel`이 레일 옆에 세운다. */
export function StudioFloatingLayer({ floating }: { floating: StudioFloating | null }) {
	const left = useRef<HTMLElement>(null)
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('tight')
	const identity = floating?.identity
	const onDismiss = floating?.onDismiss
	// 층 밖을 누르면 닫는다. 층 안·레일(층의 탭)·떠 있는 고르기 창·Manager mode 층은 밖이 아니다.
	useEffect(() => {
		if (!identity || !onDismiss) return
		const dismiss = (event: PointerEvent) => {
			if (event.target instanceof Element && event.target.closest(INSIDE_FLOATING)) return
			onDismiss()
		}
		document.addEventListener('pointerdown', dismiss, true)
		return () => document.removeEventListener('pointerdown', dismiss, true)
	}, [identity, onDismiss])
	// 열리면 층으로 포커스를 옮기고, 닫히면 연 자리로 돌려준다.
	useEffect(() => {
		if (!identity) return
		const previous =
			document.activeElement instanceof HTMLElement ? document.activeElement : null
		left.current?.focus()
		return () => previous?.focus()
	}, [identity])
	return (
		<LazyMotion features={domAnimation}>
			<div
				data-slot="studio-floating-layer"
				className="pointer-events-none absolute inset-y-0 left-0 z-30 flex"
			>
				<AnimatePresence initial={false}>
					{floating && (
						<m.div
							key={floating.identity}
							data-floating-part=""
							className="pointer-events-auto min-h-0 lg:h-full lg:w-88"
							{...floatingEnter('left', reducedMotion, transition)}
						>
							{/* 자산 브라우저는 카드 묶음 밖(Root)으로 옮겨 붙는다. */}
							<ControllerBrowser.Root className="min-h-0">
								<section
									ref={left}
									tabIndex={-1}
									aria-label={floating.label}
									className="flex flex-col gap-4 p-4 outline-none"
								>
									{floating.left}
								</section>
							</ControllerBrowser.Root>
						</m.div>
					)}
				</AnimatePresence>
			</div>
		</LazyMotion>
	)
}
