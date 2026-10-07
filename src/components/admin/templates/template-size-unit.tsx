'use client'

import { useFormFields } from '@payloadcms/ui'

/**
 * 「판형 크기」 입력칸 안쪽 오른쪽에 붙는 단위 — 판형 종류를 따라 디지털은 px, 인쇄는 mm다.
 * Payload 숫자 칸의 AfterInput 자리에 들어가고, 그 자리를 감싼 `.field-type__wrap`이 position:relative다.
 */
export function TemplateSizeUnit() {
	const outputKind = useFormFields(([fields]) => fields.outputKind?.value)
	return (
		<span
			aria-hidden="true"
			className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground text-sm"
		>
			{outputKind === 'print' ? 'mm' : 'px'}
		</span>
	)
}
