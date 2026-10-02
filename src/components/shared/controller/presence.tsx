'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { Children, isValidElement, type ReactNode } from 'react'
import { useMotionTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * 목록에 컨트롤이 새로 생기거나 빠질 때 높이로 펼치고 접는다 — 그룹 접기·펴기와 같은 모양(`MOTION.loose`).
 * 높이가 0에서 자라므로 그 컨트롤을 담은 카드(패널)도 함께 부드럽게 커지고 줄어든다.
 *
 * 🔑 부르는 쪽은 `{조건 && <컨트롤 />}`을 그대로 쓴다 — 직계 자식이 사라지면 여기서 접힌다.
 * 🔴 첫 렌더는 움직이지 않는다 — 패널 렌더로 패널이 통째로 다시 그려질 때 컨트롤이 따로 펼쳐지지 않게.
 * 🔴 간격은 부모 `gap`이 아니라 각 상자의 위 여백(`itemClassName`)이 갖는다 — gap은 높이 0인 상자에도 남아
 *    펼침 처음·끝에 간격만큼 튄다(그룹 본문의 `pt-1.5`와 같은 이유).
 */
export function ControllerPresence({
	itemClassName,
	children,
}: {
	itemClassName?: string
	children: ReactNode
}) {
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('loose')
	return (
		<LazyMotion features={domAnimation}>
			<AnimatePresence initial={false}>
				{Children.toArray(children).map((child, index) => (
					<m.div
						key={isValidElement(child) && child.key != null ? child.key : index}
						data-slot="controller-presence-item"
						className={cn('min-w-0 shrink-0', itemClassName)}
						initial={reducedMotion ? false : { height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0, pointerEvents: 'none' }}
						transition={transition}
						// 펼치는 동안만 잘라 낸다 — 좌우 20px·위아래 2px 여유가 필드 포커스 링을 지킨다.
						style={{ clipPath: 'inset(-2px -20px)' }}
					>
						{child}
					</m.div>
				))}
			</AnimatePresence>
		</LazyMotion>
	)
}
