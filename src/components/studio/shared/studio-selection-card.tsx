'use client'

import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { ControllerBrowser } from '@/components/shared/controller/browser'
import { ControllerRoot } from '@/components/shared/controller/layout'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
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

/**
 * 스튜디오의 Select Card(Figma `hd_lbs_interface` 448:9791) — 홈 · 편집 화면 좌상단 · Change 목록이 전부 이 카드다.
 * 버튼(Reset · Change 등)은 `onReset` · `actions`를 넘긴 자리에만 생긴다 — 고르는 자리는 안 넘겨서 숨긴다.
 * 🔑 폭에 비례해 그린다: 편집 화면(320px)에서 Figma 그대로이고, Change 목록(170px)에서도 같은 비율로 줄어든다.
 */
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
				// 높이는 카드 비율로 — Figma 128/320. 고정 px면 좁은 카드에서 그림 대부분을 덮는다.
				className="pointer-events-none absolute inset-x-0 top-0 h-2/5 bg-linear-to-b/srgb from-inverted to-inverted/0"
			/>
			<div className="relative flex items-start justify-between gap-2 text-inverted-foreground">
				<div className="min-w-0">
					<Typography size="sm" weight="medium" className="truncate">
						{title}
					</Typography>
					{subtitle && (
						<Typography size="xs" className="truncate">
							{subtitle}
						</Typography>
					)}
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

/**
 * 고르는 자리(스튜디오 홈 · Change 목록)의 정사각 타일 — 편집 화면 좌상단과 같은 틀(`ControllerRoot`)에
 * 같은 `StudioSelectionCard`를 담는다. 「홈에서 본 카드가 편집 화면에도 그대로」가 이 한 자리로 지켜진다.
 * 기본은 버튼이고, 링크는 `asChild`로 받는다. 현재 항목은 `aria-current`로 알린다.
 */
export function StudioSelectionTile({
	asChild,
	className,
	...props
}: ComponentProps<'button'> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : 'button'
	return (
		// data-slot은 틀에 둔다 — 안쪽 버튼은 `ControllerBrowser.Close asChild`가 자기 data-slot으로 덮는다.
		<ControllerRoot data-slot="studio-selection-tile" className="aspect-square lg:h-auto">
			<Comp
				className={cn(
					// 테두리는 썸네일 위에 그려야 보인다 — 카드가 판 전체를 덮으므로 위에 얹는 의사 요소로 그린다.
					'relative block size-full text-left outline-none after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-inset focus-visible:after:ring-2 focus-visible:after:ring-ring aria-[current=true]:after:ring-2 aria-[current=true]:after:ring-inverted-foreground/60',
					className,
				)}
				{...props}
			/>
		</ControllerRoot>
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
