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
 * 최상단 그룹은 구분선을 갖지 않는다 — 무엇이 맨 위인지는 그룹이 아니라 이 컨테이너만 안다.
 */
export function ControllerContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="controller-content"
			className={cn(
				// 상단 여백은 두지 않는다 — 첫 그룹 헤더(h-9)의 자체 여백이 header 경계선과의 간격을 만든다.
				// header가 없는 패널(=이 컨테이너가 Root의 첫 자식)만 그 16px을 스스로 갖는다(디자인 59:3080).
				// 그룹 사이 간격은 이 컨테이너의 gap이 아니라 각 그룹이 펼쳐졌을 때의 자체 하단 패딩이 만든다.
				// 🔴 `overflow-x-hidden`: 한 컨트롤이 제 폭을 잘못 잡아도 패널 밖으로 번지지 않게 한다
				//    (스튜디오 패널의 같은 자리와 같은 근거). 넘치는 컨트롤은 자기 안에서 스크롤을 갖는다.
				'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 pb-4 first:pt-4 [&>*:first-child]:border-t-0',
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
