'use client'

import { Copy, Crop, SquareOutline } from '@carbon/icons-react'
import { Controller } from '@/components/shared/controller'
import { ControllerStack } from '@/components/shared/controller/stack'
import { PrintControls, VideoControls } from '@/components/studio/shared/output-controls'
import { StudioOutputModule } from '@/components/studio/shared/output-module'
import { FieldError } from '@/components/ui/field'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import { getImageStudioControls } from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import type { ImageExportView } from '@/features/studio-export/hooks/use-image-export'
import { resolveControllerAvailability } from '@/modules/studio-controller/controller-definition'

/**
 * Setting 패널 — 좌측 세 상자 중 맨 아래(사용자 지시, 2026-09-21).
 *
 * 🔴 장수·비율·해상도와 내보내기를 **쪼개지 않는다**(사용자 지시, 2026-09-22). 우측 사이드바의
 *    Setting 블록을 통째로 옮겨 온 것이고, 한때 내보내기만 떼어 왔던 것을 되돌린 상태다.
 */
export function ImageSettingPanel({ download }: { download: ImageExportView; title?: string }) {
	const { config, controls, generation } = useImageStudio()
	const { batch, ratio, resolution } = getImageStudioControls(config)
	const video = download.format === 'mp4' ? config.output.video?.mp4 : undefined

	const fields = [
		{
			definition: batch,
			icon: <Copy />,
			value: String(generation.batch),
			onChange: (value: string) => generation.setBatch(Number(value)),
		},
		{
			definition: ratio,
			icon: <SquareOutline />,
			value: generation.ratio,
			onChange: (value: string) => generation.setRatio(value as ImageAspectRatio),
		},
		{
			definition: resolution,
			icon: <Crop />,
			value: generation.resolution,
			onChange: (value: string) => generation.setResolution(value as ImageOutputSize),
		},
	]
	return (
		<div className="p-4">
			<StudioOutputModule
				kind="image"
				empty={false}
				value={{
					mode: 'digital',
					preset: 'custom',
					width: 0,
					height: 0,
					ppi: download.ppi ?? 300,
					count: String(generation.batch),
					ratio: generation.ratio,
					resolution: generation.resolution,
					notice: '',
				}}
				onChange={() => {}}
				format={download.format ?? ''}
				formats={download.formats.map((value) => ({ value, label: value.toUpperCase() }))}
				onFormatChange={(value) =>
					download.setFormat(value as (typeof download.formats)[number])
				}
				hasResult={download.selected.canExport}
				canSaveAll={download.all.canExport}
				busy={download.busy}
				onSave={download.selected.run}
				onSaveAll={download.all.run}
				error={download.error}
				sizeControl={
					<ControllerStack
						items={fields.map(({ definition, icon, value, onChange }) => {
							const binding = controls.bindings[definition.id]
							const availability = resolveControllerAvailability(
								definition.availability,
								binding?.availability,
							)
							const readonly =
								availability === 'readonly' ||
								(availability !== 'disabled' && definition.options.length <= 1)
							return {
								id: definition.id,
								label: definition.label,
								icon,
								disabled: availability === 'disabled',
								readonly,
								children: (
									<>
										{readonly ? (
											<span className="text-sm text-muted-foreground">
												{value}
											</span>
										) : (
											<Controller.Select
												options={definition.options}
												value={value}
												onChange={onChange}
											/>
										)}
										{binding?.error && <FieldError>{binding.error}</FieldError>}
									</>
								),
							}
						})}
					/>
				}
			>
				{(download.format === 'tiff' || download.format === 'pdf') &&
					download.ppi &&
					config.output.print && (
						<PrintControls
							ppi={download.ppi}
							options={config.output.print.ppi}
							onChange={download.setPpi}
						/>
					)}
				{video && download.fps && (
					<VideoControls
						fps={download.fps}
						fpsOptions={video.fps}
						durationSeconds={download.durationSeconds}
						maxDurationSeconds={video.maxDurationSeconds}
						onFpsChange={download.setFps}
						onDurationChange={download.setDuration}
					/>
				)}
			</StudioOutputModule>
		</div>
	)
}
