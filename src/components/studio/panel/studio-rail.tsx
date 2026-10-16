'use client'

import { cva } from 'class-variance-authority'
import type { ComponentProps, ReactElement } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 고른 탭은 레일(muted)보다 한 단계 떠오른 면이다. 다크에서는 배경이 muted보다 어두워 꺼져 보이므로 밝게 띄운다(사용자 QA 2026-10-16).
const ACTIVE =
	'border-muted bg-background text-foreground shadow-lg hover:bg-background dark:bg-foreground/20 dark:hover:bg-foreground/20'

const iconVariants = cva('size-11 rounded-lg p-0 disabled:opacity-100', {
	variants: {
		state: {
			active: ACTIVE,
			idle: 'bg-muted text-studio-rail-idle-foreground hover:bg-muted hover:text-foreground',
			disabled: 'bg-primary-foreground text-border shadow-none',
			// 패널 탭이 아닌 동작 버튼(레일 아래 Manager mode 등) — 탭의 Active와 같은 생김새, 눌림 상태는 없다(사용자 2026-10-14).
			action: ACTIVE,
			// 켜진 모드 — 바탕은 Button의 `highlight`(Output 「저장」과 같은 것)가 칠한다.
			highlight: 'shadow-lg',
		},
	},
	defaultVariants: { state: 'idle' },
})

type StudioRailIconProps = Omit<ComponentProps<'button'>, 'children'> & {
	/** Figma 원본 SVG 이름, 또는 그 원본이 없는 버튼(Manager mode 등)의 `@carbon/icons-react` 아이콘. */
	icon: 'basic' | 'presets' | 'adjustment' | ReactElement
	label: string
	state?: 'active' | 'disabled' | 'idle' | 'action' | 'highlight'
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
			variant={resolved === 'highlight' ? 'highlight' : 'ghost'}
			size="icon"
			data-slot="studio-rail-icon"
			data-state={resolved}
			aria-label={label}
			// 탭(active·idle)과 켜고 끄는 모드(highlight)만 눌림 상태가 있다. 동작 버튼(action)은 없다.
			aria-pressed={
				resolved === 'active' || resolved === 'highlight'
					? true
					: resolved === 'idle'
						? false
						: undefined
			}
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
			// 레일은 배경 없이 패널 내용 열보다 위에 선다 — 플로팅 층이 열리면 밀려난 아래 층이 레일 아래로 들어간다.
			className={cn(
				'relative z-10 flex w-11 shrink-0 flex-col items-start gap-1.5',
				className,
			)}
		>
			{children ?? <StudioRailIcon icon="basic" label="Basic" state="active" />}
		</nav>
	)
}
