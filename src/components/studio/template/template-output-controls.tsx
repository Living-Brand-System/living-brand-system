'use client'

import type { ReactNode } from 'react'
import {
	PrintControls,
	ScaleControls,
	VideoControls,
} from '@/components/studio/shared/output-controls'
import { OutputDimensions } from '@/components/studio/shared/output-dimensions'
import { StudioOutputModule } from '@/components/studio/shared/output-module'
import {
	STUDIO_OUTPUT_FORMAT_OPTIONS,
	type StudioOutputFormat,
} from '@/features/studio-export/export-contract'
import type { TemplateExportView } from '@/features/studio-export/hooks/use-template-export'
import { formatMillimeters } from '@/features/studio-export/print-policy'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

const FORMAT_LABELS = new Map(
	STUDIO_OUTPUT_FORMAT_OPTIONS.map(({ label, value }) => [value, label]),
)

export function TemplateOutputControls({
	exporting,
	sizeControl,
}: {
	exporting: TemplateExportView
	title?: string
	sizeControl?: ReactNode
}) {
	const { config } = useTemplateStudio()
	const size = exporting.outputSize ?? config.template.exportOption.canvas
	const video = exporting.format === 'mp4' ? config.output.video?.mp4 : undefined
	return (
		<StudioOutputModule
			kind="template"
			empty={false}
			value={{
				mode: exporting.sizeMm ? 'print' : 'digital',
				width: size.width,
				height: size.height,
				ppi: exporting.ppi,
				count: '',
				ratio: '',
				resolution: '',
				notice: exporting.vectorWarnings.join(' · '),
			}}
			onChange={() => {}}
			format={exporting.format ?? ''}
			formats={exporting.formats.map((value) => ({
				value,
				label: FORMAT_LABELS.get(value) ?? value,
			}))}
			onFormatChange={(value) => exporting.setFormat(value as StudioOutputFormat)}
			hasResult={exporting.canExport}
			busy={exporting.busy}
			onSave={exporting.run}
			error={exporting.error}
			sizeControl={
				sizeControl ?? (
					<OutputDimensions
						width={
							exporting.sizeMm
								? formatMillimeters(exporting.sizeMm.width)
								: String(size.width)
						}
						height={
							exporting.sizeMm
								? formatMillimeters(exporting.sizeMm.height)
								: String(size.height)
						}
						unit={exporting.sizeMm ? 'mm' : 'px'}
					/>
				)
			}
		>
			{exporting.scaleApplies && (
				<ScaleControls
					scale={exporting.scale}
					options={exporting.scaleOptions}
					onChange={exporting.setScale}
				/>
			)}{' '}
			{/* 🔴 svg도 포함한다 — SVG의 물리 크기(mm)도 ppi가 정한다. 빼 두면 SVG에는
							    행이 안 뜨는데 값은 살아 있어, 직전에 PDF를 만졌는지에 따라 같은 SVG가
							    53mm 또는 222mm로 나간다. */}
			{(exporting.format === 'tiff' ||
				exporting.format === 'pdf' ||
				exporting.format === 'svg') &&
				exporting.ppiApplies &&
				config.output.print && (
					<PrintControls
						ppi={exporting.ppi}
						options={config.output.print.ppi}
						onChange={exporting.setPpi}
					/>
				)}
			{video && exporting.fps && (
				<VideoControls
					fps={exporting.fps}
					fpsOptions={video.fps}
					durationSeconds={exporting.durationSeconds}
					maxDurationSeconds={video.maxDurationSeconds}
					onFpsChange={exporting.setFps}
					onDurationChange={exporting.setDuration}
				/>
			)}
		</StudioOutputModule>
	)
}
