'use client'

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import type { ControllerOption } from '@/modules/studio-controller/controller-definition'
import { useRowControl } from '../compose/row'
import { ROW_SELECT_CONTENT, ROW_SELECT_ITEM, ROW_SELECT_TRIGGER } from '../internal/classes'

type ControllerSelectProps = {
	options: readonly ControllerOption[]
	value?: string
	onChange?: (value: string) => void
	placeholder?: string
	/** Row 안에서는 행의 disabled를 자동으로 따른다 — 목록이 비었을 때 등 자체 사유만 명시한다. */
	disabled?: boolean
	/** 편집 불가 — 목록이 열리지 않고 값이 바뀌지 않는다(포커스는 남는다). Row 안에서는 행을 따른다. */
	readonly?: boolean
}

/** 행 안에 투명하게 앉는 셀렉트 — 라벨 연결 id와 disabled를 Row에서 이어받는다. */
export function ControllerSelect({
	options,
	value,
	onChange,
	placeholder,
	disabled,
	readonly,
}: ControllerSelectProps) {
	const row = useRowControl()
	const locked = readonly ?? row?.readonly
	return (
		// 닫힌 트리거의 타이핑 선택도 값을 바꾸므로 열림만이 아니라 변경도 막는다.
		<Select
			value={value}
			open={locked ? false : undefined}
			onValueChange={(next) => !locked && onChange?.(next)}
		>
			<SelectTrigger
				id={row?.controlId}
				aria-readonly={locked || undefined}
				aria-invalid={row?.errorId ? true : undefined}
				aria-describedby={row?.errorId}
				size="sm"
				disabled={disabled || row?.disabled}
				className={ROW_SELECT_TRIGGER}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			{options.length > 0 && (
				// 트리거가 행 전체이므로 popper의 trigger-width가 곧 행 폭이다 — dialkit과 같은 full width.
				<SelectContent
					position="popper"
					align="start"
					sideOffset={4}
					className={ROW_SELECT_CONTENT}
				>
					{options.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							className={ROW_SELECT_ITEM}
						>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			)}
		</Select>
	)
}
