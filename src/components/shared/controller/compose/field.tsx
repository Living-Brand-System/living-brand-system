'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { RowControlProvider } from './row'

type ControllerFieldProps = React.ComponentProps<'div'> & {
	label: React.ReactNode
	/** 킷 밖 컨트롤의 id — 킷 컨트롤(Textarea 등)은 자동 배선되므로 보통 불필요. */
	htmlFor?: string
	/** 라벨 행 오른끝의 카운터(디자인의 190/250) — maxStringLength 계약의 표시부. */
	counter?: string
	/**
	 * 라벨 행 오른끝의 버튼 한 개(디자인 64:1283의 복사 버튼).
	 * 🔴 카운터 자리를 빌려 쓰지 않는다 — 카운터는 `n/max` 표시부라 조작 요소를 넣으면 계약이 거짓말이 된다.
	 * 버튼이 라벨보다 크므로 라벨 행 정렬이 baseline에서 center로 바뀌고, 오른쪽 패딩이 버튼만큼 줄어든다.
	 */
	action?: React.ReactNode
	disabled?: boolean
}

/** 여러 줄 필드 — 라벨 위, 컨트롤 아래로 쌓이는 행. */
export function ControllerField({
	label,
	htmlFor,
	counter,
	action,
	disabled = false,
	className,
	children,
	...props
}: ControllerFieldProps) {
	const generatedId = React.useId()
	const controlId = htmlFor ?? generatedId
	return (
		<div
			data-slot="controller-field"
			aria-disabled={disabled || undefined}
			className={cn(
				'flex w-full shrink-0 flex-col gap-1.5 rounded-lg bg-muted px-3 pt-2 pb-3 focus-within:ring-2 focus-within:ring-ring/30',
				action && 'pr-2',
				disabled && 'pointer-events-none opacity-50',
				className,
			)}
			{...props}
		>
			<span
				className={cn(
					'flex justify-between gap-3',
					action ? 'items-center' : 'items-baseline',
				)}
			>
				<label htmlFor={controlId} className="text-sm text-muted-foreground">
					{label}
				</label>
				{counter && (
					<span className="shrink-0 font-mono text-muted-foreground text-xs">
						{counter}
					</span>
				)}
				{action}
			</span>
			<RowControlProvider value={{ controlId, disabled }}>{children}</RowControlProvider>
		</div>
	)
}
