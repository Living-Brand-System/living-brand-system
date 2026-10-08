'use client'

import {
	FieldDescription,
	FieldError,
	FieldLabel,
	JSONField,
	useField,
	useFormFields,
} from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { contrastOptionsSchema } from '@/features/quality-rule/contrast-options'
import { relationshipId } from '@/features/quality-rule/relationship-id'
import { fetchRuleChecker } from '@/features/quality-rule/services/get-rule-checker.client'
import { siblingPath } from '../shared/sibling-path'

type ResolvedChecker = { id: number; key: string | null }

export const CheckOptionsField: JSONFieldClientComponent = (props) => {
	const { path } = props
	const { disabled, errorMessage, setValue, showError, value } = useField<unknown>({ path })
	const checkerPath = siblingPath(path, 'checker')
	const checkerValue = useFormFields(([fields]) => fields[checkerPath]?.value)
	const populatedCheckerKey =
		checkerValue && typeof checkerValue === 'object' && 'checkerKey' in checkerValue
			? (checkerValue as { checkerKey?: unknown }).checkerKey
			: undefined
	const checkerId = relationshipId(checkerValue)
	const [resolvedChecker, setResolvedChecker] = useState<ResolvedChecker | null>(null)

	useEffect(() => {
		if (typeof populatedCheckerKey === 'string' || checkerId === null) return
		const controller = new AbortController()
		void fetchRuleChecker(checkerId, controller.signal).then((checker) => {
			setResolvedChecker({
				id: checkerId,
				key: typeof checker?.checkerKey === 'string' ? checker.checkerKey : null,
			})
		})
		return () => controller.abort()
	}, [checkerId, populatedCheckerKey])

	const checkerKey =
		typeof populatedCheckerKey === 'string'
			? populatedCheckerKey
			: resolvedChecker?.id === checkerId
				? resolvedChecker.key
				: null
	if (checkerKey !== 'contrast') return <JSONField {...props} />

	const parsed = contrastOptionsSchema.safeParse(value)
	const threshold = parsed.success ? parsed.data.criteria[0].expected : ''

	return (
		<div className="field-type number">
			<FieldLabel htmlFor={path} label="최소 대비율" path={path} required />
			<FieldError message={errorMessage} path={path} showError={showError} />
			<Input
				aria-invalid={showError}
				className="w-full"
				disabled={disabled}
				id={path}
				max={21}
				min={1}
				onChange={(event) => {
					const expected = event.currentTarget.valueAsNumber
					setValue(
						Number.isNaN(expected)
							? null
							: {
									criteria: [
										{ measurement: 'contrastRatio', operator: 'gte', expected },
									],
								},
					)
				}}
				required
				step={0.1}
				type="number"
				value={threshold}
			/>
			<FieldDescription
				description="전경과 배경의 대비율이 이 값 이상이어야 통과합니다. WCAG AA 일반 텍스트 기준은 4.5입니다."
				path={path}
			/>
		</div>
	)
}
