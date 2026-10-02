'use client'

import { type Transition, useReducedMotion } from 'motion/react'

/**
 * 스튜디오·컨트롤러 모션의 단일 출처 — 컴포넌트에 spring 값을 직접 쓰지 않는다.
 * 값은 쓰임이 가장 많던 것으로 묶었고 bounce는 0.15 하나다(2026-10-02). CSS 쪽 짝은 `theme.css`의 `--motion-*`다.
 * visualDuration은 눈에 보이는 도착 시간이고, 남는 bounce는 그 뒤에 잦아든다.
 */
export const MOTION = {
	/** 선택을 따라 미끄러지는 표시(세그먼트 pill). */
	indicator: { type: 'spring', visualDuration: 0.2, bounce: 0.15 },
	/** 컨트롤 자체의 움직임(바 등장, 슬라이더 채움). */
	control: { type: 'spring', visualDuration: 0.25, bounce: 0.15 },
	/** 접기·펴기(그룹 본문 높이와 chevron). */
	disclosure: { type: 'spring', visualDuration: 0.35, bounce: 0.15 },
	/** 패널 진입·이탈과 탭 내용 교체. */
	panel: { type: 'spring', visualDuration: 0.15, bounce: 0.15 },
} as const satisfies Record<string, Transition>

export type MotionPreset = keyof typeof MOTION

const INSTANT = { duration: 0 } as const satisfies Transition

/** 프리셋 전환을 돌려준다. 모션 감소 설정이면 즉시 전환이다 — 소유 컴포넌트 안에서 부른다. */
export function useMotionTransition(preset: MotionPreset): Transition {
	return useReducedMotion() ? INSTANT : MOTION[preset]
}
