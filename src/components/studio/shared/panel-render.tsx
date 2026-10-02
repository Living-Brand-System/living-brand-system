'use client'

import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { PANEL_RENDER, type PanelSide, useMotionTransition } from '@/lib/motion'

/** 패널 안에서 따로 다시 그려지는 영역. 고정 영역(위 카드)과 내용 영역(탭 본문)은 바뀌는 때가 다르다. */
export type PanelRenderRegion = 'fixed' | 'content'

type PanelRenderScopeValue = {
	armed: boolean
	/** 영역마다 마지막으로 그린 키 — 안쪽 패널이 통째로 다시 마운트돼도 같은 내용이면 움직이지 않는다. */
	rendered: RefObject<Partial<Record<PanelRenderRegion, string>>>
}

const PanelRenderContext = createContext<PanelRenderScopeValue | null>(null)

/**
 * 패널 렌더의 범위 — 「켜졌나」와 영역마다 「마지막에 그린 키」를 갖는다. 키는 영역이 스스로 안다
 * (패널 컴포지션의 구조 서명, docs/10 §3.7).
 * 범위가 마운트된 뒤에야 켜진다 — 첫 진입은 움직이지 않는다(사용자 결정, 2026-10-02).
 * 🔴 범위는 패널보다 위에 깐다 — 안쪽 패널이 레이어마다 다시 마운트돼도 켜짐과 기록이 남아야 한다.
 */
export function PanelRenderScope({ children }: { children: ReactNode }) {
	const [armed, setArmed] = useState(false)
	const rendered = useRef<Partial<Record<PanelRenderRegion, string>>>({})
	useEffect(() => setArmed(true), [])
	return (
		<PanelRenderContext.Provider value={{ armed, rendered }}>
			{children}
		</PanelRenderContext.Provider>
	)
}

type PanelRenderTargetProps = {
	/** 패널이 놓인 쪽 — 그쪽에서 들어온다. */
	side: PanelSide
	region: PanelRenderRegion
	/** 이 영역이 무엇을 그리나(패널 컴포지션의 구조 서명). 없으면 움직이지 않는다. */
	renderKey?: string
	className?: string
	children: ReactNode
}

/**
 * 자기 영역의 키가 **실제로 바뀌었을 때만** 공용 패널 렌더로 들어오는 자리.
 * 범위 밖에서는 움직이지 않는 평범한 상자다. 레일처럼 고정된 크롬은 이 바깥에 둔다.
 */
export function PanelRenderTarget(props: PanelRenderTargetProps) {
	const scope = useContext(PanelRenderContext)
	return <PanelRenderItem key={props.renderKey} scope={scope} {...props} />
}

function PanelRenderItem({
	scope,
	side,
	region,
	renderKey,
	className,
	children,
}: PanelRenderTargetProps & { scope: PanelRenderScopeValue | null }) {
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('tight')
	// 마운트 순간 한 번만 판단한다 — 같은 키가 다시 마운트된 것이면 이미 보이던 내용이다.
	const [enter] = useState(
		() =>
			Boolean(scope?.armed) &&
			!reducedMotion &&
			scope?.rendered.current[region] !== renderKey,
	)
	const record = scope?.rendered
	useEffect(() => {
		if (!record || renderKey === undefined) return
		const rendered = record.current
		rendered[region] = renderKey
		// 영역이 내려가면 기록을 지운다 — 사라졌다 다시 생긴 영역은 새로 나타난 것이다.
		// 🔑 분기만 갈려 다시 마운트될 때는 새 쪽이 렌더 단계에서 이 기록을 먼저 읽으므로 움직이지 않는다.
		return () => {
			if (rendered[region] === renderKey) delete rendered[region]
		}
	}, [record, region, renderKey])
	return (
		<LazyMotion features={domAnimation}>
			<m.div
				data-slot="panel-render"
				className={className}
				style={{ transformOrigin: PANEL_RENDER[side].origin }}
				initial={enter ? PANEL_RENDER[side].hidden : false}
				animate={PANEL_RENDER[side].shown}
				transition={transition}
			>
				{children}
			</m.div>
		</LazyMotion>
	)
}

/** 위에 범위가 이미 깔려 있나 — 패널이 스스로 범위를 깔지 정할 때 쓴다(두 겹으로 깔면 안쪽이 켜짐을 잃는다). */
export function useHasPanelRenderScope() {
	return useContext(PanelRenderContext) !== null
}
