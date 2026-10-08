'use client'

import { useId } from 'react'
import {
	ControllerColorRow,
	ControllerCompound,
	ControllerReveal,
	ControllerSegmented,
	ControllerSwatch,
} from '@/components/shared/controller'
import {
	type BrandColorPairSwatch,
	usePublishedBrandColorPairs,
} from '@/features/template-core/hooks/use-published-brand-color-pairs'

export type StudioCompound = {
	colorMode: 'swatch' | 'custom'
	swatch: string
	foreground: string
	background: string
}

const COLOR_MODES = [
	{ value: 'swatch', label: 'Swatch' },
	{ value: 'custom', label: 'Custom' },
] as const

type ColorCompoundProps = {
	value: StudioCompound
	onChange: (patch: Partial<StudioCompound>) => void
	/** 없으면 CMS `brand-color-pairs` 정본을 쓴다. 런타임이 조합을 정하는 그래픽만 직접 넘긴다. */
	swatches?: readonly BrandColorPairSwatch[]
	allowCustom?: boolean
	disabled?: boolean
}

export function StudioColorCompound(props: ColorCompoundProps) {
	return props.swatches ? (
		<ColorCompound {...props} swatches={props.swatches} />
	) : (
		<BrandColorCompound {...props} />
	)
}

function BrandColorCompound(props: ColorCompoundProps) {
	return <ColorCompound {...props} swatches={usePublishedBrandColorPairs()} />
}

function ColorCompound({
	value,
	onChange,
	swatches,
	allowCustom = true,
	disabled = false,
}: ColorCompoundProps & { swatches: readonly BrandColorPairSwatch[] }) {
	const swatchName = useId()
	// Custom 모드의 빠른 선택 칩은 스와치에 쓰인 색에서 뽑는다 — 따로 적은 팔레트가 정본과 갈리지 않게.
	const palette = [
		...new Set(swatches.flatMap((swatch) => [swatch.background, swatch.foreground])),
	]
	return (
		<ControllerReveal gap={4}>
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
							// 라디오가 칸 전체를 덮고 안쪽 점은 포인터를 통과시키므로 감싸는 요소는 라벨일 필요가 없다.
							<div
								key={swatch.id}
								className="relative grid aspect-square place-items-center"
							>
								<ControllerSwatch
									shape="round"
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
									className="absolute inset-0 size-full"
									style={{ backgroundColor: swatch.background }}
								/>
								<span
									aria-hidden="true"
									className="pointer-events-none relative size-6 rounded-full"
									style={{ backgroundColor: swatch.foreground }}
								/>
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col gap-1 p-1.5">
						{(['foreground', 'background'] as const).map((field) => (
							<ColorWithPalette
								key={field}
								label={field === 'foreground' ? 'Foreground' : 'Background'}
								value={value[field]}
								palette={palette}
								onChange={(hex) => onChange({ [field]: hex, swatch: '' })}
							/>
						))}
					</div>
				)}
			</ControllerCompound>
		</ControllerReveal>
	)
}

function ColorWithPalette({
	label,
	value,
	palette,
	onChange,
}: {
	label: string
	value: string
	palette: readonly string[]
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
				{palette.map((hex) => (
					<ControllerSwatch
						key={hex}
						name={name}
						aria-label={hex}
						title={hex}
						checked={value.toLowerCase() === hex.toLowerCase()}
						onChange={() => onChange(hex)}
						style={{ backgroundColor: hex }}
						className="size-6"
					/>
				))}
			</div>
		</div>
	)
}
