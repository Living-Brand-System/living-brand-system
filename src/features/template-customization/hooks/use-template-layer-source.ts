'use client'

import { useCallback, useEffect, useState } from 'react'
import {
	readTemplateLayerSource,
	type TemplateLayerSource,
} from '@/features/template-customization/services/template-records.client'

/** 레이어 원본·노드 설정(숨김 레이어 포함) — Manager mode의 레이어 묶음 폼이 읽는다. */
export function useTemplateLayerSource(templateId: number) {
	const [source, setSource] = useState<TemplateLayerSource | null>(null)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(() => {
		readTemplateLayerSource(templateId)
			.then(setSource)
			.catch((cause: unknown) =>
				setError(cause instanceof Error ? cause.message : '레이어를 읽지 못했어요.'),
			)
	}, [templateId])

	useEffect(reload, [reload])

	return { source, error, reload }
}
