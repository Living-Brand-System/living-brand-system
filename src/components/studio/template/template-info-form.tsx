'use client'

import { useState } from 'react'
import {
	parseTemplateSize,
	type TemplateFormValues,
	TemplateInfoFields,
} from '@/components/studio/template/template-info-fields'
import { Button } from '@/components/ui/button'
import { FieldDescription, FieldGroup } from '@/components/ui/field'
import {
	type TemplateRecordState,
	useTemplateRecord,
} from '@/features/template-customization/hooks/use-template-record'
import type {
	TemplateInfoPatch,
	TemplateRecord,
} from '@/features/template-customization/services/template-records.client'

/**
 * 템플릿 한 건의 기본 정보 — Payload 템플릿 폼의 칸을 앱 입력으로 옮긴다(사용자 2026-10-13
 * 「payload의 그것을 그대로」). 데이터 편집 모달의 수정 탭이 쓴다.
 */
export function TemplateInfoForm({
	templateId,
	onSaved,
}: {
	templateId: number
	/** 저장 뒤 목록을 다시 읽게 — 같은 모달의 목록 탭이 쓴다. */
	onSaved?: () => void
}) {
	const state = useTemplateRecord(templateId, onSaved)
	if (!state.record) {
		return (
			<p role={state.error ? 'alert' : undefined} className="text-sm text-muted-foreground">
				{state.error ?? '불러오는 중…'}
			</p>
		)
	}
	// 저장하면 다시 읽은 값으로 폼을 새로 시작한다.
	return <TemplateInfoFormBody key={state.record.updatedAt} record={state.record} state={state} />
}

function TemplateInfoFormBody({
	record,
	state,
}: {
	record: TemplateRecord
	state: TemplateRecordState
}) {
	const [values, setValues] = useState(() => toTemplateFormValues(record))
	const patch = buildTemplateInfoPatch(values)
	return (
		<FieldGroup>
			<div className="flex items-center gap-4">
				<div className="size-24 shrink-0 overflow-hidden bg-muted">
					{record.previewImage && (
						// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
						<img
							src={record.previewImage.url}
							alt={record.previewImage.alt}
							className="size-full object-cover"
						/>
					)}
				</div>
				<FieldDescription>
					썸네일은 이 템플릿 편집 화면 왼쪽 위 카드의 「미리보기 갱신」으로 지금 캔버스를
					찍어 바꿔요.
				</FieldDescription>
			</div>
			<TemplateInfoFields
				idPrefix="template-info"
				values={values}
				onChange={(next) => setValues((prev) => ({ ...prev, ...next }))}
				categories={state.categories}
				figmaSize={record}
			/>
			<div className="flex items-center justify-end gap-2">
				{state.error && (
					<p role="alert" className="text-sm text-destructive">
						{state.error}
					</p>
				)}
				<Button
					disabled={!patch || state.busy}
					onClick={() => patch && void state.saveInfo(patch)}
				>
					{state.busy ? '저장하는 중…' : '저장'}
				</Button>
			</div>
		</FieldGroup>
	)
}

export function toTemplateFormValues(record: TemplateRecord): TemplateFormValues {
	return {
		name: record.name,
		slug: record.slug,
		description: record.description ?? '',
		category: record.categoryId,
		outputKind: record.outputKind,
		sizeWidth: String(record.size?.width ?? record.width ?? ''),
		sizeHeight: String(record.size?.height ?? record.height ?? ''),
	}
}

/** 폼 값 → 저장할 기본 정보. 이름·주소·카테고리·판형 크기가 비면 저장하지 않는다(`null`). */
export function buildTemplateInfoPatch(values: TemplateFormValues): TemplateInfoPatch | null {
	const name = values.name.trim()
	const slug = values.slug.trim()
	const size = parseTemplateSize(values)
	if (!name || !slug || !values.category || !size) return null
	return {
		name,
		slug,
		description: values.description.trim(),
		category: values.category,
		outputKind: values.outputKind,
		size,
	}
}
