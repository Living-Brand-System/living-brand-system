'use client'

import { type ReactNode, useState } from 'react'
import { ControllerCompound } from '@/components/shared/controller/compound'
import { ControllerGroup } from '@/components/shared/controller/group'
import { ControllerGroupList } from '@/components/shared/controller/group-list'
import { ControllerSegmented } from '@/components/shared/controller/segmented'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { ImageCameraControl } from '@/components/studio/image/image-camera-control'
import { ImageReferenceUpload } from '@/components/studio/image/image-reference-upload'
import { StudioColorCompound } from '@/components/studio/shared/compound-controls'
import { ControlPanel } from '@/components/studio/shared/control-panel'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import type { ImageStudioValue } from '@/features/image-generation/contexts/image-studio-context'
import {
	getImageColorAdjustmentControls,
	getImageStudioControls,
	getImageStudioFeature,
} from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import type {
	ControllerControlDefinition,
	ControllerControlValue,
	ControllerRuntimeBinding,
} from '@/modules/studio-controller/controller-definition'
import { resolveControllerAvailability } from '@/modules/studio-controller/controller-definition'

const TOGGLE = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

export function ImageControls() {
	const { config, controls, generation, camera, reference, color } = useImageStudio()
	const [cameraEnabled, setCameraEnabled] = useState(false)
	const { prompt } = getImageStudioControls(config)
	const hasColor = Boolean(getImageStudioFeature(config, 'color-adjustment'))
	const hasCamera = Boolean(getImageStudioFeature(config, 'camera-control'))
	return (
		<ControlPanel
			fixed={
				<div className="flex flex-col gap-1.5">
					{hasColor && <ImageColor config={config} controls={controls} color={color} />}
					{hasCamera && (
						<ImageCamera
							enabled={cameraEnabled}
							onChange={(enabled) => {
								setCameraEnabled(enabled)
								if (enabled) reference.setEnabled(false)
							}}
						/>
					)}
					{!hasColor && !hasCamera && (
						<Typography size="sm" tone="muted">
							이 프로파일의 생성 설정은 아래에서 조정합니다.
						</Typography>
					)}
				</div>
			}
			basic={
				<ImageGenerate
					prompt={prompt}
					value={controls.values[prompt.id]}
					binding={
						cameraEnabled ? { availability: 'disabled' } : controls.bindings[prompt.id]
					}
					onChange={(value) => controls.update(prompt.id, value)}
					busy={generation.busy}
					canRun={cameraEnabled ? Boolean(camera.seedImage) : generation.canRun}
					onGenerate={cameraEnabled ? camera.regenerate : generation.run}
					error={generation.error}
				>
					{getImageStudioFeature(config, 'reference-image') && (
						<ImageReference
							onChange={(enabled) => {
								reference.setEnabled(enabled)
								if (enabled) setCameraEnabled(false)
							}}
						/>
					)}
				</ImageGenerate>
			}
		/>
	)
}

export function ImageColor({
	config,
	color,
	controls,
}: Pick<ImageStudioValue, 'config' | 'color' | 'controls'>) {
	const [mode, setMode] = useState<'swatch' | 'custom'>('swatch')
	const [swatch, setSwatch] = useState('')
	const definitions = getImageColorAdjustmentControls(config)
	if (!definitions) return null
	const fields = [definitions.line, definitions.background].filter((field) => field !== undefined)
	// 제한된 팔레트·고정색·라인 전용 프로파일에는 자유로운 두 색 UI를 열지 않는다.
	const freePair =
		fields.length === 2 &&
		fields.every(
			(field) =>
				!field.values &&
				resolveControllerAvailability(
					field.availability,
					controls.bindings[field.id]?.availability,
				) === 'enabled',
		)
	if (!freePair)
		return (
			<ControllerCompound label="Color">
				<div className="flex flex-col gap-1 p-1.5 [&_[data-slot=controller-row]]:bg-foreground/4">
					{fields.map((field) => (
						<ControllerControlRenderer
							key={field.id}
							definition={field}
							value={controls.values[field.id]}
							binding={controls.bindings[field.id]}
							onChange={(value) => controls.update(field.id, value)}
						/>
					))}
				</div>
			</ControllerCompound>
		)
	const foreground = color.value?.line ?? '#000000'
	const background = color.value?.background ?? '#ffffff'
	return (
		<div className="flex flex-col gap-1">
			<StudioColorCompound
				showDate={false}
				value={{ date: '', colorMode: mode, swatch, foreground, background }}
				onChange={(patch) => {
					if (patch.colorMode) setMode(patch.colorMode)
					if (patch.swatch !== undefined) setSwatch(patch.swatch)
					if (patch.foreground !== undefined || patch.background !== undefined)
						color.update({
							line: patch.foreground ?? foreground,
							background: patch.background ?? background,
						})
				}}
			/>
		</div>
	)
}

function ImageReference({ onChange }: { onChange: (enabled: boolean) => void }) {
	const { reference, generation } = useImageStudio()
	const enabled = reference.enabled
	return (
		<ControllerCompound
			label="Reference Image"
			control={
				<ControllerSegmented
					compact
					aria-label="Reference Image 사용"
					options={TOGGLE}
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

function ImageCamera({
	enabled,
	onChange,
}: {
	enabled: boolean
	onChange: (enabled: boolean) => void
}) {
	const { config, camera, generation } = useImageStudio()
	const feature = getImageStudioFeature(config, 'camera-control')
	if (!feature) return null
	return (
		<ControllerCompound
			label="Camera Control"
			control={
				<ControllerSegmented
					compact
					aria-label="Camera Control 사용"
					options={TOGGLE}
					disabled={generation.busy || !camera.seedImage}
					value={enabled && camera.seedImage ? 'on' : 'off'}
					onChange={(value) => onChange(value === 'on')}
				/>
			}
		>
			{enabled && camera.seedImage && (
				<ImageCameraControl
					contained
					azimuthDeg={camera.azimuthDeg}
					elevationDeg={camera.elevationDeg}
					seedImage={camera.seedImage}
					busy={generation.busy}
					azimuths={feature.azimuths}
					elevations={feature.elevations}
					onChange={camera.setAngles}
				/>
			)}
		</ControllerCompound>
	)
}

/** 공통 생성 폼. 실행·비율·결과는 각 Studio 세션이 소유한다. */
export function ImageGenerate({
	prompt,
	value,
	binding,
	onChange,
	busy,
	canRun,
	onGenerate,
	error,
	children,
	showAction = true,
}: {
	prompt?: Extract<ControllerControlDefinition, { kind: 'text' }>
	value?: ControllerControlValue
	binding?: ControllerRuntimeBinding
	onChange: (value: ControllerControlValue) => void
	busy: boolean
	canRun: boolean
	onGenerate: () => void
	error: string | null
	showAction?: boolean
	children?: ReactNode
}) {
	return (
		<ControllerGroupList>
			<ControllerGroup title="Generate" collapsible={false}>
				{children}
				{prompt && (
					<ControllerControlRenderer
						definition={prompt}
						value={value ?? prompt.defaultValue ?? ''}
						binding={binding}
						onChange={onChange}
					/>
				)}
				{showAction && (
					<Button
						variant="muted"
						className="mt-0.5 h-11 w-full rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15"
						disabled={busy || !canRun}
						onClick={onGenerate}
					>
						{busy ? '생성 중…' : '이미지 생성'}
					</Button>
				)}
				{error && (
					<Typography role="alert" size="sm" className="text-destructive">
						{error}
					</Typography>
				)}
			</ControllerGroup>
		</ControllerGroupList>
	)
}
