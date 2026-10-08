'use client'

import {
	CONTROLLER_TOGGLE_OPTIONS,
	ControllerCompound,
	ControllerSegmented,
} from '@/components/shared/controller'
import { ImageReferenceUpload } from '@/components/studio/image/image-reference-upload'
import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { Button } from '@/components/ui/button'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'

/** 레퍼런스 사용(`gate`)만 계약 값으로 오가고, 첨부 본문은 이미지 세션이 갖는다. */
export function ImageReferenceWidget({ cluster, values, onChange }: ControllerWidgetProps) {
	const gate = cluster.members.gate
	return <ImageReference enabled={values[gate] === true} onChange={(on) => onChange(gate, on)} />
}

function ImageReference({
	enabled,
	onChange,
}: {
	enabled: boolean
	onChange: (enabled: boolean) => void
}) {
	const { reference, generation } = useImageStudio()
	return (
		<ControllerCompound
			label="Reference Image"
			control={
				<ControllerSegmented
					compact
					aria-label="Reference Image 사용"
					options={CONTROLLER_TOGGLE_OPTIONS}
					value={enabled ? 'on' : 'off'}
					disabled={generation.busy}
					onChange={(value) => onChange(value === 'on')}
				/>
			}
		>
			{enabled && (
				<ImageReferenceUpload
					compact
					value={reference.value}
					name={reference.name}
					error={reference.error}
					disabled={generation.busy || reference.preparing}
					onAttach={reference.attach}
					onClear={reference.clear}
				/>
			)}
			{enabled && reference.preparing && (
				<div
					role="status"
					className="flex items-center justify-between gap-2 px-3 pb-3 text-xs text-muted-foreground"
				>
					참조 이미지를 준비하고 있어요…
					<Button size="sm" variant="ghost" onClick={reference.clear}>
						취소
					</Button>
				</div>
			)}
		</ControllerCompound>
	)
}
