'use client'

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ControllerOption } from '@/modules/studio-controller/controller-definition'
import { useRowControl } from '../compose/row'

type ControllerChipsProps<T extends string> = {
	options: readonly ControllerOption<T>[]
	value: readonly T[]
	onChange: (value: T[]) => void
	'aria-label': string
	/** 어드민 고정 값 — 포커스·조작이 막힌다. Row 안에서는 행의 disabled를 자동으로 따른다. */
	disabled?: boolean
	/** 끌 수 없는 칩(예: 마지막 남은 형식) — 켜진 채 잠긴다. */
	disabledValues?: readonly T[]
}

/**
 * 다중 선택 칩 — Segmented의 미끄러지는 pill과 달리 여러 개가 켜지므로, 정본(76:4)대로
 * **간격 있는 개별 pill**로 그린다: 켜짐 = foreground/10 채움, 꺼짐 = 흐린 텍스트.
 * 배경 형식·출력 형식·해상도·프레임 칩이 이 파츠다.
 */
export function ControllerChips<T extends string>({
	options,
	value,
	onChange,
	'aria-label': ariaLabel,
	disabled,
	disabledValues,
}: ControllerChipsProps<T>) {
	const row = useRowControl()
	const resolvedDisabled = disabled ?? row?.disabled
	return (
		// 정본(83:1563) 수치: 칩 높이 32px·간격 2px·radius 8px·min-w 48px, 행 오른끝 2px 인셋.
		<div data-slot="controller-chips" className="-mr-2.5 flex h-9 shrink-0 items-center py-0.5">
			<ToggleGroup
				type="multiple"
				value={[...value]}
				onValueChange={(next) => onChange(next as T[])}
				aria-label={ariaLabel}
				disabled={resolvedDisabled}
				spacing={0.5}
				className="h-full"
			>
				{options.map((option) => (
					<ToggleGroupItem
						key={option.value}
						value={option.value}
						size="sm"
						disabled={disabledValues?.includes(option.value)}
						className="h-full min-w-12 rounded-lg bg-transparent px-2 text-muted-foreground text-sm transition-colors hover:bg-transparent hover:text-foreground data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground data-[state=on]:hover:bg-foreground/10"
					>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	)
}
