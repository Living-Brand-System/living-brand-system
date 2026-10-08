'use client'

import { useMemo } from 'react'
import {
	CONTROLLER_TOGGLE_OPTIONS,
	ControllerCompound,
	ControllerSegmented,
} from '@/components/shared/controller'
import { ImageCameraControl } from '@/components/studio/image/image-camera-control'
import { ImageReferenceUpload } from '@/components/studio/image/image-reference-upload'
import type {
	ControllerWidgetProps,
	ControllerWidgetRegistry,
} from '@/components/studio/panel/studio-panel-slot'
import type { StudioSurface } from '@/components/studio/shared/studio-shell'
import { ColorPairWidget } from '@/components/studio/shared/widgets/color-pair'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
	deriveImageStudioComposition,
	IMAGE_COMPOSITION_GATE_IDS,
} from '@/features/image-generation/domain/image-studio-composition'
import {
	getImageStudioControls,
	getImageStudioFeature,
} from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'
import {
	arrangeStudioPanel,
	type StudioPanelPolicy,
} from '@/modules/studio-controller/controller-composition'
import type { ControllerValues } from '@/modules/studio-controller/controller-definition'

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

/** 이미지 스튜디오의 오른쪽 패널 — 셸(`StudioShell`)이 그린다. 프로파일을 바꾸면 패널을 새로 시작한다. */
export function useImagePanel(): StudioSurface['panel'] {
	const { config, controls, generation, camera, reference } = useImageStudio()
	const manifest = useMemo(() => deriveImageStudioComposition(config), [config])
	const values: ControllerValues = {
		...controls.values,
		[IMAGE_COMPOSITION_GATE_IDS.reference]: reference.enabled,
		[IMAGE_COMPOSITION_GATE_IDS.camera]: camera.enabled,
	}
	const { prompt } = getImageStudioControls(config)
	return {
		identity: config.id,
		compositions: [
			{
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
			},
		],
		extras: generation.error
			? {
					basic: (
						<Typography role="alert" size="sm" className="text-destructive">
							{generation.error}
						</Typography>
					),
				}
			: undefined,
	}
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
	'color-pair': ColorPairWidget,
	reference: ImageReferenceWidget,
	camera: ImageCameraWidget,
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
					options={CONTROLLER_TOGGLE_OPTIONS}
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
