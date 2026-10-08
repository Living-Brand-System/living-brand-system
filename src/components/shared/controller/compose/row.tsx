'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type RowControlValue = {
	/** 행 라벨이 가리키는 컨트롤 id — 킷 컨트롤이 자기 id로 쓴다. */
	controlId: string
	disabled: boolean
}

const RowControlContext = React.createContext<RowControlValue | null>(null)

/** Row/Field 안의 킷 컨트롤이 라벨 연결 id와 disabled를 이어받는 배선 — 파츠 전용. */
export function useRowControl() {
	return React.useContext(RowControlContext)
}

export function RowControlProvider({
	value,
	children,
}: {
	value: RowControlValue
	children: React.ReactNode
}) {
	return <RowControlContext.Provider value={value}>{children}</RowControlContext.Provider>
}

type ControllerRowProps = React.ComponentProps<'div'> & {
	label: React.ReactNode
	/** 컨트롤 없이 값만 보여주는 행 — 라벨이 span이 되고 자동 배선이 꺼진다(컨트롤러 API의 readonly). */
	readonly?: boolean
	/** 킷 밖 컨트롤의 id — 킷 컨트롤(Select/Input/Textarea 등)은 자동 배선되므로 보통 불필요. */
	htmlFor?: string
	/** 어드민이 고정해 조정 불가한 행(디자인의 Admin Fixed) — 행 전체가 흐려지고 포인터가 막히며,
	 *  안의 킷 컨트롤은 컨텍스트로 함께 비활성된다. */
	disabled?: boolean
}

/** 한 줄 행 — 왼쪽 라벨, 오른쪽 값/컨트롤. dialkit의 36px 행 대응. */
export function ControllerRow({
	label,
	htmlFor,
	readonly = false,
	disabled = false,
	className,
	children,
	...props
}: ControllerRowProps) {
	const generatedId = React.useId()
	const controlId = htmlFor ?? generatedId
	// readonly 행은 label을 쓰지 않는다 — 아무것도 가리키지 않는 label은 클릭이 죽은 거짓 어포던스다.
	const LabelTag = readonly ? 'span' : 'label'
	return (
		<div
			data-slot="controller-row"
			aria-disabled={disabled || undefined}
			className={cn(
				// relative + --controller-row-px: 셀렉트 트리거가 행 전체(border box)를 덮는 기준이다.
				// 패딩을 변수로 내보내야 트리거가 그만큼 밖으로 나가 행과 같은 폭을 잰다(ROW_SELECT_TRIGGER).
				'relative flex h-9 w-full shrink-0 items-center justify-between gap-3 rounded-lg bg-muted px-3 [--controller-row-px:0.75rem] focus-within:ring-2 focus-within:ring-ring/30',
				disabled && 'pointer-events-none opacity-50',
				className,
			)}
			{...props}
		>
			<LabelTag
				{...(readonly ? {} : { htmlFor: controlId })}
				className="shrink-0 text-sm text-muted-foreground"
			>
				{label}
			</LabelTag>
			<RowControlProvider value={{ controlId, disabled }}>{children}</RowControlProvider>
		</div>
	)
}
