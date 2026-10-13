'use client'

import { cva } from 'class-variance-authority'
import type { ComponentProps, ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const iconVariants = cva('size-11 rounded-lg p-0 disabled:opacity-100', {
	variants: {
		state: {
			active: 'border-muted bg-background text-foreground shadow-lg hover:bg-background',
			idle: 'bg-muted text-studio-rail-idle-foreground hover:bg-muted hover:text-foreground',
			disabled: 'bg-primary-foreground text-border shadow-none',
		},
	},
	defaultVariants: { state: 'idle' },
})

type StudioRailIconProps = Omit<ComponentProps<'button'>, 'children'> & {
	/** Figma 원본 SVG 이름, 또는 그 원본이 없는 버튼(Manager mode 등)의 `@carbon/icons-react` 아이콘. */
	icon: 'basic' | 'presets' | 'adjustment' | ReactElement
	label: string
	state?: 'active' | 'disabled' | 'idle'
}

/** 버튼 상태와 접근성은 함께 바뀐다. 아이콘은 Figma 원본 SVG의 윤곽을 사용한다. */
export function StudioRailIcon({
	icon,
	label,
	state = 'idle',
	disabled,
	className,
	...props
}: StudioRailIconProps) {
	const resolved = disabled ? 'disabled' : state
	return (
		<Button
			{...props}
			type="button"
			variant="ghost"
			size="icon"
			data-slot="studio-rail-icon"
			data-state={resolved}
			aria-label={label}
			aria-pressed={resolved === 'active'}
			title={label}
			disabled={resolved === 'disabled'}
			className={cn(iconVariants({ state: resolved }), className)}
		>
			{typeof icon === 'string' ? (
				<span
					aria-hidden="true"
					data-icon="only"
					className="block size-5 bg-current mask-center mask-no-repeat"
					style={{ maskImage: `url(/studio/rail/${icon}.svg)` }}
				/>
			) : (
				<span
					aria-hidden="true"
					data-icon="only"
					className="flex size-5 items-center justify-center [&_svg]:size-5"
				>
					{icon}
				</span>
			)}
		</Button>
	)
}

/** 패널 상태는 호출자가 소유하고, 레일은 44px 폭과 6px 간격만 소유한다. */
export function StudioRail({ children, className, ...props }: ComponentProps<'nav'>) {
	return (
		<nav
			aria-label="편집 도구 보기"
			{...props}
			data-slot="studio-rail"
			className={cn('flex w-11 shrink-0 flex-col items-start gap-1.5', className)}
		>
			{children ?? <StudioRailIcon icon="basic" label="Basic" state="active" />}
		</nav>
	)
}
