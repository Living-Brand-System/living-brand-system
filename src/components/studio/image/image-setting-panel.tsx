'use client'

import { Copy, Crop, SquareOutline } from '@carbon/icons-react'
import type * as React from 'react'
import { Controller } from '@/components/shared/controller'
import { PrintControls, VideoControls } from '@/components/studio/shared/output-controls'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { Typography } from '@/components/ui/typography'
import type {
	ImageAspectRatio,
	ImageOutputSize,
} from '@/features/image-generation/domain/image-size'
import { getImageStudioControls } from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import type { ImageExportView } from '@/features/studio-export/hooks/use-image-export'
import {
	type ControllerControlDefinition,
	type ControllerRuntimeBinding,
	resolveControllerAvailability,
} from '@/modules/studio-controller/controller-definition'

/**
 * Setting 패널 — 좌측 세 상자 중 맨 아래(사용자 지시, 2026-09-21).
 *
 * 🔴 장수·비율·해상도와 내보내기를 **쪼개지 않는다**(사용자 지시, 2026-09-22). 우측 사이드바의
 *    Setting 블록을 통째로 옮겨 온 것이고, 한때 내보내기만 떼어 왔던 것을 되돌린 상태다.
 */
export function ImageSettingPanel({ download }: { download: ImageExportView }) {
	const { config, controls, generation } = useImageStudio()
	const { batch, ratio, resolution } = getImageStudioControls(config)
	const video = download.format === 'mp4' ? config.output.video?.mp4 : undefined

	return (
		<div className="flex flex-col gap-2 px-3 py-3">
			<div className="flex h-9 items-center">
				<span className="font-semibold text-muted-foreground text-sm">Setting</span>
			</div>
			{/* 디자인 SSOT(16:9079): 장수·비율·해상도가 한 줄에 3등분으로 앉는다. */}
			<div className="grid grid-cols-3 gap-1">
				<SettingRow
					icon={<Copy aria-hidden />}
					definition={batch}
					binding={controls.bindings[batch.id]}
					value={String(generation.batch)}
					onChange={(value) => generation.setBatch(Number(value))}
				/>
				<SettingRow
					icon={<SquareOutline aria-hidden />}
					definition={ratio}
					binding={controls.bindings[ratio.id]}
					value={generation.ratio}
					onChange={(value) => generation.setRatio(value as ImageAspectRatio)}
				/>
				<SettingRow
					icon={<Crop aria-hidden />}
					definition={resolution}
					binding={controls.bindings[resolution.id]}
					value={generation.resolution}
					onChange={(value) => generation.setResolution(value as ImageOutputSize)}
				/>
			</div>
			<Controller.Row label="Format">
				<Controller.Select
					options={download.formats.map((format) => ({
						value: format,
						label: format.toUpperCase(),
					}))}
					value={download.format ?? ''}
					onChange={(value) =>
						download.setFormat(value as (typeof download.formats)[number])
					}
				/>
			</Controller.Row>
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
			<div className="flex gap-2">
				<Button
					className="h-11 flex-1"
					onClick={download.selected.run}
					disabled={download.busy || !download.selected.canExport}
				>
					선택한 이미지 저장
				</Button>
				<Button
					variant="muted"
					className="h-11 flex-1"
					onClick={download.all.run}
					disabled={download.busy || !download.all.canExport}
				>
					전부 저장
				</Button>
			</div>
			{download.error && (
				<Typography role="alert" size="sm" className="text-destructive">
					{download.error}
				</Typography>
			)}
		</div>
	)
}

type SettingRowProps = {
	/** 아이콘 라벨 — 접근 가능한 이름은 name이 sr-only로 동반한다(docs/10 §3.6). */
	icon: React.ReactNode
	definition: Extract<ControllerControlDefinition, { kind: 'select' }>
	binding?: ControllerRuntimeBinding
	value: string
	onChange: (value: string) => void
}

/** Setting 푸터의 압축 레이아웃에 Definition의 상태와 선택지를 결합한다. */
function SettingRow({ icon, definition, binding, value, onChange }: SettingRowProps) {
	const availability = resolveControllerAvailability(
		definition.availability,
		binding?.availability,
	)
	const disabled = availability === 'disabled'
	const readonly = availability === 'readonly' || (!disabled && definition.options.length <= 1)

	return (
		<div className="flex flex-col gap-1">
			<Controller.Row
				label={
					<>
						{icon}
						<span className="sr-only">{definition.label}</span>
					</>
				}
				readonly={readonly}
				disabled={disabled}
				// 압축 행은 패딩이 10px — 셀렉트 트리거가 행 폭을 재려면 변수도 같이 좁힌다.
				className="px-2.5 [--controller-row-px:0.625rem]"
			>
				{readonly ? (
					<span className="text-muted-foreground text-sm">{value}</span>
				) : (
					<Controller.Select
						options={definition.options}
						value={value}
						onChange={onChange}
					/>
				)}
			</Controller.Row>
			{binding?.error && <FieldError>{binding.error}</FieldError>}
		</div>
	)
}
