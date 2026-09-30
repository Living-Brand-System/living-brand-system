'use client'

import { Renew } from '@carbon/icons-react'
import { type CSSProperties, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PaletteGroup } from '@/features/guideline/domain/contract/palette'
import { getContrastingForeground, hexToRgb } from '@/lib/color'
import {
	combineEndActions,
	GuidelineCardActions,
	type GuidelineDisplayActions,
	useGuidelineCopy,
} from './card-actions'
import { GuidelineDisplayFrame } from './grid'

export type Color = { label: string; value: string }

export function GuidelineColorSwatch({ color }: { color: Color }) {
	const { status, message, copy } = useGuidelineCopy()
	const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
	const hint = useRef<HTMLSpanElement>(null)
	return (
		<button
			type="button"
			aria-label={`${color.label} 색상값 복사`}
			disabled={status === 'pending'}
			onClick={() => void copy(color.value)}
			onMouseMove={(event) =>
				setPointer({
					x: Math.max(
						8,
						Math.min(
							event.clientX + 12,
							window.innerWidth - (hint.current?.offsetWidth ?? 180) - 8,
						),
					),
					y: Math.max(
						8,
						Math.min(
							event.clientY + 12,
							window.innerHeight - (hint.current?.offsetHeight ?? 38) - 8,
						),
					),
				})
			}
			onMouseLeave={() => setPointer(null)}
			onBlur={() => setPointer(null)}
			className="min-w-0 flex-1 cursor-pointer focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
			style={{ backgroundColor: color.value }}
		>
			<span role="status" className="sr-only">
				{message}
			</span>
			{pointer &&
				createPortal(
					<span
						ref={hint}
						aria-hidden="true"
						data-slot="copy-cursor-hint"
						className="pointer-events-none fixed z-50 rounded-[8px] bg-background/60 px-3 py-[7px] font-body text-base font-semibold leading-6 whitespace-nowrap text-foreground backdrop-blur-[8px]"
						style={{ left: pointer.x, top: pointer.y }}
					>
						{status === 'copied'
							? 'Copied'
							: status === 'failed'
								? message
								: 'Copy to clipboard'}
					</span>,
					document.body,
				)}
		</button>
	)
}

export function GuidelineLogoBackgroundDisplay({
	colors,
	logos,
	opacity = 1,
	underlay = '#FFFFFF',
	actions,
}: {
	colors: Color[]
	logos: { black: string; white: string }
	opacity?: number
	underlay?: string
	actions?: GuidelineDisplayActions
}) {
	const [value, setValue] = useState(colors[0]?.value ?? '#FFFFFF')
	const base = hexToRgb(underlay)
	const selected = hexToRgb(value)
	const alpha = Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 1
	const composite = `#${(['r', 'g', 'b'] as const)
		.map((key) =>
			Math.round(selected[key] * alpha + base[key] * (1 - alpha))
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`
	const logo = getContrastingForeground(composite) === '#000000' ? logos.black : logos.white
	if (!colors.length) return null
	return (
		<GuidelineDisplayFrame
			style={{ '--guideline-display-background': composite } as CSSProperties}
		>
			<div className="absolute inset-6 flex items-center justify-center">
				{/* biome-ignore lint/performance/noImgElement: public 정본 로고를 표시합니다. */}
				<img
					src={logo}
					alt="배경색 위의 HD현대 로고"
					className="max-h-full w-4/5 object-contain"
				/>
			</div>
			<GuidelineCardActions
				start={actions?.start}
				end={combineEndActions(
					{
						kind: 'group',
						label: '배경색 액션',
						actions: [
							{
								id: 'color',
								kind: 'color',
								label: '배경색',
								value,
								presets: colors,
								onValueChange: setValue,
							},
							{
								id: 'reset',
								kind: 'button',
								label: '배경색 초기화',
								icon: <Renew size={17} />,
								onClick: () => setValue(colors[0].value),
							},
						],
					},
					actions?.end,
				)}
			/>
		</GuidelineDisplayFrame>
	)
}

export type GuidelineColorGroup = PaletteGroup

export function GuidelineColorPaletteDisplay({
	groups,
	layout = 'uniform',
	actions,
}: {
	groups: readonly GuidelineColorGroup[]
	layout?: 'uniform' | 'ranked'
	actions?: GuidelineDisplayActions
}) {
	const rows = groups.filter((group) => group.colors.length)
	if (!rows.length) return null
	const rowCount = Math.max(...rows.map((group) => group.colors.length))
	return (
		<GuidelineDisplayFrame>
			<div className="absolute inset-0 flex">
				{rows.map((group, index) => (
					<fieldset
						key={group.id}
						aria-label={group.name}
						className="m-0 grid min-h-0 min-w-0 border-0 p-0"
						style={{
							flex: layout === 'ranked' ? rows.length - index : 1,
							gridTemplateRows: `repeat(${layout === 'uniform' ? rowCount : group.colors.length}, minmax(0, 1fr))`,
						}}
					>
						{group.colors.map((color) => (
							<GuidelineColorSwatch key={color.id} color={color} />
						))}
					</fieldset>
				))}
			</div>
			<GuidelineCardActions
				start={actions?.start}
				end={combineEndActions(
					{
						kind: 'copy',
						label: '팔레트 전체 복사',
						value: rows
							.map(
								(group) =>
									`${group.name}\n${group.colors.map((color) => `${color.label}: ${color.value}`).join('\n')}`,
							)
							.join('\n\n'),
					},
					actions?.end,
				)}
			/>
		</GuidelineDisplayFrame>
	)
}
