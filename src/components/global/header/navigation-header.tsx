'use client'

import { Chat, Menu, Search } from '@carbon/icons-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

const navigationHeaderLinkVariants = cva(
	'relative inline-flex shrink-0 items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30',
	{
		variants: {
			current: {
				false: 'text-muted-foreground',
				true: 'text-foreground',
			},
			surface: {
				compact: 'h-9 w-full justify-between',
				grouped: 'my-0.5 h-8 rounded-lg px-3',
				standalone: 'h-9 rounded-lg bg-muted px-3',
			},
		},
		compoundVariants: [
			{
				className: 'hover:text-foreground',
				current: false,
				surface: 'grouped',
			},
			{
				className: 'hover:bg-muted hover:text-foreground',
				current: false,
				surface: 'standalone',
			},
			{
				className: 'bg-muted',
				current: true,
				surface: 'standalone',
			},
		],
		defaultVariants: {
			current: false,
			surface: 'standalone',
		},
	},
)

const navigationHeaderLinkLabelVariants = cva('', {
	variants: {
		current: {
			false: null,
			true: null,
		},
		surface: {
			compact: 'rounded-lg px-3 py-2',
			grouped: null,
			standalone: null,
		},
	},
	compoundVariants: [
		{
			className: 'bg-muted text-foreground',
			current: true,
			surface: 'compact',
		},
	],
})

const navigationHeaderSearchTriggerVariants = cva('', {
	variants: {
		projection: {
			compact: 'size-9.5 rounded-lg bg-muted p-2 text-foreground hover:bg-muted/80',
			// 배경·높이·radius를 nav 링크 그룹과 같게 맞춘다(`bg-muted h-9 rounded-lg`).
			// hover 배경은 뺐다 — 기본이 이미 muted라 `hover:bg-muted`가 아무 일도 하지 않는다.
			desktop:
				'h-9 w-46 justify-between rounded-lg bg-muted pl-4 pr-2 text-muted-foreground hover:text-foreground',
		},
	},
	defaultVariants: { projection: 'desktop' },
})

const navigationHeaderChatTriggerVariants = cva('', {
	variants: {
		projection: {
			compact: 'size-9.5 rounded-lg bg-muted p-2 text-foreground hover:bg-muted/80',
			desktop: 'h-9 rounded-lg bg-background px-6 text-foreground shadow-sm hover:bg-muted',
		},
	},
	defaultVariants: { projection: 'desktop' },
})

type NavigationHeaderRootProps = React.ComponentProps<'header'>

function NavigationHeaderRoot({ className, ...props }: NavigationHeaderRootProps) {
	return (
		<header
			data-slot="navigation-header"
			className={cn(
				'relative z-50 shrink-0 overflow-visible bg-header-background',
				className,
			)}
			{...props}
		/>
	)
}

function NavigationHeaderDesktop({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="navigation-header-desktop"
			className={cn(
				'hidden h-(--global-header-height) grid-cols-3 items-center px-5 xl:grid',
				className,
			)}
			{...props}
		/>
	)
}

function NavigationHeaderCompact({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="navigation-header-compact"
			className={cn('flex flex-col xl:hidden', className)}
			{...props}
		/>
	)
}

function NavigationHeaderCompactBar({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="navigation-header-compact-bar"
			className={cn(
				'flex h-[50px] shrink-0 items-center justify-between px-3 pt-3',
				className,
			)}
			{...props}
		/>
	)
}

function NavigationHeaderCompactActions({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="navigation-header-compact-actions"
			className={cn('flex items-center gap-2', className)}
			{...props}
		/>
	)
}

function NavigationHeaderCompactBody({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="navigation-header-compact-body"
			className={cn('flex shrink-0 items-start p-3', className)}
			{...props}
		/>
	)
}

function NavigationHeaderCompactContent({ className, ...props }: React.ComponentProps<'nav'>) {
	return (
		<nav
			data-slot="navigation-header-compact-content"
			className={cn(
				'flex w-full flex-col gap-2 overflow-hidden rounded-xl bg-background p-3',
				className,
			)}
			{...props}
		/>
	)
}

function NavigationHeaderCompactLinkGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="navigation-header-compact-link-group"
			className={cn('flex w-full flex-col gap-1', className)}
			{...props}
		/>
	)
}

function NavigationHeaderCompactSeparator({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="navigation-header-compact-separator"
			className={cn('flex h-1 w-full items-center px-1', className)}
			{...props}
		>
			<Separator />
		</div>
	)
}

function NavigationHeaderStart({ className, ...props }: React.ComponentProps<'section'>) {
	return (
		<section
			data-slot="navigation-header-start"
			className={cn('flex items-center justify-self-start', className)}
			{...props}
		/>
	)
}

function NavigationHeaderCenter({ className, ...props }: React.ComponentProps<'nav'>) {
	return (
		<nav
			data-slot="navigation-header-center"
			className={cn('flex items-center gap-4 justify-self-center', className)}
			{...props}
		/>
	)
}

function NavigationHeaderEnd({ className, ...props }: React.ComponentProps<'section'>) {
	return (
		<section
			data-slot="navigation-header-end"
			className={cn('flex min-w-0 items-center justify-self-end gap-2', className)}
			{...props}
		/>
	)
}

type NavigationHeaderLinkProps = Omit<React.ComponentProps<typeof Link>, 'children' | 'className'> &
	VariantProps<typeof navigationHeaderLinkVariants> & {
		className?: string
		hasUpdate?: boolean
		label: string
	}

function NavigationHeaderLink({
	className,
	current = false,
	hasUpdate = false,
	label,
	surface = 'standalone',
	...props
}: NavigationHeaderLinkProps) {
	return (
		<Link
			data-slot="navigation-header-link"
			data-surface={surface}
			aria-current={current ? 'page' : undefined}
			className={cn(navigationHeaderLinkVariants({ current, surface }), className)}
			{...props}
		>
			<Typography
				as="span"
				className={navigationHeaderLinkLabelVariants({ current, surface })}
				size="sm"
				weight="medium"
			>
				{label}
			</Typography>
			{hasUpdate && (
				<Badge
					className={cn(
						'pointer-events-none h-4.5 py-0 leading-none',
						'px-1',
						surface !== 'compact' && 'absolute left-1/2 -translate-x-1/2',
						surface === 'grouped' && 'top-10',
						surface === 'standalone' && 'top-10.5',
					)}
				>
					Update
				</Badge>
			)}
		</Link>
	)
}

type NavigationHeaderLinkItem = {
	current?: boolean
	hasUpdate?: boolean
	href: React.ComponentProps<typeof Link>['href']
	label: string
}

type NavigationHeaderLinkGroupProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	items: readonly NavigationHeaderLinkItem[]
}

type NavigationHeaderActionProps = Omit<React.ComponentProps<'button'>, 'children'> &
	VariantProps<typeof navigationHeaderLinkVariants> & {
		label: string
	}

/**
 * 링크와 **같은 모양의 버튼.** 헤더 항목이 이동이 아니라 동작일 때(로그아웃) 쓴다.
 *
 * 🔴 클래스를 베껴 쓰지 않고 `navigationHeaderLinkVariants`를 그대로 공유한다 — 같은 알약이
 *    두 자리에서 각자 정의되면 한쪽만 바뀌어 어긋난다(docs/09 §9).
 */
function NavigationHeaderAction({
	className,
	current = false,
	label,
	surface = 'standalone',
	...props
}: NavigationHeaderActionProps) {
	return (
		<button
			data-slot="navigation-header-action"
			data-surface={surface}
			className={cn(navigationHeaderLinkVariants({ current, surface }), className)}
			type="button"
			{...props}
		>
			<Typography
				as="span"
				className={navigationHeaderLinkLabelVariants({ current, surface })}
				size="sm"
				weight="medium"
			>
				{label}
			</Typography>
		</button>
	)
}

function NavigationHeaderLinkGroup({ className, items, ...props }: NavigationHeaderLinkGroupProps) {
	const groupRef = React.useRef<HTMLDivElement>(null)
	const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null)
	const [chaser, setChaser] = React.useState<{ left: number; width: number } | null>(null)
	const reducedMotion = useReducedMotion()
	const currentIndex = items.findIndex((item) => item.current)
	const targetIndex = hoveredIndex ?? (currentIndex >= 0 ? currentIndex : null)

	// 링크의 실측 폭을 따라가므로 라벨 길이가 달라도 체이서가 정확히 맞는다.
	React.useLayoutEffect(() => {
		const target = groupRef.current?.querySelector<HTMLElement>(
			`[data-chaser-index="${targetIndex}"]`,
		)
		setChaser(target ? { left: target.offsetLeft, width: target.offsetWidth } : null)
	}, [targetIndex])

	return (
		<div
			ref={groupRef}
			data-slot="navigation-header-link-group"
			className={cn('relative flex h-9 items-start rounded-lg bg-muted', className)}
			{...props}
		>
			{chaser && (
				<LazyMotion features={domAnimation}>
					<m.div
						aria-hidden
						data-target-index={targetIndex}
						data-slot="navigation-header-link-chaser"
						className="pointer-events-none absolute inset-y-0.5 z-0 rounded-lg bg-foreground/5"
						initial={false}
						animate={chaser}
						transition={
							reducedMotion
								? { duration: 0 }
								: { type: 'spring', visualDuration: 0.2, bounce: 0.15 }
						}
					/>
				</LazyMotion>
			)}
			{items.map((item, index) => (
				<NavigationHeaderLink
					data-chaser-index={index}
					key={String(item.href)}
					onBlur={() => setHoveredIndex(null)}
					onFocus={() => setHoveredIndex(index)}
					onMouseLeave={() => setHoveredIndex(null)}
					onMouseEnter={() => setHoveredIndex(index)}
					className="z-10"
					surface="grouped"
					{...item}
				/>
			))}
		</div>
	)
}

function NavigationHeaderSymbolLink({
	className,
	...props
}: Omit<React.ComponentProps<typeof Link>, 'children'>) {
	return (
		<Link
			data-slot="navigation-header-symbol-link"
			aria-label="메인으로 이동"
			// 마크만 있던 자리에 HD 락업이 들어간다 — 2.3:1이라 정사각형에 넣으면 찌그러진다.
			className={cn(
				'flex h-8 shrink-0 items-center justify-center rounded-full bg-foreground px-2.5 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/30',
				className,
			)}
			{...props}
		>
			<Image
				alt=""
				// 🔴 높이 16px이 규정 최소 크기다(docs/12 「색과 최소 크기」). 더 줄이지 말 것.
				className="h-4 w-auto dark:brightness-0"
				height={16}
				src="/logos/logo_wht.svg"
				width={37}
			/>
		</Link>
	)
}

function NavigationHeaderSeparator({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div data-slot="navigation-header-separator" className={cn('h-6', className)} {...props}>
			<Separator className="h-full" orientation="vertical" />
		</div>
	)
}

type NavigationHeaderSearchTriggerProps = Omit<React.ComponentProps<typeof Button>, 'children'> & {
	label?: string
	open: boolean
	projection?: 'compact' | 'desktop'
	shortcut?: readonly string[]
}

function NavigationHeaderSearchTrigger({
	className,
	label = 'Search',
	open,
	projection = 'desktop',
	shortcut = ['⌘', 'K'],
	...props
}: NavigationHeaderSearchTriggerProps) {
	return (
		<Button
			data-slot="navigation-header-search-trigger"
			aria-expanded={open}
			aria-haspopup="dialog"
			variant="ghost"
			className={cn(navigationHeaderSearchTriggerVariants({ projection }), className)}
			{...props}
		>
			{projection === 'compact' ? (
				<Search aria-hidden data-icon="only" className="size-5.5" />
			) : (
				<>
					<Typography as="span" size="sm" weight="medium">
						{label}
					</Typography>
					<KbdGroup className="gap-0.5">
						{shortcut.map((key) => (
							// nav 그룹의 hover 체이서와 같은 면 — 불투명 muted가 아니라 알파 5%다.
							<Kbd className="size-6 rounded-md bg-foreground/5 px-1" key={key}>
								{key}
							</Kbd>
						))}
					</KbdGroup>
				</>
			)}
		</Button>
	)
}

type NavigationHeaderChatTriggerProps = Omit<
	React.ComponentProps<typeof SidebarTrigger>,
	'children'
> & {
	projection?: 'compact' | 'desktop'
}

function NavigationHeaderChatTrigger({
	className,
	projection = 'desktop',
	...props
}: NavigationHeaderChatTriggerProps) {
	return (
		<SidebarTrigger
			data-slot="navigation-header-chat-trigger"
			aria-label="Chat"
			className={cn(navigationHeaderChatTriggerVariants({ projection }), className)}
			{...props}
		>
			{projection === 'compact' ? (
				<Chat aria-hidden data-icon="only" className="size-5.5" />
			) : (
				'Chat'
			)}
		</SidebarTrigger>
	)
}

function NavigationHeaderMenuTrigger({
	className,
	...props
}: Omit<React.ComponentProps<typeof Button>, 'children'>) {
	return (
		<Button
			data-slot="navigation-header-menu-trigger"
			aria-label="메뉴"
			variant="muted"
			className={cn('size-9.5 rounded-lg p-2 text-foreground', className)}
			{...props}
		>
			<Menu aria-hidden data-icon="only" className="size-5.5" />
		</Button>
	)
}

const NavigationHeader = {
	Action: NavigationHeaderAction,
	Center: NavigationHeaderCenter,
	ChatTrigger: NavigationHeaderChatTrigger,
	Compact: NavigationHeaderCompact,
	CompactActions: NavigationHeaderCompactActions,
	CompactBar: NavigationHeaderCompactBar,
	CompactBody: NavigationHeaderCompactBody,
	CompactContent: NavigationHeaderCompactContent,
	CompactLinkGroup: NavigationHeaderCompactLinkGroup,
	CompactSeparator: NavigationHeaderCompactSeparator,
	Desktop: NavigationHeaderDesktop,
	End: NavigationHeaderEnd,
	Link: NavigationHeaderLink,
	LinkGroup: NavigationHeaderLinkGroup,
	MenuTrigger: NavigationHeaderMenuTrigger,
	Root: NavigationHeaderRoot,
	SearchTrigger: NavigationHeaderSearchTrigger,
	Separator: NavigationHeaderSeparator,
	Start: NavigationHeaderStart,
	SymbolLink: NavigationHeaderSymbolLink,
}

export { NavigationHeader }
