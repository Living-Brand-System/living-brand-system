'use client'

import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { useLayoutEffect, useRef, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export type GuidelineSelectionProps = {
	label: string
	value: string
	options: readonly { value: string; label: string; disabled?: boolean }[]
	onValueChange: (value: string) => void
}

export function GuidelineSelection(action: GuidelineSelectionProps) {
	const groupRef = useRef<HTMLDivElement>(null)
	const [plate, setPlate] = useState<{ left: number; width: number } | null>(null)
	const reducedMotion = useReducedMotion()

	useLayoutEffect(() => {
		const index = action.options.findIndex((option) => option.value === action.value)
		const selected = groupRef.current?.querySelectorAll<HTMLElement>(
			'[data-slot="toggle-group-item"]',
		)[index]
		setPlate(selected ? { left: selected.offsetLeft, width: selected.offsetWidth } : null)
	}, [action.value, action.options])

	return (
		<LazyMotion features={domAnimation}>
			<ToggleGroup
				ref={groupRef}
				type="single"
				aria-label={action.label}
				value={action.value}
				onValueChange={(value) => {
					if (value) action.onValueChange(value)
				}}
				spacing={1}
				className="relative isolate h-11 rounded-full bg-border p-1"
			>
				{plate && (
					<m.span
						aria-hidden="true"
						data-slot="guideline-card-toggle-backplate"
						className="pointer-events-none absolute inset-y-1 rounded-full bg-background"
						initial={false}
						animate={plate}
						transition={
							reducedMotion
								? { duration: 0 }
								: { type: 'spring', visualDuration: 0.2, bounce: 0.15 }
						}
					/>
				)}
				{action.options.map((option) => (
					<ToggleGroupItem
						key={option.value}
						value={option.value}
						disabled={option.disabled}
						className="relative z-10 h-9 rounded-full bg-transparent px-6 text-base text-muted-foreground transition-colors hover:bg-transparent aria-pressed:bg-transparent aria-pressed:text-foreground data-[state=on]:bg-transparent data-[state=on]:text-foreground data-[state=on]:hover:bg-transparent data-[state=on]:hover:text-foreground motion-reduce:transition-none"
					>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</LazyMotion>
	)
}
