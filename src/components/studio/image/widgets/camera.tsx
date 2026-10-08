'use client'

import {
	CONTROLLER_TOGGLE_OPTIONS,
	ControllerCompound,
	ControllerSegmented,
} from '@/components/shared/controller'
import { ImageCameraControl } from '@/components/studio/image/image-camera-control'
import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { getImageStudioFeature } from '@/features/image-generation/domain/image-studio-config'
import { useImageStudio } from '@/features/image-generation/hooks/use-image-studio'

/** 카메라 사용(`gate`)만 계약 값으로 오가고, 시드 이미지·각도는 이미지 세션이 갖는다. */
export function ImageCameraWidget({ cluster, values, onChange }: ControllerWidgetProps) {
	const gate = cluster.members.gate
	return <ImageCamera enabled={values[gate] === true} onChange={(on) => onChange(gate, on)} />
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
