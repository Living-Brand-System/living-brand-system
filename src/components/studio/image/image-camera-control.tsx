'use client'

import dynamic from 'next/dynamic'
import { Controller } from '@/components/shared/controller'
import { snapCameraAngle } from '@/components/shared/controller/camera-orbit'
import { Button } from '@/components/ui/button'
import {
	type CameraAzimuth,
	type CameraElevation,
	resolveCameraControl,
} from '@/features/image-generation/domain/camera-control'

const CameraOrbitControl = dynamic(
	() =>
		import('@/components/shared/controller/camera-orbit-control').then(
			(module) => module.CameraOrbitControl,
		),
	{
		ssr: false,
		loading: () => (
			<div
				role="status"
				className="grid size-full place-items-center p-3 text-muted-foreground text-xs"
			>
				3D 미리보기를 불러오는 중…
			</div>
		),
	},
)

// 각 프리셋의 버킷(value)은 도메인 임계값과 어긋나지 않도록 resolveCameraControl로 도출한다.
const AZIMUTH_PRESETS: { degrees: number; label: string; value: CameraAzimuth }[] = [
	{ degrees: 0, label: '정면' },
	{ degrees: 45, label: '우측 3/4' },
	{ degrees: 90, label: '우측면' },
	{ degrees: 135, label: '후면 우측 3/4' },
	{ degrees: 180, label: '후면' },
	{ degrees: -135, label: '후면 좌측 3/4' },
	{ degrees: -90, label: '좌측면' },
	{ degrees: -45, label: '좌측 3/4' },
].map((preset) => ({
	...preset,
	value: resolveCameraControl({ azimuthDeg: preset.degrees, elevationDeg: 0 }).azimuth,
}))

const ELEVATION_PRESETS: { degrees: number; label: string; value: CameraElevation }[] = [
	{ degrees: -20, label: '로우 앵글' },
	{ degrees: 0, label: '눈높이' },
	{ degrees: 20, label: '약간 위' },
	{ degrees: 50, label: '하이 앵글' },
	{ degrees: 80, label: '탑뷰' },
].map((preset) => ({
	...preset,
	value: resolveCameraControl({ azimuthDeg: 0, elevationDeg: preset.degrees }).elevation,
}))

const DEFAULT_AZIMUTH: CameraAzimuth = 'front'
const DEFAULT_ELEVATION: CameraElevation = 'eye-level'

type CameraAngles = { azimuthDeg: number; elevationDeg: number }

type ImageCameraControlProps = CameraAngles & {
	/** 시점을 다시 잡을 대상 — 오빗 프리뷰의 텍스처가 된다. */
	seedImage: string
	busy: boolean
	/** 계약이 허용한 구간 — 셀렉트 목록과 오빗 스냅 스텝이 이것만 갖는다. */
	azimuths: readonly CameraAzimuth[]
	elevations: readonly CameraElevation[]
	onChange: (angles: CameraAngles) => void
	onRegenerate: () => void
}

/**
 * 이미지 스튜디오의 카메라 시점 컨트롤 — 킷의 CameraControl(정사각 프리뷰 + 반폭 축 셀렉트)에
 * 도메인 프리셋을 붙인다. 각도·요청은 세션(ImageStudioProvider)이 소유하고 여기는 표현만 한다.
 */
export function ImageCameraControl({
	azimuthDeg,
	elevationDeg,
	seedImage,
	busy,
	azimuths,
	elevations,
	onChange,
	onRegenerate,
}: ImageCameraControlProps) {
	// 계약이 허용한 구간만 남긴다 — 목록·스냅 스텝·폴백이 모두 같은 배열에서 나온다.
	const azimuthPresets = AZIMUTH_PRESETS.filter((preset) => azimuths.includes(preset.value))
	const elevationPresets = ELEVATION_PRESETS.filter((preset) => elevations.includes(preset.value))
	const azimuthSteps = azimuthPresets.map((preset) => preset.degrees)
	const elevationSteps = elevationPresets.map((preset) => preset.degrees)
	const azimuthPreset =
		azimuthPresets.find(
			(preset) => preset.degrees === snapCameraAngle(azimuthDeg, azimuthSteps, true),
		) ??
		azimuthPresets.find((preset) => preset.value === DEFAULT_AZIMUTH) ??
		azimuthPresets[0]
	const elevationPreset =
		elevationPresets.find(
			(preset) => preset.degrees === snapCameraAngle(elevationDeg, elevationSteps),
		) ??
		elevationPresets.find((preset) => preset.value === DEFAULT_ELEVATION) ??
		elevationPresets[0]
	// 계약이 두 축 중 하나라도 비우면 조작할 수 있는 시점이 없다 — 섹션을 그리지 않는다.
	if (!azimuthPreset || !elevationPreset) return null

	return (
		<div className="flex flex-col gap-1.5 pb-2.5">
			{/* 디자인 SSOT(16:9035): X는 방위각, Y는 높이다. */}
			<Controller.CameraControl
				axes={[
					{
						label: 'X',
						options: azimuthPresets.map(({ label, value }) => ({ label, value })),
						value: azimuthPreset.value,
						onChange: (value) => {
							const preset = azimuthPresets.find((item) => item.value === value)
							if (preset) onChange({ azimuthDeg: preset.degrees, elevationDeg })
						},
					},
					{
						label: 'Y',
						options: elevationPresets.map(({ label, value }) => ({ label, value })),
						value: elevationPreset.value,
						onChange: (value) => {
							const preset = elevationPresets.find((item) => item.value === value)
							if (preset) onChange({ azimuthDeg, elevationDeg: preset.degrees })
						},
					},
				]}
			>
				<CameraOrbitControl
					azimuthDeg={azimuthDeg}
					azimuthLabel={azimuthPreset.label}
					azimuthSteps={azimuthSteps}
					elevationDeg={elevationDeg}
					elevationLabel={elevationPreset.label}
					elevationSteps={elevationSteps}
					seedImage={seedImage}
					onChange={onChange}
				/>
			</Controller.CameraControl>
			<Button
				type="button"
				variant="muted"
				className="mt-0.5 h-11 w-full font-semibold text-sm"
				disabled={busy}
				onClick={onRegenerate}
			>
				{busy ? '생성 중…' : '이미지 생성'}
			</Button>
		</div>
	)
}
