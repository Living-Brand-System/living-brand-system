'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	patchTemplate,
	readTemplateFields,
} from '@/features/template-customization/services/template-records.client'

/**
 * Manager mode 폼 공용 — 템플릿 필드 몇 개를 읽고, 고친 값을 바로 반영(PATCH, `_status` 보존)한 뒤 다시 읽고
 * 스튜디오 화면을 새로 그린다. 레이어 설정(overrides)은 html 재합성이 필요하니 `updateTemplateNodeConfig`를 쓴다.
 */
export function useTemplateManagerData<T extends Record<string, unknown>>(
	templateId: number,
	fields: readonly (keyof T & string)[],
) {
	const router = useRouter()
	const fieldsRef = useRef(fields)
	const [data, setData] = useState<T | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		setData(await readTemplateFields<T>(templateId, fieldsRef.current))
	}, [templateId])

	useEffect(() => {
		reload().catch((cause: unknown) => setError(messageOf(cause)))
	}, [reload])

	/** 값 몇 개를 저장한다. `action`을 주면 PATCH 대신 그 일을 한다(레이어 설정 저장 등). */
	const save = async (
		patch: Partial<T> | (() => Promise<void>),
		fallback = '저장하지 못했어요.',
	) => {
		setBusy(true)
		setError(null)
		try {
			if (typeof patch === 'function') await patch()
			else await patchTemplate(templateId, patch, fallback)
			await reload()
			router.refresh()
			return true
		} catch (cause) {
			setError(messageOf(cause))
			return false
		} finally {
			setBusy(false)
		}
	}

	return { data, busy, error, save, reload }
}

function messageOf(cause: unknown): string {
	return cause instanceof Error ? cause.message : '요청을 처리하지 못했어요.'
}
