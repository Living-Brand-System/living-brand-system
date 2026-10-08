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
}

/** 행 안에 투명하게 앉는 셀렉트 — 라벨 연결 id와 disabled를 Row에서 이어받는다. */
export function ControllerSelect({
	options,
	value,
	onChange,
	placeholder,
	disabled,
}: ControllerSelectProps) {
	const row = useRowControl()
	return (
		<Select value={value} onValueChange={(next) => onChange?.(next)}>
			<SelectTrigger
				id={row?.controlId}
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
