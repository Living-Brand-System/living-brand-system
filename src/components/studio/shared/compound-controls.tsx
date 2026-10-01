'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useState } from 'react'
import { ControllerCameraControl } from '@/components/shared/controller/camera-control'
import { snapCameraAngle } from '@/components/shared/controller/camera-orbit'
import { ControllerColorRow } from '@/components/shared/controller/color-row'
import { ControllerCompound } from '@/components/shared/controller/compound'
import { ControllerInput } from '@/components/shared/controller/input'
import { ControllerRow } from '@/components/shared/controller/row'
import { ControllerSegmented } from '@/components/shared/controller/segmented'
import { ImageReferenceUpload } from '@/components/studio/image/image-reference-upload'
import {
	IMAGE_REFERENCE_UPLOAD_MAX_BYTES,
	IMAGE_REFERENCE_UPLOAD_MIME_TYPES,
} from '@/features/image-generation/domain/reference-image/contract'

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
				className="grid size-full place-items-center text-muted-foreground text-xs"
			>
				3D 미리보기를 불러오는 중…
			</div>
		),
	},
)

export type StudioCompound = {
	date: string
	colorMode: 'swatch' | 'custom'
	swatch: string
	foreground: string
	background: string
	referenceEnabled: boolean
	file: File | null
	fileError: string | null
	cameraEnabled: boolean
	azimuthDeg: number
	elevationDeg: number
}
type Props = { value: StudioCompound; onChange: (patch: Partial<StudioCompound>) => void }

const COLOR_MODES = [
	{ value: 'swatch', label: 'Swatch' },
	{ value: 'custom', label: 'Custom' },
] as const
const TOGGLE = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const
const PALETTE = [
	'#dcf5d2',
	'#73d75a',
	'#00af41',
	'#007332',
	'#00280a',
	'#dfe4f4',
	'#003087',
	'#000a32',
] as const
// Figma 328:6058의 조합 데이터. 실제 Studio에서는 프로파일의 색 선택지를 받는다.
const SWATCHES = [
	[1, 0],
	[1, 2],
	[1, 3],
	[1, 4],
	[0, 4],
	[0, 1],
	[0, 2],
	[0, 3],
	[3, 4],
	[3, 1],
	[3, 2],
	[3, 1],
	[6, 5],
	[5, 6],
	[6, 7],
].map(([foreground, background], index) => ({
	id: `swatch-${index + 1}`,
	label: `색 조합 ${index + 1}`,
	foreground: PALETTE[foreground],
	background: PALETTE[background],
}))
const AZIMUTHS = [
	{ value: 0, label: 'Front' },
	{ value: 45, label: 'Right ¾' },
	{ value: 90, label: 'Right' },
	{ value: 180, label: 'Back' },
	{ value: -90, label: 'Left' },
	{ value: -45, label: 'Left ¾' },
]
const ELEVATIONS = [
	{ value: 0, label: 'Front' },
	{ value: -20, label: 'Low' },
	{ value: 50, label: 'High' },
	{ value: 80, label: 'Top' },
]

export function StudioColorCompound({
	value,
	onChange,
	showDate = true,
	swatches = SWATCHES,
	allowCustom = true,
	disabled = false,
}: {
	value: Pick<StudioCompound, 'date' | 'colorMode' | 'swatch' | 'foreground' | 'background'>
	onChange: (
		patch: Partial<
			Pick<StudioCompound, 'date' | 'colorMode' | 'swatch' | 'foreground' | 'background'>
		>,
	) => void
	showDate?: boolean
	swatches?: readonly { id: string; label: string; foreground: string; background: string }[]
	allowCustom?: boolean
	disabled?: boolean
}) {
	const swatchName = useId()
	return (
		<div className="flex flex-col gap-4">
			{showDate && (
				<ControllerRow label="Date">
					<ControllerInput
						type="date"
						value={value.date}
						onChange={(event) => onChange({ date: event.target.value })}
						className="w-auto rounded-lg bg-foreground/5 px-1.5 font-mono text-xs"
					/>
				</ControllerRow>
			)}
			<ControllerCompound
				label="Color"
				control={
					<ControllerSegmented
						compact
						aria-label="Color 모드"
						options={allowCustom ? COLOR_MODES : COLOR_MODES.slice(0, 1)}
						disabled={disabled}
						value={value.colorMode}
						onChange={(colorMode) => onChange({ colorMode })}
					/>
				}
			>
				{value.colorMode === 'swatch' ? (
					<div
						role="radiogroup"
						aria-label="색 조합"
						className="grid grid-cols-5 gap-1.5 px-3 pt-2 pb-3"
					>
						{swatches.map((swatch) => (
							<label
								key={swatch.id}
								className="relative grid aspect-square cursor-pointer place-items-center rounded-full has-focus-visible:ring-2 has-focus-visible:ring-ring/50"
							>
								<input
									type="radio"
									name={swatchName}
									disabled={disabled}
									aria-label={swatch.label}
									title={swatch.label}
									checked={value.swatch === swatch.id}
									onChange={() =>
										onChange({
											swatch: swatch.id,
											foreground: swatch.foreground,
											background: swatch.background,
										})
									}
									className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full border border-foreground/15 outline-none checked:ring-2 checked:ring-foreground/40"
									style={{ backgroundColor: swatch.background }}
								/>
								<span
									aria-hidden="true"
									className="pointer-events-none relative size-6 rounded-full"
									style={{ backgroundColor: swatch.foreground }}
								/>
							</label>
						))}
					</div>
				) : (
					<div className="flex flex-col gap-1 p-1.5">
						{(['foreground', 'background'] as const).map((field) => (
							<ColorWithPalette
								key={field}
								label={field === 'foreground' ? 'Foreground' : 'Background'}
								value={value[field]}
								onChange={(hex) => onChange({ [field]: hex, swatch: '' })}
							/>
						))}
					</div>
				)}
			</ControllerCompound>
		</div>
	)
}

function ColorWithPalette({
	label,
	value,
	onChange,
}: {
	label: string
	value: string
	onChange: (hex: string) => void
}) {
	const name = useId()
	return (
		<div className="overflow-hidden rounded-lg bg-foreground/4">
			<ControllerColorRow
				label={label}
				value={value}
				onChange={onChange}
				className="rounded-none bg-transparent"
			/>
			<div
				role="radiogroup"
				aria-label={`${label} 팔레트`}
				className="flex justify-between gap-1 border-t border-border px-3 py-1.5"
			>
				{PALETTE.map((hex) => (
					<input
						key={hex}
						type="radio"
						name={name}
						aria-label={hex}
						title={hex}
						checked={value.toLowerCase() === hex}
						onChange={() => onChange(hex)}
						style={{ backgroundColor: hex }}
						className="size-6 shrink-0 cursor-pointer appearance-none rounded-sm border border-foreground/15 outline-none checked:ring-2 checked:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50"
					/>
				))}
			</div>
		</div>
	)
}

export function PlaygroundReferenceCompound({ value, onChange }: Props) {
	const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
	useEffect(() => {
		if (!value.file) {
			setPreview(null)
			return
		}
		const url = URL.createObjectURL(value.file)
		setPreview({ file: value.file, url })
		return () => URL.revokeObjectURL(url)
	}, [value.file])
	const url = preview?.file === value.file ? (preview?.url ?? null) : null
	return (
		<ControllerCompound
			label="Reference Image"
			control={
				<ControllerSegmented
					compact
					aria-label="Reference Image 사용"
					options={TOGGLE}
					value={value.referenceEnabled ? 'on' : 'off'}
					onChange={(next) => onChange({ referenceEnabled: next === 'on' })}
				/>
			}
		>
			{value.referenceEnabled && (
				<ImageReferenceUpload
					compact
					value={url}
					name={value.file?.name ?? null}
					error={value.fileError}
					disabled={false}
					onAttach={(file) => {
						if (!IMAGE_REFERENCE_UPLOAD_MIME_TYPES.some((type) => type === file.type))
							return onChange({
								fileError: 'PNG, JPEG, WebP 이미지를 선택해 주세요.',
							})
						if (file.size > IMAGE_REFERENCE_UPLOAD_MAX_BYTES)
							return onChange({ fileError: '10MB 이하의 이미지를 선택해 주세요.' })
						onChange({ file, fileError: null })
					}}
					onPreviewError={() =>
						onChange({
							file: null,
							fileError: '이미지를 읽지 못했습니다. 다른 이미지를 선택해 주세요.',
						})
					}
					onClear={() => onChange({ file: null, fileError: null })}
				/>
			)}
		</ControllerCompound>
	)
}

export function PlaygroundCameraCompound({ value, onChange }: Props) {
	const azimuth =
		AZIMUTHS.find(
			(option) =>
				option.value ===
				snapCameraAngle(
					value.azimuthDeg,
					AZIMUTHS.map((option) => option.value),
					true,
				),
		) ?? AZIMUTHS[0]
	const elevation =
		ELEVATIONS.find(
			(option) =>
				option.value ===
				snapCameraAngle(
					value.elevationDeg,
					ELEVATIONS.map((option) => option.value),
				),
		) ?? ELEVATIONS[0]
	return (
		<ControllerCompound
			label="Camera Control"
			control={
				<ControllerSegmented
					compact
					aria-label="Camera Control 사용"
					options={TOGGLE}
					value={value.cameraEnabled ? 'on' : 'off'}
					onChange={(next) => onChange({ cameraEnabled: next === 'on' })}
				/>
			}
		>
			{value.cameraEnabled && (
				<ControllerCameraControl
					contained
					axes={[
						{
							label: 'X',
							options: AZIMUTHS.map((option) => ({
								...option,
								value: String(option.value),
							})),
							value: String(azimuth.value),
							onChange: (next) => onChange({ azimuthDeg: Number(next) }),
						},
						{
							label: 'Y',
							options: ELEVATIONS.map((option) => ({
								...option,
								value: String(option.value),
							})),
							value: String(elevation.value),
							onChange: (next) => onChange({ elevationDeg: Number(next) }),
						},
					]}
				>
					<CameraOrbitControl
						seedImage="/guideline/reference/grid/application-brochure-body-01.webp"
						azimuthDeg={value.azimuthDeg}
						elevationDeg={value.elevationDeg}
						azimuthLabel={azimuth.label}
						elevationLabel={elevation.label}
						azimuthSteps={AZIMUTHS.map((option) => option.value)}
						elevationSteps={ELEVATIONS.map((option) => option.value)}
						onChange={onChange}
					/>
				</ControllerCameraControl>
			)}
		</ControllerCompound>
	)
}
