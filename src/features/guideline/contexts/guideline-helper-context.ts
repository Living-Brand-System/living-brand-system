'use client'

import { createContext } from 'react'

export type HelperRegistry = {
	slot: HTMLElement | null
	setSlot: (element: HTMLElement | null) => void
	activeRegion: Element | null
	setActiveRegion: (element: Element) => void
	/** 관측을 시작하고 해제 함수를 돌려준다. */
	observe: (element: Element) => () => void
}

export const HelperContext = createContext<HelperRegistry | null>(null)
