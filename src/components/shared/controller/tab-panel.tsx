'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import type * as React from 'react'
import { cn } from '@/lib/utils'

type ControllerTabPanelProps = {
	/** 활성 탭 식별자 — 바뀔 때마다 이전 콘텐츠가 빠지고 새 콘텐츠가 들어온다. */
	tabKey: string
	className?: string
	children: React.ReactNode
}

/**
 * 세그먼트(탭) 전환에 따르는 콘텐츠 스왑 — dialkit 드롭다운 전환(fade + y + scale)을 옮겼다.
 * mode="wait"라 이전 콘텐츠가 빠진 뒤 새 콘텐츠가 들어와 높이가 겹치지 않는다.
 */
export function ControllerTabPanel({ tabKey, className, children }: ControllerTabPanelProps) {
	const reducedMotion = useReducedMotion()

	return (
		<LazyMotion features={domAnimation}>
			<AnimatePresence mode="wait" initial={false}>
				<m.div
					key={tabKey}
					data-slot="controller-tab-panel"
					className={cn('flex flex-col gap-1.5', className)}
					initial={reducedMotion ? false : { opacity: 0, y: 4, scale: 0.97 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={
						reducedMotion
							? undefined
							: { opacity: 0, y: 4, scale: 0.97, pointerEvents: 'none' }
					}
					transition={{ duration: 0.15, ease: 'easeOut' }}
				>
					{children}
				</m.div>
			</AnimatePresence>
		</LazyMotion>
	)
}
