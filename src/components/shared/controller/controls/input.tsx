'use client'

import type * as React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useRowControl } from '../compose/row'
import { BARE_INPUT } from '../internal/classes'

/** Row 안에 투명하게 앉는 단일행 입력 — 라벨 연결 id와 disabled를 Row에서 이어받는다.
 *  dialkit 행 계약(라벨 왼쪽·값 오른쪽)대로 값은 우측 정렬이 기본이다 — 필요하면 text-left로 덮는다. */
export function ControllerInput({ className, ...props }: React.ComponentProps<typeof Input>) {
	const row = useRowControl()
	return (
		<Input
			id={row?.controlId}
			disabled={row?.disabled || undefined}
			aria-invalid={row?.errorId ? true : undefined}
			aria-describedby={row?.errorId}
			className={cn(BARE_INPUT, 'text-right', className)}
			{...props}
		/>
	)
}

/** Field 안에 투명하게 앉는 여러 줄 입력 — 라벨 연결 id를 Field에서 이어받는다. */
export function ControllerTextarea({ className, ...props }: React.ComponentProps<typeof Textarea>) {
	const row = useRowControl()
	return (
		<Textarea
			id={row?.controlId}
			disabled={row?.disabled || undefined}
			aria-invalid={row?.errorId ? true : undefined}
			aria-describedby={row?.errorId}
			className={cn(BARE_INPUT, 'min-h-12', className)}
			{...props}
		/>
	)
}
