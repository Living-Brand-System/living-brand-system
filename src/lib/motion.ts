'use client'

import { type Transition, useReducedMotion } from 'motion/react'

/**
 * 스튜디오·컨트롤러 모션의 단일 출처 — 컴포넌트에 spring 값을 직접 쓰지 않는다.
 * spring은 쓰임이 가장 많던 값(bounce 0.15), 시간형은 tight 150ms·loose 250ms 두 단계다(2026-10-02). CSS 쪽 짝은 `theme.css`의 `--motion-*`다.
 * visualDuration은 눈에 보이는 도착 시간이고, 남는 bounce는 그 뒤에 잦아든다.
 */
// CSS `ease`. 자산 브라우저의 tw-animate 기본 커브와 같다 — tight·loose가 함께 쓴다.
const EASE = [0.25, 0.1, 0.25, 1] as const

export const MOTION = {
	/** 선택을 따라 미끄러지는 표시(세그먼트 pill). */
	indicator: { type: 'spring', visualDuration: 0.2, bounce: 0.15 },
	/** 컨트롤 자체의 움직임(바 등장, 슬라이더 채움). */
	control: { type: 'spring', visualDuration: 0.25, bounce: 0.15 },
	/**
	 * 빠르게 붙는 전환 150ms — 패널 렌더, 겹쳐 뜨는 패널의 열림·닫힘. 자산 브라우저(`ControllerBrowser.Panel`)의
	 * tw-animate CSS와 같은 값이다. 둘 중 하나를 바꾸면 다른 쪽도 함께 바꾼다.
	 */
	tight: { duration: 0.15, ease: EASE },
	/** 크기가 자라는 전환 250ms — 그룹 접기·펴기, 컨트롤이 새로 생기거나 빠지며 패널 높이가 바뀌는 것. */
	loose: { duration: 0.25, ease: EASE },
} as const satisfies Record<string, Transition>

export type MotionPreset = keyof typeof MOTION

/**
 * 패널 렌더 — 패널 내용이 새로 그려질 때(레일 탭·레이어·탭 내용 전환, 겹치는 편집 패널 진입)의
 * 단일 모양. 시간은 `MOTION.tight`다. 패널은 **자기가 놓인 쪽**에서 들어온다 —
 * 왼쪽 패널은 왼쪽 16px, 오른쪽 패널은 오른쪽 16px(자산 브라우저의 열림과 같은 거리).
 * 커지는 기준점은 위 모서리다 — 카드와 레일이 위에 붙어 있다(오른쪽 패널은 레일이 있는 위 오른쪽).
 * 🔴 첫 진입에는 걸지 않는다(사용자 결정, 2026-10-02) — 상호작용으로 생긴 전환에만 쓴다.
 */
const PANEL_SHOWN = { x: 0, scale: 1, opacity: 1 } as const
export const PANEL_RENDER = {
	left: { hidden: { x: -16, scale: 0.95, opacity: 0 }, shown: PANEL_SHOWN, origin: 'top left' },
	right: { hidden: { x: 16, scale: 0.95, opacity: 0 }, shown: PANEL_SHOWN, origin: 'top right' },
} as const

export type PanelSide = keyof typeof PANEL_RENDER

const INSTANT = { duration: 0 } as const satisfies Transition

/** 프리셋 전환을 돌려준다. 모션 감소 설정이면 즉시 전환이다 — 소유 컴포넌트 안에서 부른다. */
export function useMotionTransition(preset: MotionPreset): Transition {
	return useReducedMotion() ? INSTANT : MOTION[preset]
}
