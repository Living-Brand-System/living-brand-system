'use client'

import { useState } from 'react'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import {
	type TemplateRecordState,
	useTemplateRecord,
} from '@/features/template-customization/hooks/use-template-record'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { TemplateRecord } from '@/features/template-customization/services/template-records.client'

/** Output 크기 줄의 관리 폼(`output:`) — 판형 종류(디지털 px / 인쇄 mm)와 크기. */
export function TemplateOutputManagerForm() {
	const { config } = useTemplateStudio()
	const state = useTemplateRecord(config.id)
	if (!state.record) {
		return (
			<Typography size="xs" tone={state.error ? 'destructive' : 'muted'}>
				{state.error ?? '불러오는 중…'}
			</Typography>
		)
	}
	// 저장하면 다시 읽은 값으로 새로 시작한다.
	return <OutputFormBody key={state.record.updatedAt} record={state.record} state={state} />
}

function OutputFormBody({ record, state }: { record: TemplateRecord; state: TemplateRecordState }) {
	const [outputKind, setOutputKind] = useState(record.outputKind)
	const [width, setWidth] = useState(String(record.size?.width ?? record.width ?? ''))
	const [height, setHeight] = useState(String(record.size?.height ?? record.height ?? ''))
	const unit = outputKind === 'print' ? 'mm' : 'px'
	const size = { width: Number(width), height: Number(height) }
	const valid = size.width > 0 && size.height > 0
	return (
		<div className="flex flex-col gap-2">
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
			<div className="flex items-center gap-2">
				<Input
					aria-label={`가로 ${unit}`}
					inputMode="numeric"
					value={width}
					onChange={(event) => setWidth(event.target.value)}
				/>
				<span aria-hidden>×</span>
				<Input
					aria-label={`세로 ${unit}`}
					inputMode="numeric"
					value={height}
					onChange={(event) => setHeight(event.target.value)}
				/>
			</div>
			<Typography size="xs" tone="muted">
				Figma 판({record.width}×{record.height}px)과 가로세로 비율이 같아야 해요.
			</Typography>
			<Button
				size="sm"
				disabled={!valid || state.busy}
				onClick={() => void state.saveOutput({ outputKind, size })}
			>
				저장
			</Button>
			<FormNote
				error={state.error}
				busy={state.busy}
				note="저장하면 모든 사용자에게 바로 반영돼요."
			/>
		</div>
	)
}
