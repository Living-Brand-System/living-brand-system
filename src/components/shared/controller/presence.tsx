'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import { useMotionTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * 목록에 컨트롤이 새로 생기거나 빠질 때 높이로 펼치고 접는다 — 그룹 접기·펴기와 같은 모양(`MOTION.loose`).
 * 높이가 0에서 자라므로 그 컨트롤을 담은 카드(패널)도 함께 부드럽게 커지고 줄어든다.
 *
 * 🔑 부르는 쪽은 `{조건 && <컨트롤 />}`을 그대로 쓴다 — 직계 자식이 사라지면 여기서 접힌다.
 *    Fragment(`<>…</>`) 안쪽도 하나씩 본다. 컴포넌트 안쪽은 볼 수 없으니, 조건부 행을 모으는 컴포넌트는
 *    그 안에서 `Controller.Reveal`로 감싼다. 삼항으로 갈아끼우는 곳은 각 갈래에 `key`를 주면 접고 펼친다.
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
				{flatten(children).map(({ key, child }) => (
					<m.div
						key={key}
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

/** Fragment를 풀어 직계 자식 목록으로 만든다. 키는 Fragment 경로를 앞에 붙여 형제끼리 겹치지 않게 한다. */
function flatten(children: ReactNode, prefix = ''): { key: string; child: ReactNode }[] {
	return Children.toArray(children).flatMap((child, index) => {
		const key = `${prefix}${isValidElement(child) && child.key != null ? child.key : index}`
		if (isValidElement(child) && child.type === Fragment)
			return flatten(
				(child as ReactElement<{ children?: ReactNode }>).props.children,
				`${key}/`,
			)
		return [{ key, child }]
	})
}

// 정적 클래스 — Tailwind가 문자열을 그대로 찾아야 한다. [목록 끌어올림, 상자 위 여백]
const STACK_GAP = {
	1: ['-mt-1', 'pt-1'],
	1.5: ['-mt-1.5', 'pt-1.5'],
	2: ['-mt-2', 'pt-2'],
	3: ['-mt-3', 'pt-3'],
	4: ['-mt-4', 'pt-4'],
} as const

/**
 * 컨트롤을 세로로 쌓는 공용 자리 — 그룹 밖에서 조건부 컨트롤을 모을 때 쓴다(`ControllerPresence`와 같은 펼침).
 * `gap`은 각 상자의 위 여백으로 바뀌고, 목록을 그만큼 끌어올려 첫 상자의 시작은 그대로다.
 */
export function ControllerReveal({
	gap = 1.5,
	className,
	children,
}: {
	gap?: keyof typeof STACK_GAP
	className?: string
	children: ReactNode
}) {
	const [pull, pad] = STACK_GAP[gap]
	return (
		<div data-slot="controller-reveal" className={cn('flex min-w-0 flex-col', pull, className)}>
			<ControllerPresence itemClassName={pad}>{children}</ControllerPresence>
		</div>
	)
}
