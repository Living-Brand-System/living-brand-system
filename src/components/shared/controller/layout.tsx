import type * as React from 'react'
import { cn } from '@/lib/utils'

/** 컨트롤러 패널의 표면과 세로 레이아웃만 소유한다. */
export function ControllerRoot({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="controller-root"
			className={cn(
				'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg lg:h-full',
				className,
			)}
			{...props}
		/>
	)
}

/** 패널 상단의 Studio 제목·설명·아이덴티티 영역. */
export function ControllerHeader({ className, ...props }: React.ComponentProps<'header'>) {
	return (
		<header
			data-slot="controller-header"
			className={cn(
				'flex shrink-0 flex-col gap-1 border-b border-border px-4 py-4',
				className,
			)}
			{...props}
		/>
	)
}

/**
 * 컨트롤 그룹이 쌓이는 패널의 유일한 스크롤 영역.
 * 그룹 내부와 그룹 사이 간격은 Group·GroupList가 소유한다.
 */
export function ControllerContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="controller-content"
			className={cn(
				'flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 first:pt-4',
				className,
			)}
			{...props}
		/>
	)
}

/** 패널 하단에 고정되는 설정·상태·실행 CTA 영역. */
export function ControllerFooter({ className, ...props }: React.ComponentProps<'footer'>) {
	return (
		<footer
			data-slot="controller-footer"
			className={cn(
				'flex shrink-0 flex-col gap-4 border-t border-border px-4 pt-1 pb-4',
				className,
			)}
			{...props}
		/>
	)
}
