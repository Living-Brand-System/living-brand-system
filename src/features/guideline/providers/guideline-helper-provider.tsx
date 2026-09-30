'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HelperContext, type HelperRegistry } from '../contexts/guideline-helper-context'
import { pickActiveRegion } from '../utils/active-region'

/** 부분 노출도 잡아야 하므로 촘촘히 — 큰 판형은 화면에 다 들어오지 않는다. */
const THRESHOLDS = [0, 0.1, 0.25, 0.5, 0.75, 1]

export function GuidelineHelperProvider({ children }: { children: ReactNode }) {
	const [slot, setSlot] = useState<HTMLElement | null>(null)
	const [activeRegion, setActiveRegion] = useState<Element | null>(null)
	const selectedRegion = useRef<Element | null>(null)
	const areas = useRef(new Map<Element, number>())
	const observerRef = useRef<IntersectionObserver | null>(null)

	const sync = useCallback(() => {
		const next = pickActiveRegion(
			[...areas.current].map(([element, visibleArea]) => ({ element, visibleArea })),
			selectedRegion.current,
		)
		if (next !== selectedRegion.current) selectedRegion.current = null
		setActiveRegion(next)
	}, [])
	const selectRegion = useCallback((element: Element) => {
		selectedRegion.current = element
		setActiveRegion(element)
	}, [])

	// 🔴 root는 뷰포트가 아니라 토픽 스크롤 컨테이너다. 본문이 중첩 스크롤 안에 있어서
	//    root를 비우면 관측 기준이 화면 전체가 되고 교차 판정이 어긋난다.
	const observe = useCallback(
		(element: Element) => {
			observerRef.current ??= new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						const { width, height } = entry.intersectionRect
						areas.current.set(entry.target, entry.isIntersecting ? width * height : 0)
					}
					sync()
				},
				{
					root: document.querySelector<HTMLElement>(
						'[data-slot="section-scroll-container"]',
					),
					threshold: THRESHOLDS,
				},
			)
			const observer = observerRef.current
			observer.observe(element)
			return () => {
				observer.unobserve(element)
				areas.current.delete(element)
				sync()
			}
		},
		[sync],
	)

	useEffect(() => {
		return () => {
			observerRef.current?.disconnect()
			observerRef.current = null
		}
	}, [])

	const registry = useMemo<HelperRegistry>(
		() => ({ slot, setSlot, activeRegion, setActiveRegion: selectRegion, observe }),
		[slot, activeRegion, selectRegion, observe],
	)

	return <HelperContext.Provider value={registry}>{children}</HelperContext.Provider>
}
