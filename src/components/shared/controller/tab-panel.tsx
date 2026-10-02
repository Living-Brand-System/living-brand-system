'use client'

import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import type * as React from 'react'
import { useEffect, useState } from 'react'
import { PANEL_RENDER, type PanelSide, useMotionTransition } from '@/lib/motion'
import { cn } from '@/lib/utils'

type ControllerTabPanelProps = {
	/** 그릴 내용의 식별자 — 바뀔 때마다 새 내용이 패널 렌더 모션으로 들어온다. */
	tabKey: string
	/** 담긴 패널이 놓인 쪽 — 그쪽에서 들어온다. 컨트롤러는 대개 오른쪽 패널에 있다. */
	side?: PanelSide
	className?: string
	children: React.ReactNode
}

/**
 * 같은 자리에서 내용이 바뀌는 전환(탭·레이어) — 공용 패널 렌더(`PANEL_RENDER`)로 다시 그린다.
 * 이전 내용은 React가 곧바로 내리고 새 내용만 들어온다 — 나가는 모션을 기다리면 전환 한 번이 두 배로
 * 길어지고, 그 사이 이전 내용이 한 프레임 남는다. 첫 렌더는 움직이지 않는다(마운트 뒤에야 켜진다).
 */
export function ControllerTabPanel({
	tabKey,
	side = 'right',
	className,
	children,
}: ControllerTabPanelProps) {
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('overlay')
	const [mounted, setMounted] = useState(false)
	useEffect(() => setMounted(true), [])

	return (
		<LazyMotion features={domAnimation}>
			<m.div
				key={tabKey}
				data-slot="controller-tab-panel"
				className={cn('flex flex-col gap-1.5', className)}
				initial={mounted && !reducedMotion ? PANEL_RENDER[side].hidden : false}
				animate={PANEL_RENDER[side].shown}
				transition={transition}
			>
				{children}
			</m.div>
		</LazyMotion>
	)
}
