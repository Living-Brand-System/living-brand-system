'use client'

import type { CarbonIconType } from '@carbon/icons-react'
import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	Sidebar as SidebarPrimitive,
	SidebarContent as SidebarPrimitiveContent,
	SidebarTrigger as SidebarPrimitiveTrigger,
	useSidebar,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const sidebarItemVariants = cva(
	'flex h-9 w-full items-center justify-center rounded-lg p-0 text-sm font-normal outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/30 md:max-xl:justify-center xl:group-data-[collapsed=false]/sidebar-api:justify-between xl:group-data-[collapsed=false]/sidebar-api:px-2 [&_svg]:size-5 [&_svg]:shrink-0',
	{
		variants: {
			current: {
				false: 'hover:bg-muted hover:text-foreground',
				true: 'hover:bg-muted hover:text-foreground active:bg-muted data-active:bg-muted data-active:text-foreground data-active:font-normal',
			},
			depth: {
				0: 'justify-start rounded-md px-2 font-medium md:max-xl:justify-start xl:group-data-[collapsed=false]/sidebar-api:justify-start',
				1: 'justify-start rounded-md px-2 md:max-xl:justify-start xl:group-data-[collapsed=false]/sidebar-api:justify-start',
				3: 'h-7 justify-start rounded-md px-2 py-1 text-xs md:max-xl:justify-start xl:group-data-[collapsed=false]/sidebar-api:justify-start',
				2: 'h-7 justify-start rounded-md px-2 py-1 text-xs md:max-xl:justify-start xl:group-data-[collapsed=false]/sidebar-api:justify-start',
			},
			tone: {
				default: 'text-foreground',
				emphasized: 'text-foreground/60',
				muted: 'text-muted-foreground',
				subtle: 'text-foreground/30',
			},
		},
		compoundVariants: [
			{
				className: 'data-active:text-foreground',
				current: true,
				tone: 'muted',
			},
			{
				className: 'data-active:text-foreground/60',
				current: true,
				tone: 'emphasized',
			},
		],
		defaultVariants: {
			current: false,
			tone: 'default',
		},
	},
)

type SidebarRootProps = Omit<React.ComponentProps<'aside'>, 'aria-label'> & {
	'aria-label': string
	collapsed?: boolean
}

function SidebarRoot({
	'aria-label': ariaLabel,
	children,
	className,
	collapsed = false,
	footer,
	...props
}: SidebarRootProps & { footer?: React.ReactNode }) {
	const { isMobile } = useSidebar()
	const navigation = (
		<nav
			aria-label={ariaLabel}
			className="flex min-h-0 w-full flex-col gap-2 overflow-hidden rounded-xl bg-background p-4 text-foreground shadow-lg transition-[padding] duration-200 ease-linear motion-reduce:transition-none xl:group-data-[collapsed=false]/sidebar-api:p-3"
		>
			{children}
		</nav>
	)

	// 🔴 Figma(HD_LBS_UI 62:5828)에서 이것은 목차 안의 항목이 아니라 **분리된 두 번째 카드**다.
	//    목차가 길어져 스크롤해도 이 카드는 바닥에 남는다 — 그래서 nav 안이 아니라 형제로 둔다.
	const footerCard = footer ? (
		<div
			data-slot="sidebar-footer-card"
			className="shrink-0 rounded-xl bg-background p-4 text-foreground shadow-lg transition-[padding] duration-200 ease-linear motion-reduce:transition-none xl:group-data-[collapsed=false]/sidebar-api:p-3"
		>
			{footer}
		</div>
	) : null

	if (isMobile) {
		return (
			<SidebarPrimitive>
				<aside
					data-slot="sidebar-root"
					data-collapsed={collapsed}
					className={cn('flex h-full flex-col gap-2 bg-transparent p-4', className)}
					{...props}
				>
					{navigation}
					{footerCard}
				</aside>
			</SidebarPrimitive>
		)
	}

	return (
		<aside
			data-slot="sidebar-root"
			data-collapsed={collapsed}
			className={cn(
				'group/sidebar-api relative hidden h-full w-[100px] shrink-0 flex-col gap-2 overflow-hidden bg-transparent p-4 transition-[width] duration-200 ease-linear motion-reduce:transition-none md:flex xl:data-[collapsed=false]:w-[265px]',
				className,
			)}
			{...props}
		>
			{navigation}
			{footerCard}
		</aside>
	)
}

function SidebarContent({
	className,
	...props
}: React.ComponentProps<typeof SidebarPrimitiveContent>) {
	return (
		<SidebarPrimitiveContent
			data-slot="sidebar-content"
			className={cn('gap-0', className)}
			{...props}
		/>
	)
}

function SidebarGroup({ className, ...props }: React.ComponentProps<typeof SidebarMenu>) {
	return <SidebarMenu data-slot="sidebar-group" className={cn('gap-1', className)} {...props} />
}

function SidebarChildren({ className, ...props }: React.ComponentProps<typeof SidebarMenuSub>) {
	return (
		<SidebarMenuSub
			data-slot="sidebar-children"
			className={cn('mx-0 translate-x-0 gap-0.5 border-0 px-0 pt-0.5 pl-3', className)}
			{...props}
		/>
	)
}

type SidebarItemProps = Omit<React.ComponentProps<typeof Link>, 'children' | 'className'> &
	VariantProps<typeof sidebarItemVariants> & {
		badge?: React.ReactNode
		children?: React.ReactNode
		icon?: CarbonIconType
		label: string
	}

function SidebarItem({
	badge,
	children,
	current = false,
	depth,
	href,
	icon: Icon,
	label,
	tone = 'default',
	...props
}: SidebarItemProps) {
	return (
		<SidebarMenuItem data-slot="sidebar-item" data-depth={depth} data-tone={tone}>
			<SidebarMenuButton
				asChild
				isActive={current ?? false}
				tooltip={label}
				className={sidebarItemVariants({ current, depth, tone })}
			>
				<Link
					data-slot="sidebar-item-link"
					href={href}
					aria-current={current ? 'page' : undefined}
					title={label}
					{...props}
				>
					<span
						className={cn(
							'truncate',
							depth == null &&
								'md:max-xl:sr-only xl:group-data-[collapsed=true]/sidebar-api:sr-only',
						)}
					>
						{label}
					</span>
					{(badge || Icon) && (
						<span
							className={cn(
								'flex shrink-0 items-center gap-1',
								depth == null &&
									'md:max-xl:[&_[data-slot=badge]]:hidden xl:group-data-[collapsed=true]/sidebar-api:[&_[data-slot=badge]]:hidden',
							)}
						>
							{badge && <Badge>{badge}</Badge>}
							{Icon && <Icon aria-hidden data-icon="inline-end" />}
						</span>
					)}
				</Link>
			</SidebarMenuButton>
			{children}
		</SidebarMenuItem>
	)
}

function SidebarSeparator() {
	return (
		<div data-slot="sidebar-separator" className="flex h-1 items-center">
			<Separator />
		</div>
	)
}

function SidebarTrigger({
	className,
	...props
}: React.ComponentProps<typeof SidebarPrimitiveTrigger>) {
	return (
		<SidebarPrimitiveTrigger
			data-slot="sidebar-collapse-trigger"
			aria-label="사이드바 접기 또는 펼치기"
			title="사이드바 접기 또는 펼치기"
			className={cn(
				'absolute inset-y-0 right-0 h-full w-2 rounded-none p-0 opacity-0 hover:bg-muted hover:opacity-100 focus-visible:opacity-100',
				className,
			)}
			{...props}
		/>
	)
}

const Sidebar = {
	Children: SidebarChildren,
	Content: SidebarContent,
	Group: SidebarGroup,
	Item: SidebarItem,
	Root: SidebarRoot,
	Separator: SidebarSeparator,
	Trigger: SidebarTrigger,
}

export { Sidebar, sidebarItemVariants }
