'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ControllerPresence } from '../layout/presence'
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
			className={cn('flex min-w-0 flex-col rounded-lg bg-muted', className)}
		>
			<ControllerRow label={label} readonly className="bg-transparent pr-1.5">
				{control}
			</ControllerRow>
			{/* 머리 행과 본문 사이 4px은 본문 상자의 위 여백이다 — 켜고 끄는 본문(카메라 등)이 높이로 펼쳐진다. */}
			<ControllerPresence itemClassName="pt-1">{children}</ControllerPresence>
		</fieldset>
	)
}
