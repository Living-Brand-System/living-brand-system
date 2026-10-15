'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
	isManagerDraft,
	listTemplateCategoryOptions,
	readTemplateRecord,
	type TemplateCategoryOption,
	type TemplateInfoPatch,
	type TemplateRecord,
	updateTemplateInfo,
	updateTemplateOutput,
} from '@/features/template-customization/services/template-records.client'
import { getStudioTemplateRoute } from '@/lib/routes'

/**
 * 데이터 편집 모달의 수정 탭 — 템플릿 한 건. 저장하면 화면을 새로 그린다.
 * 🔑 지금 보고 있는 템플릿의 주소(slug)를 바꾸면 지금 주소가 사라지므로 새 주소로 옮겨 간다(모달은 열린 채로).
 */
export function useTemplateRecord(templateId: number, onSaved?: () => void) {
	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const [record, setRecord] = useState<TemplateRecord | null>(null)
	const [categories, setCategories] = useState<TemplateCategoryOption[]>([])
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const reload = useCallback(async () => {
		const [nextRecord, nextCategories] = await Promise.all([
			readTemplateRecord(templateId),
			listTemplateCategoryOptions(),
		])
		setRecord(nextRecord)
		setCategories(nextCategories)
	}, [templateId])

	useEffect(() => {
		reload().catch((cause: unknown) => setError(messageOf(cause)))
	}, [reload])

	/** 보낸 칸만 고친다 — 주소(`slug`)가 들어 있고 바뀌었을 때만 새 주소로 옮겨 간다. */
	const saveInfo = async (patch: Partial<TemplateInfoPatch>) => {
		setBusy(true)
		setError(null)
		try {
			await updateTemplateInfo(templateId, patch)
			await reload()
			onSaved?.()
			// Manager mode에서는 초안이라 주소가 아직 안 바뀌었다 — 옮기는 것은 저장할 때 레일이 한다.
			if (
				!isManagerDraft(templateId) &&
				record &&
				patch.slug !== undefined &&
				patch.slug !== record.slug &&
				pathname === getStudioTemplateRoute(record.slug)
			) {
				router.replace(`${getStudioTemplateRoute(patch.slug)}?${searchParams.toString()}`, {
					scroll: false,
				})
			} else {
				router.refresh()
			}
		} catch (cause) {
			setError(messageOf(cause))
		} finally {
			setBusy(false)
		}
	}

	/** 판형만 고친다(Manager mode의 Output 폼). */
	const saveOutput = async (output: Parameters<typeof updateTemplateOutput>[1]) => {
		setBusy(true)
		setError(null)
		try {
			await updateTemplateOutput(templateId, output)
			await reload()
			router.refresh()
		} catch (cause) {
			setError(messageOf(cause))
		} finally {
			setBusy(false)
		}
	}

	return { record, categories, busy, error, saveInfo, saveOutput }
}

export type TemplateRecordState = ReturnType<typeof useTemplateRecord>

function messageOf(cause: unknown): string {
	return cause instanceof Error ? cause.message : '요청을 처리하지 못했어요.'
}
