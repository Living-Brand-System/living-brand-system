'use client'

import { ArrowsHorizontal, ArrowsVertical } from '@carbon/icons-react'
import { Controller, ControllerStack } from '@/components/shared/controller'
import { StudioOutput } from '@/components/studio/shared/studio-output'
import type { TemplateExportView } from '@/features/studio-export/hooks/use-template-export'
import { formatMillimeters } from '@/features/studio-export/print-policy'

/**
 * 템플릿 Output 카드 — 판 크기는 템플릿이 정하므로 읽기 전용으로 보여 주고, 배율·해상도·형식·영상만 고른다.
 * 무엇이 보일지는 export 훅이 정한다(배율을 안 쓰는 요청이면 `scale`이 `null`).
 */
export function TemplateOutput({ exporting }: { exporting: TemplateExportView }) {
	const { view, scale, sizeReadout } = exporting
	return (
		<StudioOutput.Root
			footer={
				<>
					<StudioOutput.Actions save={view.save} busy={view.busy} />
					<StudioOutput.Messages error={view.error} notices={view.notices} />
				</>
			}
		>
			{sizeReadout && <SizeReadout {...sizeReadout} />}
			<StudioOutput.Format {...view.format} />
			{scale && <Scale {...scale} />}
			{view.print && <StudioOutput.Print {...view.print} />}
			{view.video && <StudioOutput.Video {...view.video} />}
		</StudioOutput.Root>
	)
}

/** 실제로 나갈 크기 — 인쇄판은 mm, 그 밖은 px. 템플릿 판은 고칠 수 없어 값만 보인다. */
function SizeReadout({ width, height, unit }: NonNullable<TemplateExportView['sizeReadout']>) {
	const format = (value: number) => (unit === 'mm' ? formatMillimeters(value) : String(value))
	return (
		<ControllerStack
			labelDisplay="icon"
			items={[
				{ id: 'width', label: '출력 너비', icon: <ArrowsHorizontal />, value: width },
				{ id: 'height', label: '출력 높이', icon: <ArrowsVertical />, value: height },
			].map(({ value, ...item }) => ({
				...item,
				readonly: true,
				children: (
					<div className="flex min-w-0 flex-1 items-center justify-end gap-1 text-sm">
						<span>{format(value)}</span>
						<span className="shrink-0 text-muted-foreground">{unit}</span>
					</div>
				),
			}))}
		/>
	)
}

/** 캔버스 좌표계 대비 출력 배율. 선택지가 하나뿐이면(인코딩 한도에 가까우면) 읽기 전용으로 둔다. */
function Scale({ value, options, set }: NonNullable<TemplateExportView['scale']>) {
	return (
		<Controller.Row label="Scale" readonly={options.length <= 1}>
			{options.length <= 1 ? (
				<span className="text-sm text-muted-foreground">{value}×</span>
			) : (
				<Controller.Select
					options={options.map((option) => ({
						value: String(option),
						label: `${option}×`,
					}))}
					value={String(value)}
					onChange={(next) => set(Number(next))}
				/>
			)}
		</Controller.Row>
	)
}
