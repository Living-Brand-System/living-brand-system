'use client'

import { Controller } from '@/components/shared/controller'
import { ControllerControlRenderer } from '@/components/shared/controller-renderer'
import { Typography } from '@/components/ui/typography'
import type { TemplateTextSlot } from '@/features/template-customization/domain/template-studio-config'
import type { ControllerControlDefinition } from '@/modules/studio-controller/controller-definition'

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
	if (availability === 'readonly')
		return (
			<ControllerControlRenderer
				definition={definition}
				value={value}
				onChange={(next) => {
					if (typeof next === 'string') onChange(next)
				}}
			/>
		)
	const singleLine = input.format !== 'free' || input.maxLines === 1
	const invalidEmail = input.format === 'email' && value !== '' && !/^\S+@\S+\.\S+$/.test(value)
	const change = (next: string) => {
		if (availability !== 'enabled') return
		if (input.maxLines && next.split('\n').length > input.maxLines) return
		onChange(next)
	}
	const control = singleLine ? (
		<Controller.Input
			type={input.format === 'free' ? 'text' : input.format}
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
	const error = invalidEmail ? (
		<Typography role="alert" size="sm" tone="destructive">
			이메일 형식이 아니에요.
		</Typography>
	) : null
	return (
		<Controller.Field label={definition.label} disabled={availability === 'disabled'}>
			{control}
			{error}
		</Controller.Field>
	)
}
