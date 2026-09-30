'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { ControllerOption } from '@/modules/studio-controller/controller-definition'
import { ControllerField } from './field'
import { useRowControl } from './row'

type ControllerColorChipsProps = {
	label: string
	/** 선택지마다 `colors`(#rrggbb)를 갖는 목록 — 색은 스타일이 아니라 데이터다(docs/09 §4 예외). */
	options: readonly ControllerOption[]
	value?: string
	onChange?: (value: string) => void
	disabled?: boolean
}

/**
 * 색 조합을 고르는 칩 그리드 — 선택지의 정보가 라벨이 아니라 **색 자체**인 축에 쓴다.
 * 36px 한 줄 행에 조합을 밀어 넣으면 칩이 점이 되므로 라벨 아래 3열로 펴는 Field 골격을 쓴다.
 * 라디오 패턴·클래스는 `color-row.tsx`의 ColorPalette와 같다(방향키 이동을 브라우저가 준다).
 */
export function ControllerColorChips({
	label,
	options,
	value,
	onChange,
	disabled,
}: ControllerColorChipsProps) {
	// 🔴 라벨이 가리키는 것은 첫 칩이 아니라 묶음이다 — 첫 라디오를 가리키면 라벨 클릭이
	//    포커스가 아니라 '첫 조합 선택'이 되어 사용자의 선택을 조용히 덮는다.
	const groupId = useId()
	return (
		<ControllerField label={label} htmlFor={groupId} disabled={disabled}>
			<ColorChipGrid label={label} options={options} value={value} onChange={onChange} />
		</ControllerField>
	)
}

/** 배선(controlId·disabled)은 Field 안쪽에서만 보이므로 그리드를 자식 컴포넌트로 내린다. */
function ColorChipGrid({
	label,
	options,
	value,
	onChange,
}: Pick<ControllerColorChipsProps, 'label' | 'options' | 'value' | 'onChange'>) {
	const row = useRowControl()
	const groupName = useId()
	return (
		<div
			data-slot="controller-color-chips"
			// label이 가리키는 요소 = 묶음. div는 label 대상이 아니라 클릭이 아무 값도 바꾸지 않고,
			// 묶음의 이름은 radiogroup의 aria-label이 준다.
			id={row?.controlId}
			role="radiogroup"
			aria-label={label}
			className="grid grid-cols-3 gap-1.5"
		>
			{options.map((option) => (
				<input
					key={option.value}
					type="radio"
					name={groupName}
					// 사람이 읽는 이름을 읽어준다 — hex는 조합의 이름이 아니다.
					aria-label={option.label}
					// 같은 계열 조합끼리는 색만으로 갈라지지 않는다 — 이름을 눈으로도 확인시킨다.
					title={option.label}
					checked={value === option.value}
					disabled={row?.disabled || undefined}
					onChange={() => onChange?.(option.value)}
					// 색은 데이터라 style로 흐른다(docs/09 §4 예외 — color-row.tsx의 팔레트와 같은 근거).
					style={{ backgroundImage: chipBackground(option.colors ?? []) }}
					className={cn(
						'aspect-square w-full cursor-pointer appearance-none rounded-md border border-border outline-none disabled:cursor-not-allowed',
						'checked:ring-2 checked:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30',
					)}
				/>
			))}
		</div>
	)
}

/** 한 칩에 조합의 색을 균등 분할해 얹는다 — 2색은 반반, 색 개수는 조합마다 다를 수 있다. */
function chipBackground(colors: readonly string[]) {
	const stops = colors.map(
		(color, index) =>
			`${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`,
	)
	return `linear-gradient(135deg, ${stops.join(', ')})`
}
