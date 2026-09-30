'use client'

import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * 화면 아래에 떠 있는 컨트롤 바 — Figma의 `Helper`(가이드라인)·`Controller API`의 하단 바(스튜디오).
 *
 * 🔑 **표면은 하나다.** 한때 `Fixed`/`Sticky` 두 컴포넌트였는데, 접미사는 "붙는 방식만 다르다"고
 *    약속해 놓고 실제로는 모서리·패딩·면·모바일·pointer-events·모션까지 6가지가 갈라져 있었다
 *    (2026-08-18에 합침). 이름이 거짓말을 하면 다음 사람이 둘 중 아무거나 고른다.
 *
 * 이제 다른 것은 `placement` 하나뿐이고, **둘 다 자기 위치를 자기가 잡는다.**
 */

/** 🔴 둘 다 `bottom-10`이다. 한쪽만 위치를 갖던 비대칭이 헷갈림의 원인이었다. */
const PLACEMENT = {
	/** 스크롤하지 않는 면(캔버스) 위. 🔴 부모가 `relative`여야 한다. */
	canvas: '-translate-x-1/2 absolute bottom-10 left-1/2 z-10',
	/** 스크롤을 따라 내려온다. 🔴 담는 상자가 세로로 꽉 찬 flex 열이어야 `mt-auto`가 바닥을 잡는다 —
	 *  sticky는 지정한 모서리 **쪽으로만** 당기므로, 상자 맨 위에 있으면 아무 일도 일어나지 않는다. */
	scroll: 'sticky bottom-10 mt-auto',
} as const

export type ControllerBarPlacement = keyof typeof PLACEMENT

export function ControllerBar({
	placement,
	'aria-label': ariaLabel,
	className,
	children,
}: {
	placement: ControllerBarPlacement
	/**
	 * 바가 자기 대상에서 DOM상 떨어져 있을 때(portal) 어느 화면의 컨트롤인지 알려주는 유일한 단서다.
	 * 🔴 이름 없는 `region`은 랜드마크로 노출되지 않으므로, 안 주면 그냥 평범한 상자다.
	 */
	'aria-label'?: string
	className?: string
	children: ReactNode
}) {
	const reducedMotion = useReducedMotion()

	return (
		<LazyMotion features={domAnimation}>
			<m.section
				data-slot="controller-bar"
				data-placement={placement}
				aria-label={ariaLabel}
				// 나타났다 사라지고 내용이 통째로 바뀌므로, 아래에서 짧게 올라오는 동작이
				// "다른 바로 갈아탔다"를 말해 준다. 모션 감소에서는 처음부터 제자리다.
				initial={reducedMotion ? false : { opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				// 킷의 다른 모션과 같은 스프링이다(range·segmented) — 한 화면에서 감속이 갈리면 안 된다.
				transition={
					reducedMotion
						? { duration: 0 }
						: { type: 'spring', visualDuration: 0.25, bounce: 0.15 }
				}
				className={cn(
					'pointer-events-auto hidden items-center gap-2 rounded-xl bg-background p-3 shadow-lg lg:flex',
					PLACEMENT[placement],
					className,
				)}
			>
				{children}
			</m.section>
		</LazyMotion>
	)
}
