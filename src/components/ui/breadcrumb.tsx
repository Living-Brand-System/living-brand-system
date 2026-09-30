import { ChevronRight } from '@carbon/icons-react'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// shadcn/ui의 Breadcrumb 조합. 로컬 액션은 BreadcrumbLink의 asChild로 연결합니다.
export function Breadcrumb(props: ComponentProps<'nav'>) {
	return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
}
export function BreadcrumbList({ className, ...props }: ComponentProps<'ol'>) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(
				'flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground',
				className,
			)}
			{...props}
		/>
	)
}
export function BreadcrumbItem({ className, ...props }: ComponentProps<'li'>) {
	return (
		<li
			data-slot="breadcrumb-item"
			className={cn('inline-flex items-center gap-1.5', className)}
			{...props}
		/>
	)
}
export function BreadcrumbLink({
	asChild,
	className,
	...props
}: ComponentProps<'a'> & { asChild?: boolean }) {
	const Comp = asChild ? Slot.Root : 'a'
	return (
		<Comp
			data-slot="breadcrumb-link"
			className={cn('transition-colors hover:text-foreground', className)}
			{...props}
		/>
	)
}
export function BreadcrumbPage({ className, ...props }: ComponentProps<'span'>) {
	return (
		<span
			data-slot="breadcrumb-page"
			aria-current="page"
			className={cn('font-normal text-foreground', className)}
			{...props}
		/>
	)
}
export function BreadcrumbSeparator({ children, className, ...props }: ComponentProps<'li'>) {
	return (
		<li
			data-slot="breadcrumb-separator"
			aria-hidden="true"
			className={cn('inline-flex items-center', className)}
			{...props}
		>
			{children ?? <ChevronRight size={16} />}
		</li>
	)
}
