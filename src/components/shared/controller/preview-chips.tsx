'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import type {
	ControllerOption,
	ControllerPreviewCircle,
} from '@/modules/studio-controller/controller-definition'
import { ControllerField } from './field'
import { useRowControl } from './row'

type ControllerPreviewChipsProps = {
	label: string
	/** 선택지마다 `preview`(단위 좌표 선분)를 갖는 목록 — 고르는 것이 이름이 아니라 형태다. */
	options: readonly ControllerOption[]
	value?: string
	onChange?: (value: string) => void
	disabled?: boolean
}

/**
 * 형태를 고르는 썸네일 그리드 — 선택지의 정보가 이름이 아니라 **모양 자체**인 축에 쓴다.
 *
 * `color-chips.tsx`와 같은 자리의 짝이다: 거기는 색이 정보고 여기는 기하가 정보다. 라디오
 * 패턴(방향키 이동을 브라우저가 준다)과 선택 링도 그것과 같은 것을 쓴다.
 *
 * 🔴 그림은 `<img>`가 아니라 선분을 SVG로 그린 것이다 — 파일을 두면 이 축이 admin 업로드에
 *    묶여 환경마다 달라진다(그 근거는 `ControllerOption.preview`가 갖는다).
 */
export function ControllerPreviewChips({
	label,
	options,
	value,
	onChange,
	disabled,
}: ControllerPreviewChipsProps) {
	// 🔴 라벨이 가리키는 것은 첫 칩이 아니라 묶음이다 — 첫 라디오를 가리키면 라벨 클릭이
	//    포커스가 아니라 '첫 형태 선택'이 되어 사용자의 선택을 조용히 덮는다.
	const groupId = useId()
	return (
		<ControllerField label={label} htmlFor={groupId} disabled={disabled}>
			<PreviewChipGrid label={label} options={options} value={value} onChange={onChange} />
		</ControllerField>
	)
}

/** 배선(controlId·disabled)은 Field 안쪽에서만 보이므로 그리드를 자식 컴포넌트로 내린다. */
function PreviewChipGrid({
	label,
	options,
	value,
	onChange,
}: Pick<ControllerPreviewChipsProps, 'label' | 'options' | 'value' | 'onChange'>) {
	const row = useRowControl()
	const groupName = useId()
	// 같은 성격끼리 붙여 그린다 — 순서는 옵션 순서를 지킨다(정본이 먼저, 확장이 뒤).
	const sections: { title: string | null; options: ControllerOption[] }[] = []
	for (const option of options) {
		const title = option.group ?? null
		const last = sections[sections.length - 1]
		if (last && last.title === title) last.options.push(option)
		else sections.push({ title, options: [option] })
	}
	if (sections.length > 1) {
		return (
			<div className="flex flex-col gap-3" id={row?.controlId}>
				{sections.map((section) => (
					<div key={section.title ?? 'ungrouped'} className="flex flex-col gap-1.5">
						{section.title && (
							<span className="text-muted-foreground text-xs">{section.title}</span>
						)}
						<ChipGrid
							label={section.title ? `${label} · ${section.title}` : label}
							options={section.options}
							value={value}
							onChange={onChange}
							groupName={groupName}
							disabled={row?.disabled}
						/>
					</div>
				))}
			</div>
		)
	}
	return (
		<ChipGrid
			label={label}
			options={options}
			value={value}
			onChange={onChange}
			groupName={groupName}
			disabled={row?.disabled}
			id={row?.controlId}
		/>
	)
}

function ChipGrid({
	label,
	options,
	value,
	onChange,
	groupName,
	disabled,
	id,
}: Pick<ControllerPreviewChipsProps, 'label' | 'options' | 'value' | 'onChange'> & {
	groupName: string
	disabled?: boolean
	id?: string
}) {
	return (
		<div
			data-slot="controller-preview-chips"
			// label이 가리키는 요소 = 묶음. div는 label 대상이 아니라 클릭이 아무 값도 바꾸지 않고,
			// 묶음의 이름은 radiogroup의 aria-label이 준다.
			id={id}
			role="radiogroup"
			aria-label={label}
			// 선택지가 많으면 2열은 스크롤이 된다 — 한 눈에 다 보이는 것이 이 칩의 존재 이유다.
			className={cn('grid gap-1.5', options.length > 4 ? 'grid-cols-3' : 'grid-cols-2')}
		>
			{options.map((option) => {
				const current = option.value === value
				return (
					<label
						key={option.value}
						className={cn(
							'flex cursor-pointer flex-col items-stretch gap-1 rounded-md border p-1.5 outline-none',
							'has-focus-visible:ring-2 has-focus-visible:ring-ring/30',
							// 선택 링은 `color-chips.tsx`와 같은 것을 쓴다 — 같은 자리의 짝이라 표시도 같아야 한다.
							current
								? 'border-transparent bg-muted ring-2 ring-foreground/40'
								: 'border-border hover:bg-muted/60',
							disabled && 'cursor-not-allowed opacity-50',
						)}
					>
						<input
							type="radio"
							name={groupName}
							className="sr-only"
							checked={current}
							disabled={disabled || undefined}
							onChange={() => onChange?.(option.value)}
						/>
						<PreviewGlyph shapes={option.preview ?? []} />
						<span className="truncate text-center text-muted-foreground text-xs">
							{option.label}
						</span>
					</label>
				)
			})}
		</div>
	)
}

/**
 * 단위 좌표 도형을 그대로 그린다 — 넷이면 선분, 셋이면 원.
 *
 * 선분마다 `<line>`을 두지 않고 `<path>` 하나로 이어 붙인다 — 한 점에서 뻗는 부챗살은 시작점이
 * 겹쳐 좌표가 유일한 신원이 되지 못하고, 그림은 어차피 통째로 하나다. 원은 겹침 관계가 곧
 * 정보라 하나씩 선다.
 * 🔴 뷰박스가 1×1이므로 굵기를 좌표 단위로 주면 선이 보이지 않는다. `non-scaling-stroke`가
 *    굵기를 화면 px로 읽어 어느 칩 크기에서도 hairline 1px이 된다.
 */
function PreviewGlyph({ shapes }: { shapes: NonNullable<ControllerOption['preview']> }) {
	const path = shapes
		.filter((shape) => shape.length === 4)
		.map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`)
		.join('')
	const circles = shapes.filter((shape): shape is ControllerPreviewCircle => shape.length === 3)
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 1 1"
			className="aspect-square w-full rounded-sm bg-background text-foreground/70"
		>
			{path && (
				<path
					d={path}
					fill="none"
					stroke="currentColor"
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{circles.map(([cx, cy, r]) => (
				<circle
					key={`${cx}-${cy}-${r}`}
					cx={cx}
					cy={cy}
					r={r}
					fill="none"
					stroke="currentColor"
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
				/>
			))}
		</svg>
	)
}
