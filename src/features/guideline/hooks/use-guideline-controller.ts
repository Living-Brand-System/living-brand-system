'use client'

import { useContext } from 'react'
import {
	GuidelineControllerContext,
	type GuidelineControllerScopeValue,
} from '../contexts/guideline-controller-context'

const EMPTY: GuidelineControllerScopeValue = {
	groups: [],
	values: {},
	set: () => {},
	reset: () => {},
}

/** 스코프 밖(컨트롤 없이 그림만 둔 경우)이면 빈 값을 읽기 전용으로 준다. */
export function useGuidelineController(): GuidelineControllerScopeValue {
	return useContext(GuidelineControllerContext) ?? EMPTY
}
