'use client'

import { useState } from 'react'
import { ControllerCompound } from '@/components/shared/controller'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import type { ControllerWidgetProps } from '@/components/studio/panel/studio-panel-slot'
import { StudioColorCompound } from '@/components/studio/shared/compound-controls'
import {
	type ControllerControlDefinition,
	type ControllerControlValue,
	type ControllerValues,
	resolveControlAvailability,
} from '@/modules/studio-controller/controller-definition'

export type ColorPairWidgetProps = ControllerWidgetProps & {
	/**
	 * 고른 모드·스와치를 기억하는 단위. 패널이 남은 채 대상만 바뀌면(템플릿 배경의 그래픽 교체·이미지 슬롯의
	 * 프로파일 교체) 처음부터 본다.
	 */
	identity?: string
	/**
	 * 고른 전경·배경 → 쓸 값들. 런타임이 전경을 여러 색으로 펼칠 때(Fluted Glass 스펙트럼) 준다.
	 * 없으면 두 멤버에 그대로 쓴다.
	 */
	spread?: (
		foreground: string,
		background: string,
	) => Readonly<Record<string, ControllerControlValue>>
	/** 값에 따라 달라지는 지금의 컨트롤 정의 — 면이 선의 허용 범위를 정하는 런타임(그래픽)이 준다. */
	resolveControls?: (values: ControllerValues) => readonly ControllerControlDefinition[]
}

/**
 * 전경·배경 한 쌍(`color-pair` 묶음, docs/10 §3.7) — 그래픽·이미지·템플릿 이미지 슬롯이 같은 위젯을 쓴다.
 * - 두 칸이 자유 색이고 조작 가능하면 Swatch/Custom(CMS 브랜드 조합 + 자유 색).
 * - 둘 다 색 선택지면 허용 조합만 스와치로(Figma 529:23010 — 선의 허용 범위가 면을 따른다).
 * - 어느 쪽도 아니면(프로파일이 색을 좁혔거나 잠갔다) 멤버를 행으로 둔다.
 * 도메인마다 다른 것은 `spread`·`resolveControls` 두 가지뿐이고, 부르는 쪽 레지스트리가 넘긴다.
 */
export function ColorPairWidget({
	identity = '',
	spread,
	resolveControls,
	...props
}: ColorPairWidgetProps) {
	const { cluster, controls, values, bindings, onChange } = props
	const [stored, setStored] = useState<{
		identity: string
		colorMode: 'swatch' | 'custom'
		swatch: string
		foreground?: string
	}>({ identity, colorMode: 'swatch', swatch: '' })
	const palette =
		stored.identity === identity
			? stored
			: { identity, colorMode: 'swatch' as const, swatch: '' }
	const foregroundId = cluster.members.foreground
	const backgroundId = cluster.members.background
	const enabled = (control: ControllerControlDefinition | undefined) =>
		control !== undefined &&
		resolveControlAvailability(control, bindings?.[control.id]) === 'enabled'
	const colors = Object.values(controls).filter((control) => control.kind === 'color')
	const free =
		controls.foreground?.kind === 'color' &&
		controls.background?.kind === 'color' &&
		colors.every((control) => !control.values && enabled(control))
	const back = String(values[backgroundId] ?? '#ffffff')

	if (free) {
		const write =
			spread ??
			((foreground: string, background: string) => ({
				[foregroundId]: foreground,
				[backgroundId]: background,
			}))
		// 런타임이 전경을 다른 색으로 펼치면(Fluted Glass 스펙트럼) 저장값은 고른 색이 아니다 — 고른 색이
		// 지금 값을 낸 그대로일 때만 고른 색을 보여 준다(리셋·프리셋 뒤에는 저장값으로 돌아간다).
		const foreground =
			palette.foreground !== undefined &&
			write(palette.foreground, back)[foregroundId] === values[foregroundId]
				? palette.foreground
				: String(values[foregroundId] ?? '#000000')
		return (
			<StudioColorCompound
				value={{
					colorMode: palette.colorMode,
					swatch: palette.swatch,
					foreground,
					background: back,
				}}
				onChange={(patch) => {
					setStored({
						identity,
						colorMode: patch.colorMode ?? palette.colorMode,
						swatch: patch.swatch ?? palette.swatch,
						foreground: patch.foreground ?? palette.foreground,
					})
					if (patch.foreground === undefined && patch.background === undefined) return
					for (const [id, next] of Object.entries(
						write(patch.foreground ?? foreground, patch.background ?? back),
					))
						onChange(id, next)
				}}
			/>
		)
	}

	const background = controls.background
	const swatches =
		background?.kind === 'select'
			? background.options.flatMap((plane) => {
					const line = resolveControls
						? resolveControls({ ...values, [backgroundId]: plane.value }).find(
								(control) => control.id === foregroundId,
							)
						: controls.foreground
					const fill = plane.colors?.[0]
					if (line?.kind !== 'select' || !fill) return []
					return line.options.flatMap((option) =>
						option.colors?.[0]
							? [
									{
										id: `${plane.value}:${option.value}`,
										label: `${plane.label} · ${option.label}`,
										background: fill,
										foreground: option.colors[0],
									},
								]
							: [],
					)
				})
			: []
	if (!swatches.length) return <ColorRows {...props} />
	const current = swatches.find(
		(swatch) => swatch.id === `${values[backgroundId]}:${values[foregroundId]}`,
	)
	return (
		<StudioColorCompound
			allowCustom={false}
			swatches={swatches}
			disabled={![background, controls.foreground].every(enabled)}
			value={{
				colorMode: 'swatch',
				swatch: current?.id ?? '',
				foreground: current?.foreground ?? '#000000',
				background: current?.background ?? back,
			}}
			onChange={(patch) => {
				if (!patch.swatch) return
				const [plane, line] = patch.swatch.split(':')
				// 면을 먼저 바꾼다 — 선의 허용 범위가 면을 따른다.
				onChange(backgroundId, plane)
				onChange(foregroundId, line)
			}}
		/>
	)
}

/** 스와치를 만들 수 없을 때 — 색 멤버를 행으로 둔다. 색 멤버가 없으면 그리지 않는다. */
export function ColorRows({
	cluster,
	controls,
	values,
	bindings,
	onChange,
}: ControllerWidgetProps) {
	const rows = Object.values(controls).filter(
		(control) =>
			control.kind === 'color' ||
			(control.kind === 'select' && control.options.some((option) => option.colors?.length)),
	)
	if (!rows.length) return null
	return (
		<ControllerCompound label={cluster.title}>
			{/* 🔑 muted 표면 위의 행은 foreground 겹침으로 띄운다 — 같은 bg-muted면 행이 보이지 않는다. */}
			<div className="flex flex-col gap-1 p-1.5 [&_[data-slot=controller-row]]:bg-foreground/4">
				{rows.map((control) => (
					<ControllerControlRenderer
						key={control.id}
						definition={control}
						value={values[control.id]}
						binding={bindings?.[control.id]}
						onChange={(next) => onChange(control.id, next)}
					/>
				))}
			</div>
		</ControllerCompound>
	)
}
