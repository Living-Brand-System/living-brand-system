'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
	createTemplate,
	listTemplateCategoryOptions,
	listTemplateRecords,
	type TemplateCategoryOption,
	type TemplateCreateInput,
	type TemplateRecord,
	trashTemplate,
} from '@/features/template-customization/services/template-records.client'

/**
 * 템플릿 데이터 편집의 목록·변경 상태. 고친 뒤에는 목록을 다시 읽고 서버 화면(카드 목록)도 새로 그린다.
 * `run`이 실패 문구를 `error`로 남기고 다시 던진다 — 폼이 성공했을 때만 다음 단계로 가게.
 */
export function useTemplateRecords() {
	const router = useRouter()
	const [records, setRecords] = useState<TemplateRecord[] | null>(null)
	const [categories, setCategories] = useState<TemplateCategoryOption[]>([])
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		const [nextRecords, nextCategories] = await Promise.all([
			listTemplateRecords(),
			listTemplateCategoryOptions(),
		])
		setRecords(nextRecords)
		setCategories(nextCategories)
	}, [])

	useEffect(() => {
		reload().catch((cause: unknown) => setError(messageOf(cause)))
	}, [reload])

	const run = async (action: () => Promise<void>) => {
		setBusy(true)
		setError(null)
		try {
			await action()
			await reload()
			router.refresh()
		} catch (cause) {
			setError(messageOf(cause))
			throw cause
		} finally {
			setBusy(false)
		}
	}

	return {
		records,
		categories,
		busy,
		error,
		reload: () => {
			reload().catch((cause: unknown) => setError(messageOf(cause)))
		},
		create: (input: TemplateCreateInput) => run(() => createTemplate(input)),
		trash: (id: number) => run(() => trashTemplate(id)),
	}
}

export type TemplateRecordsState = ReturnType<typeof useTemplateRecords>

function messageOf(cause: unknown): string {
	return cause instanceof Error ? cause.message : '요청을 처리하지 못했어요.'
}
