'use client'

import { useMemo, useState } from 'react'
import { ControllerCompound } from '@/components/shared/controller/compound'
import { ControllerSegmented } from '@/components/shared/controller/segmented'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { ImageCameraControl } from '@/components/studio/image/image-camera-control'
import { ImageReferenceUpload } from '@/components/studio/image/image-reference-upload'
import { StudioColorCompound } from '@/components/studio/shared/compound-controls'
import { ControlPanel } from '@/components/studio/shared/control-panel'
import type {
	ControllerWidgetProps,
	ControllerWidgetRegistry,
} from '@/components/studio/shared/studio-panel-slot'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import type { ImageStudioValue } from '@/features/image-generation/contexts/image-studio-context'
import {
	deriveImageStudioComposition,
	IMAGE_COMPOSITION_GATE_IDS,
} from '@/features/image-generation/domain/image-studio-composition'
import {
	getImageColorAdjustmentControls,
	getImageStudioControls,
	getImageStudioFeature,
} from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'
import { resolveControllerAvailability } from '@/modules/studio-controller/controller-definition'

const TOGGLE = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

/**
 * 이미지 패널의 배치 정책 — 역할을 자리에 놓는다(docs/10 §3.7). Figma 529:19999·529:25129 — Basic은 생성 입력,
 * Adjustment는 색과 시점이다. 생성 버튼과 장수·비율·해상도는 Output 카드에 있다(계약 밖).
 */
export const IMAGE_PANEL_POLICY: StudioPanelPolicy = {
	basic: ['content', 'source'],
	adjustment: ['palette', 'view'],
}

// 생성 그룹은 접지 않는다 — 프롬프트가 이 화면의 주 입력이다.
const IMAGE_PANEL_PRESENTATION = {
	groups: [{ groupId: 'generate', collapsible: false, defaultOpen: true }],
}

export function ImageControls() {
	const { config, controls, generation, camera, reference } = useImageStudio()
	const manifest = useMemo(() => deriveImageStudioComposition(config), [config])
	const values: ControllerValues = {
		...controls.values,
		[IMAGE_COMPOSITION_GATE_IDS.reference]: reference.enabled,
		[IMAGE_COMPOSITION_GATE_IDS.camera]: camera.enabled,
	}
	const { prompt } = getImageStudioControls(config)
	return (
		<ControlPanel
			composition={{
				slots: arrangeStudioPanel(manifest, IMAGE_PANEL_POLICY, values),
				values,
				// 카메라 시점 변경은 시드 이미지를 돌려 그린다 — 그동안 프롬프트는 쓰이지 않는다.
				bindings: camera.enabled
					? { ...controls.bindings, [prompt.id]: { availability: 'disabled' } }
					: controls.bindings,
				presentation: IMAGE_PANEL_PRESENTATION,
				widgets: IMAGE_WIDGETS,
				onChange: (id, next) => {
					if (id === IMAGE_COMPOSITION_GATE_IDS.reference)
						reference.setEnabled(next === true)
					else if (id === IMAGE_COMPOSITION_GATE_IDS.camera)
						camera.setEnabled(next === true)
					else controls.update(id, next)
				},
			}}
			extras={
				generation.error
					? {
							basic: (
								<Typography role="alert" size="sm" className="text-destructive">
									{generation.error}
								</Typography>
							),
						}
					: undefined
			}
		/>
	)
}

function ImageColorWidget() {
	const { config, controls, color } = useImageStudio()
	return <ImageColor config={config} controls={controls} color={color} />
}

function ImageReferenceWidget({ cluster, values, onChange }: ControllerWidgetProps) {
	const gate = cluster.members.gate
	return <ImageReference enabled={values[gate] === true} onChange={(on) => onChange(gate, on)} />
}

function ImageCameraWidget({ cluster, values, onChange }: ControllerWidgetProps) {
	const gate = cluster.members.gate
	return <ImageCamera enabled={values[gate] === true} onChange={(on) => onChange(gate, on)} />
}

/** 이미지 묶음 위젯 — 본문(첨부·시드 이미지·각도)은 이미지 세션이 갖고, 사용 여부만 계약 값으로 오간다. */
const IMAGE_WIDGETS: ControllerWidgetRegistry = {
	'color-pair': ImageColorWidget,
	reference: ImageReferenceWidget,
	camera: ImageCameraWidget,
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
