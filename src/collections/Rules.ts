import type { ArrayField, CollectionConfig, FieldHook } from 'payload'
import {
	HEURISTIC_CRITERION_KIND_OPTIONS,
	MEASURE_OPERATOR_OPTIONS,
	PRESENCE_EXPECTED_OPTIONS,
} from '@/features/asset-check/domain/heuristic-criterion'
import { checkKeyFromEnglishTitle } from '@/features/quality-rule/check-key-from-english-title'
import { relationshipId } from '@/features/quality-rule/relationship-id'
import { getRuleCheckerSummary } from '@/features/quality-rule/repositories/rule-checker.payload.repository'
import { RULE_EXECUTOR_OPTIONS, type RuleExecutor } from '@/features/quality-rule/rule-executor'
import { assertRuleDeletable } from '@/features/quality-rule/services/guard-rule-deletion.service'
import { validateRuleOptions } from '@/features/quality-rule/validate-rule-options'
import { managerManagedAccess } from '@/lib/auth'
import { draftVersions } from './shared'

const executorCondition =
	(executor: RuleExecutor) => (_data: unknown, siblingData: { executor?: RuleExecutor }) =>
		siblingData?.executor === executor

const nonHeuristicCondition = (_data: unknown, siblingData: { executor?: RuleExecutor }) =>
	siblingData?.executor !== 'heuristic'

const measureCriterionCondition = (_data: unknown, siblingData: { kind?: string }) =>
	siblingData?.kind === 'measure'

type HeuristicCriterionRow = {
	kind?: string
	expected?: string
	operator?: string
	expectedValue?: number
	max?: number
}

const validateHeuristicCriteria: NonNullable<ArrayField['validate']> = (value, { siblingData }) => {
	const executor = (siblingData as { executor?: RuleExecutor })?.executor
	if (executor !== 'heuristic') return true
	if (!Array.isArray(value) || value.length === 0) {
		return 'Heuristic Rule에는 판정 기준이 1개 이상 필요합니다.'
	}
	for (const row of value as HeuristicCriterionRow[]) {
		if (row?.kind === 'measure') {
			if (!row.operator || typeof row.expectedValue !== 'number') {
				return '수치형 기준에는 연산과 기대값이 필요합니다.'
			}
			if (
				row.operator === 'between' &&
				!(typeof row.max === 'number' && row.max > row.expectedValue)
			) {
				return '범위(between) 기준에는 기대값보다 큰 최대값이 필요합니다.'
			}
		} else if (row?.expected !== 'present' && row?.expected !== 'absent') {
			return '관찰형 기준에는 적합 기준(있어야 함/없어야 함)이 필요합니다.'
		}
	}
	return true
}

const populateRuleKey: FieldHook = ({ siblingData, value }) => {
	if (typeof value === 'string' && value.trim()) return value.trim()
	return checkKeyFromEnglishTitle(siblingData?.title)
}

const populateRuleExecutor: FieldHook = async ({ req, siblingData, value }) => {
	const checkerId = relationshipId(siblingData?.checker)
	if (checkerId === null) return value
	const checker = await getRuleCheckerSummary(req, checkerId)
	return checker.executor
}

export const Rules: CollectionConfig = {
	slug: 'rules',
	dbName: 'rules',
	access: managerManagedAccess,
	hooks: {
		beforeDelete: [({ id, req }) => assertRuleDeletable(req, Number(id))],
	},
	labels: {
		singular: '검수 규칙',
		plural: '검수 규칙',
	},
	admin: {
		group: '검수 설정',
		useAsTitle: 'title',
		defaultColumns: ['title', 'key', 'tier', '_status', 'updatedAt'],
		description: '문서와 블록이 참조해 적용하는 검수 규칙 정의입니다.',
		listSearchableFields: ['title', 'titleKo', 'key'],
	},
	versions: draftVersions,
	fields: [
		{
			name: 'title',
			type: 'text',
			required: true,
			label: 'Title (EN)',
		},
		{
			name: 'titleKo',
			type: 'text',
			label: 'Title (KO)',
		},
		{
			name: 'key',
			type: 'text',
			required: true,
			unique: true,
			index: true,
			hooks: { beforeValidate: [populateRuleKey] },
			admin: {
				readOnly: true,
				description:
					'최초 저장 시 영문 제목을 기준으로 자동 생성되는 안정적인 식별자입니다.',
			},
		},
		{
			name: 'tier',
			type: 'select',
			required: true,
			options: ['required', 'recommended'],
		},
		{
			name: 'executor',
			type: 'select',
			required: true,
			options: [...RULE_EXECUTOR_OPTIONS],
			hooks: { beforeValidate: [populateRuleExecutor] },
			admin: {
				hidden: true,
			},
		},
		{
			name: 'checker',
			type: 'relationship',
			relationTo: 'rule-checkers',
			required: true,
			admin: {
				allowCreate: true,
				allowEdit: true,
				appearance: 'drawer',
				description: '검수 실행 방식과 구현체를 선택합니다.',
				components: {
					Field: '/components/admin/rules/check-checker-field#CheckCheckerField',
				},
			},
		},
		{
			name: 'options',
			type: 'json',
			validate: validateRuleOptions,
			admin: {
				condition: executorCondition('deterministic'),
				description: '이 Rule에서 결정론적 Checker에 전달할 설정입니다.',
				components: {
					Field: '/components/admin/rules/check-options-field#CheckOptionsField',
				},
			},
		},
		{
			name: 'criteria',
			type: 'array',
			minRows: 1,
			validate: validateHeuristicCriteria,
			labels: {
				singular: '판정 기준',
				plural: '판정 기준',
			},
			admin: {
				condition: executorCondition('heuristic'),
				description: 'AI가 관측할 질문과 통과 기준을 행 단위로 입력합니다.',
				initCollapsed: false,
			},
			fields: [
				{
					type: 'row',
					fields: [
						{
							name: 'question',
							type: 'text',
							required: true,
							maxLength: 300,
							label: '판정 질문',
							admin: { width: '55%' },
						},
						{
							name: 'kind',
							enumName: 'enum_heuristic_criterion_kind',
							type: 'select',
							required: true,
							defaultValue: 'presence',
							label: '기준 유형',
							options: [...HEURISTIC_CRITERION_KIND_OPTIONS],
							admin: { width: '20%' },
						},
						{
							name: 'expected',
							enumName: 'enum_heuristic_criterion_expected',
							type: 'select',
							label: '적합 기준',
							options: [...PRESENCE_EXPECTED_OPTIONS],
							admin: {
								width: '25%',
								condition: (_data, siblingData) =>
									(siblingData as { kind?: string })?.kind !== 'measure',
							},
						},
					],
				},
				{
					type: 'row',
					fields: [
						{
							name: 'operator',
							enumName: 'enum_heuristic_criterion_operator',
							type: 'select',
							label: '연산',
							options: [...MEASURE_OPERATOR_OPTIONS],
							admin: { width: '25%', condition: measureCriterionCondition },
						},
						{
							name: 'expectedValue',
							type: 'number',
							label: '기대값',
							admin: { width: '25%', condition: measureCriterionCondition },
						},
						{
							name: 'max',
							type: 'number',
							label: '최대값',
							admin: {
								width: '25%',
								condition: (_data, siblingData) =>
									(siblingData as { kind?: string; operator?: string })?.kind ===
										'measure' &&
									(siblingData as { operator?: string })?.operator === 'between',
							},
						},
						{
							name: 'unit',
							type: 'text',
							maxLength: 20,
							label: '단위',
							admin: { width: '25%', condition: measureCriterionCondition },
						},
					],
				},
			],
		},
		{
			name: 'heuristicPrompt',
			type: 'textarea',
			maxLength: 2000,
			admin: {
				condition: executorCondition('heuristic'),
				description:
					'AI가 이 Rule을 판단할 때 추가로 적용할 기준입니다. 선택 입력, 최대 2,000자.',
			},
		},
		{
			name: 'messages',
			type: 'group',
			admin: {
				condition: nonHeuristicCondition,
				description: '결정론적 또는 수동 검수 결과에 표시할 메시지입니다.',
			},
			fields: [
				{ name: 'pass', type: 'textarea' },
				{ name: 'ok', type: 'textarea' },
				{ name: 'needsReview', type: 'textarea' },
				{ name: 'fail', type: 'textarea' },
			],
		},
	],
}
