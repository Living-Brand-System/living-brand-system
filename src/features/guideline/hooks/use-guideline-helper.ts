'use client'

import { useContext } from 'react'
import { HelperContext } from '../contexts/guideline-helper-context'

export function useGuidelineHelper() {
	return useContext(HelperContext)
}
