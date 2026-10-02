'use client'

import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { PANEL_RENDER, type PanelSide, useMotionTransition } from '@/lib/motion'

type PanelRenderScopeValue = { renderKey: string; armed: boolean }

const PanelRenderContext = createContext<PanelRenderScopeValue | null>(null)

/**
 * 패널 렌더의 범위 — 「지금 무엇을 그리는가」를 키로 알린다(예: 템플릿의 레이어 종류).
 * 범위가 마운트된 뒤에야 켜진다 — 첫 진입은 움직이지 않는다(사용자 결정, 2026-10-02).
 * 🔑 키가 바뀌어 안쪽 패널이 통째로 다시 마운트돼도, 첫 진입 판단은 바깥의 이 범위가 갖는다.
 */
export function PanelRenderScope({
	renderKey,
	children,
}: {
	renderKey: string
	children: ReactNode
}) {
	const [armed, setArmed] = useState(false)
	useEffect(() => setArmed(true), [])
	return (
		<PanelRenderContext.Provider value={{ renderKey, armed }}>
			{children}
		</PanelRenderContext.Provider>
	)
}

/**
 * 범위의 키가 바뀌거나 범위 안에서 새로 마운트될 때 공용 패널 렌더로 들어오는 자리.
 * 범위 밖에서는 움직이지 않는 평범한 상자다. 레일처럼 고정된 크롬은 이 바깥에 둔다.
 */
export function PanelRenderTarget({
	side,
	className,
	children,
}: {
	/** 패널이 놓인 쪽 — 그쪽에서 들어온다. */
	side: PanelSide
	className?: string
	children: ReactNode
}) {
	const scope = useContext(PanelRenderContext)
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('tight')
	return (
		<LazyMotion features={domAnimation}>
			<m.div
				key={scope?.renderKey}
				data-slot="panel-render"
				className={className}
				style={{ transformOrigin: PANEL_RENDER[side].origin }}
				initial={scope?.armed && !reducedMotion ? PANEL_RENDER[side].hidden : false}
				animate={PANEL_RENDER[side].shown}
				transition={transition}
			>
				{children}
			</m.div>
		</LazyMotion>
	)
}
