'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ControllerRow } from './row'

/** 헤더의 제어와 본문을 한 표면으로 결합한다. 값·모드·On/Off는 소비자가 소유한다. */
export function ControllerCompound({
	label,
	control,
	children,
	className,
}: {
	label: string
	control?: ReactNode
	children?: ReactNode
	className?: string
}) {
	return (
		<fieldset
			data-slot="controller-compound"
			aria-label={label}
			className={cn('flex min-w-0 flex-col gap-1 rounded-lg bg-muted', className)}
		>
			<ControllerRow label={label} readonly className="bg-transparent pr-1.5">
				{control}
			</ControllerRow>
			{children}
		</fieldset>
	)
}
