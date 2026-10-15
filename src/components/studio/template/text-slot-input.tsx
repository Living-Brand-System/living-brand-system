'use client'

import { Controller } from '@/components/shared/controller'
import { Typography } from '@/components/ui/typography'
import type { TemplateTextSlot } from '@/features/template-customization/domain/template-studio-config'
import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'
import { textFormatOf } from '@/modules/studio-controller/text-formats'

type TextSlotInputProps = {
	/** 공통 Controller Definition과 DOM 입력 binding을 합쳐 렌더한다. */
	definition: Extract<ControllerControlDefinition, { kind: 'text' }>
	input: TemplateTextSlot['input']
	value: string
	onChange: (text: string) => void
}

/** 편집 계약(config)의 입력 제약(형식·글자수·줄수)을 적용한 텍스트 슬롯 컨트롤러 행. */
export function TextSlotInput({ definition, input, value, onChange }: TextSlotInputProps) {
	const availability = definition.availability ?? 'enabled'
	const format = textFormatOf(input.format)
	const singleLine = !format.multiline || input.maxLines === 1
	// 기본 문구(Figma 문구 「December 2025」 등)는 형식이 달라도 오류가 아니다 — 창작자가 쓴 값만 본다.
	const invalid = value !== definition.defaultValue && !format.accepts(value)
	const change = (next: string) => {
		if (availability !== 'enabled') return
		if (input.maxLines && next.split('\n').length > input.maxLines) return
		onChange(next)
	}
	const control = singleLine ? (
		<Controller.Input
			type={format.inputType}
			aria-label={definition.label}
			maxLength={definition.maxLength}
			placeholder={definition.placeholder ?? definition.label}
			value={value}
			disabled={availability === 'disabled'}
			onChange={(event) => change(event.target.value)}
			className="text-left"
		/>
	) : (
		<Controller.Textarea
			aria-label={definition.label}
			maxLength={definition.maxLength}
			placeholder={definition.placeholder ?? definition.label}
			rows={2}
			value={value}
			disabled={availability === 'disabled'}
			onChange={(event) => change(event.target.value)}
		/>
	)
	const error = invalid ? (
		<Typography role="alert" size="sm" tone="destructive">
			{format.label} 형식이 아니에요.
		</Typography>
	) : null
	return (
		// readonly도 같은 Field·입력이다 — 편집만 막는다(docs/10 §3.6). 부품을 갈아타면 배치가 바뀐다.
		<Controller.Field
			label={definition.label}
			disabled={availability === 'disabled'}
			readonly={availability === 'readonly'}
		>
			{control}
			{error}
		</Controller.Field>
	)
}
