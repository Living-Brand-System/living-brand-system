'use client'
import { useState } from 'react'
import { VideoControls } from '@/components/studio/shared/output-controls'
import { type StudioOutput, StudioOutputModule } from '@/components/studio/shared/output-module'
import { useGraphicStudio } from '@/features/graphic-generation/hooks/use-graphic-studio'
import type { GraphicExportView } from '@/features/studio-export/hooks/use-graphic-export'
import { acceptsPrintPpi } from '@/features/studio-export/studio-output'
export function GraphicOutput({ output }: { output: GraphicExportView }) {
	const { config } = useGraphicStudio()
	const [display, setDisplay] = useState({
		mode: 'digital' as StudioOutput['mode'],
		notice: '',
	})
	const draft = output.draft
	if (!draft) return null
	const video = draft.format === 'mp4' ? config.output.video?.mp4 : undefined
	const value: StudioOutput = {
		...display,
		width: draft.width ?? 300,
		height: draft.height ?? 300,
		ppi: output.ppi,
		count: '',
		ratio: '',
		resolution: '',
	}
	return (
		<StudioOutputModule
			kind="graphic"
			empty={false}
			value={value}
			onChange={(next) => {
				if (next.notice) {
					setDisplay({ mode: next.mode, notice: next.notice })
					return
				}
				if (
					!acceptsPrintPpi(config.output, next.ppi) ||
					!output.setSize({ width: next.width, height: next.height })
				) {
					setDisplay((current) => ({
						...current,
						notice: '이 프로파일에서 지원하지 않는 크기 또는 해상도입니다.',
					}))
					return
				}
				output.setPpi(next.ppi)
				setDisplay({ mode: next.mode, notice: '' })
			}}
			format={draft.format}
			formats={config.output.formats.map((value) => ({ value, label: value.toUpperCase() }))}
			onFormatChange={(value) => output.setFormat(value as typeof draft.format)}
			hasResult={output.canExport}
			busy={output.busy}
			onSave={output.run}
			error={output.error}
		>
			{video && draft.format === 'mp4' && (
				<VideoControls
					fps={draft.fps}
					fpsOptions={video.fps}
					durationSeconds={draft.durationSeconds}
					maxDurationSeconds={video.maxDurationSeconds}
					onFpsChange={output.setFps}
					onDurationChange={output.setDuration}
				/>
			)}
		</StudioOutputModule>
	)
}
