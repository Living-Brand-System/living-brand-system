'use client'

import { createContext } from 'react'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import type { LazyResource } from '@/hooks/use-lazy-resource'
import type {
	ControllerControlValue,
	ControllerGroupDefinition,
	ControllerRuntimeBindings,
	ControllerValues,
} from '@/modules/studio-controller/controller-definition'

export type GraphicStudioValue = {
	profiles: {
		/** 교체 후보 — 자산 브라우저가 열릴 때 가져온다. 열기 전에는 data가 null이다. */
		browse: LazyResource<readonly GraphicStudioConfig[]>
		select: (profileId: string) => void
	}
	config: GraphicStudioConfig
	/**
	 * 현재 값이 좁힌 뒤의 control 그룹. 🔴 화면은 `config.controller.groups`가 아니라 이것을 읽는다 —
	 * 값에 따라 선택지가 달라지는 축(면 색에 따라 좁아지는 선 색)이 여기서만 보인다.
	 */
	groups: readonly ControllerGroupDefinition[]
	controls: {
		values: ControllerValues
		bindings: ControllerRuntimeBindings
		update: (controlId: string, value: ControllerControlValue) => boolean
		registerBindings: (bindings: ControllerRuntimeBindings) => void
	}
}

export const GraphicStudioContext = createContext<GraphicStudioValue | null>(null)
