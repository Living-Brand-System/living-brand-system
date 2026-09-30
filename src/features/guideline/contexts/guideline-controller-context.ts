'use client'

import { createContext } from 'react'
import type {
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

export type GuidelineControllerScopeValue = {
	/** admin 제한까지 적용된 실효 그룹. 렌더러가 이것만 본다. */
	groups: readonly ControllerGroupDefinition[]
	/** 지금 값. 조작하면 여기가 바뀐다. */
	values: ControllerValues
	set: (controlId: string, value: ControllerControlValue) => void
	reset: () => void
}

export const GuidelineControllerContext = createContext<GuidelineControllerScopeValue | null>(null)
