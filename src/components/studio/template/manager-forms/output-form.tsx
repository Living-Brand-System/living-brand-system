'use client'

import { useRef, useState } from 'react'
import { openDataEditorTab } from '@/components/studio/shared/data-editor'
import { FOUNDATION_TABS } from '@/components/studio/template/foundation-editor'
import { ManagerLinkForm } from '@/components/studio/template/manager-forms/link-form'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { FieldError, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
	type TemplateRecordState,
	useTemplateRecord,
} from '@/features/template-customization/hooks/use-template-record'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { TemplateRecord } from '@/features/template-customization/services/template-records.client'

/**
 * Output 크기 줄의 관리 폼(`output:`) — 판형 종류(디지털 px / 인쇄 mm)와 크기.
 * 종류와 크기는 같이 맞아야 하므로(단위가 다르다) 폼 밖으로 나갈 때 한 번에 초안에 쌓는다.
 */
export function TemplateOutputManagerForm() {
	const { config } = useTemplateStudio()
	const state = useTemplateRecord(config.id)
	if (!state.record) return <FormNote error={state.error} loading />
	return <OutputFormBody record={state.record} state={state} />
}

function OutputFormBody({ record, state }: { record: TemplateRecord; state: TemplateRecordState }) {
	const [outputKind, setOutputKind] = useState(record.outputKind)
	const [width, setWidth] = useState(String(record.size?.width ?? record.width ?? ''))
	const [height, setHeight] = useState(String(record.size?.height ?? record.height ?? ''))
	const unit = outputKind === 'print' ? 'mm' : 'px'
	const size = { width: Number(width), height: Number(height) }
	const widthValid = size.width > 0
	const heightValid = size.height > 0
	const written = useRef(JSON.stringify({ outputKind, size }))
	const commit = () => {
		const next = JSON.stringify({ outputKind, size })
		if (!widthValid || !heightValid || next === written.current) return
		written.current = next
		void state.saveOutput({ outputKind, size })
	}
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: 입력칸들의 focusout을 모아 받을 뿐 스스로 조작되지 않는다
		<div
			className="flex flex-col gap-2"
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) commit()
			}}
		>
			<FieldTitle>판형 종류</FieldTitle>
			<ToggleGroup
				type="single"
				variant="outline"
				size="sm"
				spacing={0}
				value={outputKind}
				onValueChange={(value) =>
					value && setOutputKind(value as TemplateRecord['outputKind'])
				}
				aria-label="판형 종류"
				className="w-full"
			>
				<ToggleGroupItem value="digital">디지털 (px)</ToggleGroupItem>
				<ToggleGroupItem value="print">인쇄 (mm)</ToggleGroupItem>
			</ToggleGroup>
			<FieldTitle>크기 ({unit})</FieldTitle>
			<div className="flex items-center gap-2">
				<Input
					aria-label={`가로 ${unit}`}
					aria-invalid={!widthValid || undefined}
					inputMode="numeric"
					value={width}
					onChange={(event) => setWidth(event.target.value)}
				/>
				<span aria-hidden>×</span>
				<Input
					aria-label={`세로 ${unit}`}
					aria-invalid={!heightValid || undefined}
					inputMode="numeric"
					value={height}
					onChange={(event) => setHeight(event.target.value)}
				/>
			</div>
			{(!widthValid || !heightValid) && (
				<FieldError className="text-xs">
					가로·세로를 0보다 큰 숫자로 적어 주세요.
				</FieldError>
			)}
			<FormNote
				error={state.error}
				busy={state.busy}
				note={`Figma 판(${record.width}×${record.height}px)과 가로세로 비율이 같아야 해요.`}
			/>
			<ManagerLinkForm
				note="판형 종류(사전 정의 판형)는 여러 템플릿·스튜디오가 같이 써서 파운데이션에서 관리해요."
				links={[
					{
						label: '파운데이션 판형 종류 열기',
						onOpen: () => openDataEditorTab(FOUNDATION_TABS.artboard),
					},
				]}
			/>
		</div>
	)
}
