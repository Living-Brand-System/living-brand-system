'use client'

import { useId } from 'react'
import { Controller } from '@/components/shared/controller'
import { ControllerCompound } from '@/components/shared/controller/compound'

/**
 * 텍스트·심볼 색이 함께 쓰는 Solid 스와치 그리드(Figma 350:9318). 색은 호출부가 CMS 정본에서 넘긴다.
 * ponytail: 정본 밖 색을 막으려고 Custom은 잠근 채 그린다 — 자유 입력이 필요해지면 여기에 모드를 연다.
 */
export function TemplateColorSwatches({
	subject,
	colors,
	value,
	onChange,
	disabled = false,
}: {
	/** 접근성 이름에 쓰는 대상 이름 — 예: `텍스트`, `Symbol`. */
	subject: string
	colors: readonly string[]
	value: string | null | undefined
	onChange: (hex: string) => void
	disabled?: boolean
}) {
	const name = useId()
	return (
		<ControllerCompound
			label="Color"
			control={
				<Controller.Segmented
					compact
					aria-label={`${subject} 색상 모드`}
					options={[
						{ value: 'solid', label: 'Solid' },
						{ value: 'custom', label: 'Custom' },
					]}
					value="solid"
					onChange={() => {}}
					disabled
				/>
			}
		>
			<div
				role="radiogroup"
				aria-label={`${subject} 색상`}
				className="grid grid-cols-5 gap-1.5 px-3 pt-2 pb-3"
			>
				{colors.map((hex) => (
					<input
						key={hex}
						type="radio"
						name={name}
						aria-label={`${subject} 색상 ${hex}`}
						checked={value?.toLowerCase() === hex.toLowerCase()}
						disabled={disabled}
						onChange={() => onChange(hex)}
						style={{ backgroundColor: hex }}
						className="aspect-square w-full cursor-pointer appearance-none rounded-full border border-foreground/15 outline-none checked:ring-2 checked:ring-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed"
					/>
				))}
			</div>
		</ControllerCompound>
	)
}
