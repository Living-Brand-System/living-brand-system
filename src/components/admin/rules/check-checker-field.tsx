'use client'

import { RelationshipField, useForm, useFormFields } from '@payloadcms/ui'
import type { RelationshipFieldClientComponent } from 'payload'
import { useEffect } from 'react'
import { relationshipId } from '@/features/guideline/utils/block-text'
import type { RuleExecutor } from '@/features/quality-rule/rule-executor'
import { fetchRuleChecker } from '@/features/quality-rule/services/get-rule-checker.client'
import { siblingPath } from '../shared/sibling-path'

const isCheckExecutor = (value: unknown): value is RuleExecutor =>
	value === 'deterministic' || value === 'heuristic' || value === 'manual'

export const CheckCheckerField: RelationshipFieldClientComponent = (props) => {
	const { path } = props
	const { dispatchFields } = useForm()
	const executorPath = siblingPath(path, 'executor')
	const checkerValue = useFormFields(([fields]) => fields[path]?.value)
	const executorValue = useFormFields(([fields]) => fields[executorPath]?.value)
	const populatedExecutor =
		checkerValue && typeof checkerValue === 'object' && 'executor' in checkerValue
			? checkerValue.executor
			: undefined
	const checkerId = relationshipId(checkerValue)

	useEffect(() => {
		if (isCheckExecutor(populatedExecutor)) {
			if (executorValue !== populatedExecutor) {
				dispatchFields({ type: 'UPDATE', path: executorPath, value: populatedExecutor })
			}
			return
		}
		if (checkerId === null) return

		const controller = new AbortController()
		void fetchRuleChecker(checkerId, controller.signal).then((checker) => {
			if (isCheckExecutor(checker?.executor) && executorValue !== checker.executor) {
				dispatchFields({ type: 'UPDATE', path: executorPath, value: checker.executor })
			}
		})
		return () => controller.abort()
	}, [checkerId, dispatchFields, executorPath, executorValue, populatedExecutor])

	return <RelationshipField {...props} />
}
