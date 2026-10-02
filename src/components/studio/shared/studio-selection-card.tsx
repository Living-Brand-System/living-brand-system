'use client'

import type { ReactNode } from 'react'
import { ControllerBrowser } from '@/components/shared/controller/browser'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

export type StudioSelectionCardProps = {
	title: ReactNode
	subtitle?: ReactNode
	image?: StudioPreviewImage
	onReset?: () => void
	disabled?: boolean
	actions?: ReactNode
	children?: ReactNode
}

export function StudioSelectionCard({
	title,
	subtitle,
	image,
	onReset,
	disabled,
	actions,
	children,
}: StudioSelectionCardProps) {
	return (
		<div
			data-slot="studio-selection-card"
			className="light relative isolate flex h-full min-h-0 flex-col bg-muted p-4"
		>
			{image && (
				<ControllerBrowser.Thumbnail image={image} className="absolute inset-0 size-full" />
			)}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b/srgb from-inverted to-inverted/0"
			/>
			<div className="relative flex items-start justify-between gap-2 text-inverted-foreground">
				<div className="min-w-0">
					<Typography size="sm" weight="medium">
						{title}
					</Typography>
					{subtitle && <Typography size="xs">{subtitle}</Typography>}
				</div>
				<div className="flex shrink-0 gap-1">
					{onReset && (
						<Button
							size="sm"
							variant="outline"
							className="h-6.5 rounded-lg border-inverted-foreground/25 bg-transparent px-2.5 text-xs text-inverted-foreground hover:bg-inverted-foreground/10 hover:text-inverted-foreground"
							disabled={disabled}
							onClick={onReset}
						>
							Reset
						</Button>
					)}
					{actions}
				</div>
			</div>
			{children && <div className="relative mt-auto">{children}</div>}
		</div>
	)
}

export function StudioSelectionChange({
	children,
	label,
	tabs,
	empty,
	disabled,
}: {
	children: ReactNode
	label: string
	tabs?: readonly string[]
	empty?: ReactNode
	disabled?: boolean
}) {
	return (
		<ControllerBrowser.Item>
			<ControllerBrowser.Trigger asChild>
				<Button
					size="sm"
					variant="muted"
					aria-label={label}
					disabled={disabled}
					className="h-6.5 rounded-lg bg-inverted-foreground/25 px-2.5 text-xs text-inverted-foreground hover:bg-inverted-foreground/35"
				>
					Change
				</Button>
			</ControllerBrowser.Trigger>
			<ControllerBrowser.Panel side="right" tabs={tabs ?? [label]} empty={empty}>
				<div className="p-4">{children}</div>
			</ControllerBrowser.Panel>
		</ControllerBrowser.Item>
	)
}
